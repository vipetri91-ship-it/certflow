import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaUpdate = z.object({
  status: z.enum(['GERADO', 'VERIFICADO', 'EMITIDO', 'CANCELADO']).optional(),
  agr: z.string().optional(),
  tipoAtendimento: z.string().optional(),
  numeroCompra: z.string().optional(),
  voucher: z.string().optional(),
  boletoUrl: z.string().optional(),
  boletoCodigo: z.string().optional(),
  boletoVencimento: z.string().optional(),
  observacoes: z.string().optional(),
  formaPagamento: z.string().optional(),
  popupNotificacaoVisto: z.boolean().optional(),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: { select: { id: true, nome: true } },
      usuario: { select: { nome: true } },
      itens: { include: { modelo: true } },
      lancamentos: true,
      certificados: { include: { modelo: { select: { nome: true } } } },
    },
  })

  if (!pedido) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const antigo = await prisma.pedido.findUnique({ where: { id } })
  if (!antigo) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const { boletoVencimento, status, ...rest } = parsed.data

  const data: Record<string, unknown> = { ...rest }
  if (boletoVencimento) data.boletoVencimento = new Date(boletoVencimento)
  if (status) {
    data.status = status
    if (status === 'VERIFICADO') data.verificadoEm = new Date()
    if (status === 'EMITIDO') data.emitidoEm = new Date()
  }

  const pedido = await prisma.pedido.update({ where: { id }, data })

  // Ao marcar como EMITIDO, cria o certificado automaticamente no cliente
  if (status === 'EMITIDO' && antigo.status !== 'EMITIDO') {
    try {
      const certExistente = await prisma.certificado.findFirst({ where: { pedidoId: id } })
      if (!certExistente) {
        const pedidoCompleto = await prisma.pedido.findUnique({
          where: { id },
          include: { itens: { include: { modelo: true } } },
        })
        const item = pedidoCompleto?.itens[0]
        if (item) {
          const dataEmissao    = new Date()
          const dataVencimento = new Date()
          dataVencimento.setMonth(dataVencimento.getMonth() + item.modelo.validadeMeses)

          await prisma.certificado.create({
            data: {
              clienteId:     pedidoCompleto!.clienteId,
              modeloId:      item.modeloId,
              pedidoId:      id,
              dataEmissao,
              dataVencimento,
              status:        'ATIVO',
              numeroSerie:   antigo.numeroCompra ?? undefined,
            },
          })
        }
      }
    } catch { /* não bloqueia a atualização do pedido */ }
  }

  // Monta diff dos campos alterados
  const camposAlterados: Record<string, unknown> = { numero: antigo.numero }
  const mapCampo: Record<string, string> = {
    status: 'Status', valorFinal: 'Valor Final', valorTotal: 'Valor Total',
    desconto: 'Desconto', agr: 'AGR', formaPagamento: 'Forma de Pagamento',
    tipoAtendimento: 'Tipo de Atendimento', voucher: 'Voucher',
    contabilidade: 'Contabilidade', observacoes: 'Observações',
    numeroCompra: 'Nº Compra', unidadeAtendimento: 'Unidade',
  }
  for (const [k, label] of Object.entries(mapCampo)) {
    const anterior = (antigo as Record<string, unknown>)[k]
    const novo = (pedido as Record<string, unknown>)[k]
    if (anterior !== novo) {
      camposAlterados[`${label} (antes)`] = anterior ?? '—'
      camposAlterados[`${label} (depois)`] = novo ?? '—'
    }
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Pedido',
    entidadeId: id,
    dados: camposAlterados,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(pedido)
}
