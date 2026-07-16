import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { baixarPdfCobranca } from '@/lib/inter'
import { enviarWhatsApp } from '@/lib/digisac'
import { enviarEmail } from '@/lib/email/enviar'
import { gerarTokenPublico } from '@/lib/token-publico'
import { montarMensagemWhatsApp, montarHtmlEmailCobranca } from '@/lib/financeiro/mensagem-cobranca'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { lancamentoId, canal } = await req.json()
  if (!lancamentoId || (canal !== 'whatsapp' && canal !== 'email')) {
    return NextResponse.json({ erro: 'lancamentoId e canal (whatsapp|email) são obrigatórios' }, { status: 422 })
  }

  const lancamento = await prisma.lancamento.findUnique({
    where: { id: lancamentoId },
    include: { pedido: { include: { cliente: true } } },
  })
  if (!lancamento) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
  if (!lancamento.interCodigoSolicitacao) {
    return NextResponse.json({ erro: 'Este lançamento não tem cobrança Inter gerada' }, { status: 422 })
  }
  const cliente = lancamento.pedido?.cliente
  if (!cliente) return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 422 })

  const token = gerarTokenPublico(lancamentoId)
  const linkPdf = `${process.env.NEXTAUTH_URL}/api/inter/cobranca/pdf-publico?lancamentoId=${lancamentoId}&token=${token}`

  try {
    if (canal === 'whatsapp') {
      if (!cliente.celular && !cliente.telefone) {
        return NextResponse.json({ erro: 'Cliente sem telefone cadastrado' }, { status: 422 })
      }
      const mensagem = montarMensagemWhatsApp({
        descricao: lancamento.descricao,
        valor: Number(lancamento.valor),
        dataVencimento: lancamento.dataVencimento,
        pixCopiaECola: lancamento.pixCopiaECola,
        nomeCliente: cliente.nome,
        linkPdfBoleto: linkPdf,
      })

      const resultado = await enviarWhatsApp({
        telefone: cliente.celular ?? cliente.telefone ?? '',
        mensagem,
        nomeCliente: cliente.nome,
      })
      if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 500 })
    } else {
      if (!cliente.email) return NextResponse.json({ erro: 'Cliente sem e-mail cadastrado' }, { status: 422 })

      const pdfBase64 = await baixarPdfCobranca(lancamento.interCodigoSolicitacao)
      const html = montarHtmlEmailCobranca({
        descricao: lancamento.descricao,
        valor: Number(lancamento.valor),
        dataVencimento: lancamento.dataVencimento,
        pixCopiaECola: lancamento.pixCopiaECola,
        nomeCliente: cliente.nome,
        linkPdfBoleto: linkPdf,
      })
      await enviarEmail({
        clienteId: cliente.id,
        tipo: 'COBRANCA_FINANCEIRA',
        destinatario: cliente.email,
        assunto: `Cobrança — ${lancamento.descricao}`,
        html,
        attachments: [{ name: `boleto-${lancamento.referencia ?? lancamentoId}.pdf`, contentBase64: pdfBase64 }],
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao enviar cobrança'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
