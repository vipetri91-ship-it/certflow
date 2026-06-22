import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { criarCobranca } from '@/lib/inter'
import { format, addDays } from 'date-fns'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { lancamentoId } = await req.json()
  if (!lancamentoId) return NextResponse.json({ erro: 'lancamentoId obrigatório' }, { status: 422 })

  const lancamento = await prisma.lancamento.findUnique({
    where: { id: lancamentoId },
    include: {
      pedido: {
        include: { cliente: true },
      },
    },
  })
  if (!lancamento) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
  if (lancamento.status === 'PAGO') return NextResponse.json({ erro: 'Lançamento já pago' }, { status: 422 })

  const cliente = lancamento.pedido?.cliente
  if (!cliente) return NextResponse.json({ erro: 'Cliente não encontrado no pedido' }, { status: 422 })

  const cpfCnpj = (cliente.cpf ?? cliente.cnpj ?? '').replace(/\D/g, '')
  if (!cpfCnpj) return NextResponse.json({ erro: 'Cliente sem CPF/CNPJ cadastrado' }, { status: 422 })

  const vencimento = lancamento.dataVencimento > new Date()
    ? lancamento.dataVencimento
    : addDays(new Date(), 3)

  // DDD + telefone — a API do Inter exige os dois separados. O cadastro do
  // cliente guarda DDD próprio (campo `ddd`) ou número completo em
  // `celular`/`telefone` (com DDD embutido).
  const numeroBruto = (cliente.celular ?? cliente.telefone ?? '').replace(/\D/g, '')
  const ddd = cliente.ddd?.replace(/\D/g, '') || numeroBruto.slice(0, 2)
  const telefone = numeroBruto.length > 2 ? numeroBruto.slice(-9) : numeroBruto

  try {
    const resultado = await criarCobranca({
      pagador: {
        cpfCnpj,
        tipoPessoa:  cliente.tipoPessoa === 'PJ' ? 'JURIDICA' : 'FISICA',
        nome:        cliente.razaoSocial ?? cliente.nome,
        email:       cliente.email ?? undefined,
        cep:         cliente.cep?.replace(/\D/g, '') ?? undefined,
        logradouro:  cliente.logradouro ?? undefined,
        numero:      cliente.numero ?? undefined,
        bairro:      cliente.bairro ?? undefined,
        cidade:      cliente.cidade ?? undefined,
        uf:          cliente.estado ?? undefined,
        ddd:         ddd || undefined,
        telefone:    telefone || undefined,
      },
      valorNominal:   Number(lancamento.valor),
      dataVencimento: format(vencimento, 'yyyy-MM-dd'),
      descricao:      lancamento.descricao,
    })

    await prisma.lancamento.update({
      where: { id: lancamentoId },
      data: {
        boleto:          resultado.linhaDigitavel,
        interCobrancaId: resultado.nossoNumero,
        pixCopiaECola:   resultado.pixCopiaECola ?? null,
        formaPagamento:  lancamento.formaPagamento ?? 'boleto',
      },
    })

    return NextResponse.json(resultado)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao gerar cobrança'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}