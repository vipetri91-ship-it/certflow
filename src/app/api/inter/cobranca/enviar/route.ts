import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { baixarPdfCobranca } from '@/lib/inter'
import { enviarWhatsApp } from '@/lib/digisac'
import { enviarEmail } from '@/lib/email/enviar'
import { gerarTokenPublico } from '@/lib/token-publico'
import { format } from 'date-fns'

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

  const valorFmt = Number(lancamento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const vencimentoFmt = format(lancamento.dataVencimento, 'dd/MM/yyyy')
  const token = gerarTokenPublico(lancamentoId)
  const linkPdf = `${process.env.NEXTAUTH_URL}/api/inter/cobranca/pdf-publico?lancamentoId=${lancamentoId}&token=${token}`

  try {
    if (canal === 'whatsapp') {
      if (!cliente.celular && !cliente.telefone) {
        return NextResponse.json({ erro: 'Cliente sem telefone cadastrado' }, { status: 422 })
      }
      const primeiroNome = cliente.nome.split(' ')[0]
      const mensagem =
        `📋 *Cobrança — ${lancamento.descricao}*\n\n` +
        `Olá, ${primeiroNome}! Segue sua cobrança:\n\n` +
        `💰 Valor: R$ ${valorFmt}\n` +
        `📅 Vencimento: ${vencimentoFmt}\n\n` +
        (lancamento.pixCopiaECola ? `📲 *Pix Copia e Cola:*\n${lancamento.pixCopiaECola}\n\n` : '') +
        `📄 Boleto em PDF:\n${linkPdf}\n\n` +
        `_V&G Certificação Digital_`

      const resultado = await enviarWhatsApp({
        telefone: cliente.celular ?? cliente.telefone ?? '',
        mensagem,
        nomeCliente: cliente.nome,
      })
      if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 500 })
    } else {
      if (!cliente.email) return NextResponse.json({ erro: 'Cliente sem e-mail cadastrado' }, { status: 422 })

      const pdfBase64 = await baixarPdfCobranca(lancamento.interCodigoSolicitacao)
      const html = `
        <p>Olá, ${cliente.nome.split(' ')[0]}!</p>
        <p>Segue sua cobrança referente a <strong>${lancamento.descricao}</strong>:</p>
        <p>💰 Valor: <strong>R$ ${valorFmt}</strong><br/>📅 Vencimento: <strong>${vencimentoFmt}</strong></p>
        ${lancamento.pixCopiaECola ? `<p>Pix Copia e Cola:<br/><code>${lancamento.pixCopiaECola}</code></p>` : ''}
        <p>O boleto está em anexo (PDF).</p>
        <p>V&G Certificação Digital</p>
      `
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
