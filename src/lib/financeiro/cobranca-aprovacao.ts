// Processa a decisão do Vinicius no Telegram (botões inline) sobre uma
// cobrança de vencido: aprovar (dispara pro cliente), rejeitar, ou tentar de
// novo depois de uma falha de envio.
import { prisma } from '../prisma'
import { enviarWhatsApp } from '../digisac'
import { enviarEmail } from '../email/enviar'
import { baixarPdfCobranca } from '../inter'
import { gerarTokenPublico } from '../token-publico'
import { montarMensagemWhatsApp, montarHtmlEmailCobranca } from './mensagem-cobranca'
import { responderCallbackQuery, editarMensagemTelegram, type BotaoInline } from '../telegram'

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

interface CallbackQuery {
  id: string
  data?: string
  from?: { id: number | string }
  message?: { chat?: { id: number | string }; message_id?: number }
}

async function dispararCobranca(cobrancaId: string): Promise<void> {
  const cobranca = await prisma.cobrancaAprovacao.findUnique({
    where: { id: cobrancaId },
    include: { lancamento: { include: { pedido: { include: { cliente: true } } } } },
  })
  if (!cobranca) throw new Error('Cobrança de aprovação não encontrada')

  const cliente = cobranca.lancamento.pedido?.cliente
  if (!cliente) throw new Error('Lançamento sem pedido/cliente vinculado — não sei pra quem enviar')

  const token = gerarTokenPublico(cobranca.lancamentoId)
  const linkPdf = `${process.env.NEXTAUTH_URL}/api/inter/cobranca/pdf-publico?lancamentoId=${cobranca.lancamentoId}&token=${token}`

  const dadosMsg = {
    descricao: cobranca.lancamento.descricao,
    valor: Number(cobranca.lancamento.valor),
    dataVencimento: cobranca.lancamento.dataVencimento,
    pixCopiaECola: cobranca.lancamento.pixCopiaECola,
    nomeCliente: cliente.nome,
    linkPdfBoleto: linkPdf,
    textoIntroducao: cobranca.mensagemRascunho,
  }

  const erros: string[] = []
  let algumSucesso = false

  // WhatsApp
  if (cliente.celular || cliente.telefone) {
    const mensagem = montarMensagemWhatsApp(dadosMsg)
    const resultado = await enviarWhatsApp({
      telefone: cliente.celular ?? cliente.telefone ?? '',
      mensagem,
      nomeCliente: cliente.nome,
    })
    if (resultado.ok) algumSucesso = true
    else erros.push(`WhatsApp: ${resultado.erro}`)
  } else {
    erros.push('WhatsApp: cliente sem telefone cadastrado')
  }

  // E-mail
  if (cliente.email) {
    try {
      if (!cobranca.lancamento.interCodigoSolicitacao) throw new Error('lançamento sem cobrança Inter gerada')
      const pdfBase64 = await baixarPdfCobranca(cobranca.lancamento.interCodigoSolicitacao)
      const html = montarHtmlEmailCobranca(dadosMsg)
      await enviarEmail({
        clienteId: cliente.id,
        tipo: 'COBRANCA_FINANCEIRA',
        destinatario: cliente.email,
        assunto: `Cobrança — ${cobranca.lancamento.descricao}`,
        html,
        attachments: [{ name: `boleto-${cobranca.lancamento.referencia ?? cobranca.lancamentoId}.pdf`, contentBase64: pdfBase64 }],
      })
      algumSucesso = true
    } catch (e) {
      erros.push(`E-mail: ${String(e)}`)
    }
  } else {
    erros.push('E-mail: cliente sem e-mail cadastrado')
  }

  if (!algumSucesso) throw new Error(erros.join(' | '))
  // Sucesso parcial (só 1 dos 2 canais funcionou) não derruba o disparo —
  // só fica registrado no campo `erro` pra visibilidade futura.
  if (erros.length > 0) {
    await prisma.cobrancaAprovacao.update({ where: { id: cobrancaId }, data: { erro: `Parcial: ${erros.join(' | ')}` } })
  }
}

async function aprovarEDispachar(id: string, callbackQueryId: string, chatId?: string, messageId?: number) {
  // Compare-and-swap — aceita a partir de PENDENTE (aprovação normal) ou
  // ERRO_ENVIO (botão "tentar de novo"). Evita duplo-disparo em toque duplo
  // ou reenvio de callback pelo Telegram.
  const atualizados = await prisma.cobrancaAprovacao.updateMany({
    where: { id, status: { in: ['PENDENTE', 'ERRO_ENVIO'] } },
    data: { status: 'APROVADO', respondidoEm: new Date() },
  })
  if (atualizados.count === 0) {
    await responderCallbackQuery(callbackQueryId, 'Essa cobrança já foi processada.')
    return
  }
  await responderCallbackQuery(callbackQueryId, 'Aprovado! Enviando...')

  const cobranca = await prisma.cobrancaAprovacao.findUnique({ where: { id } })
  if (!cobranca) return

  try {
    await dispararCobranca(id)
    await prisma.cobrancaAprovacao.update({ where: { id }, data: { status: 'ENVIADO' } })
    if (chatId && messageId) {
      await editarMensagemTelegram(chatId, messageId, `✅ Aprovado e enviado ao cliente.\n\n${cobranca.mensagemRascunho}`)
    }
  } catch (err) {
    await prisma.cobrancaAprovacao.update({ where: { id }, data: { status: 'ERRO_ENVIO', erro: String(err) } })
    if (chatId && messageId) {
      const botoesRetry: BotaoInline[][] = [[{ text: '🔁 Tentar de novo', callback_data: `cobapr:retry:${id}` }]]
      await editarMensagemTelegram(
        chatId, messageId,
        `⚠️ Aprovado, mas falhei ao enviar: ${String(err)}\n\n${cobranca.mensagemRascunho}`,
        botoesRetry
      )
    }
  }
}

async function rejeitar(id: string, callbackQueryId: string, chatId?: string, messageId?: number) {
  const atualizados = await prisma.cobrancaAprovacao.updateMany({
    where: { id, status: 'PENDENTE' },
    data: { status: 'REJEITADO', respondidoEm: new Date() },
  })
  if (atualizados.count === 0) {
    await responderCallbackQuery(callbackQueryId, 'Essa cobrança já foi processada.')
    return
  }
  await responderCallbackQuery(callbackQueryId, 'Rejeitado — não vou insistir sozinho nesse lançamento.')
  if (chatId && messageId) {
    await editarMensagemTelegram(chatId, messageId, '❌ Rejeitado. Não será enviado nem reforçado automaticamente.')
  }
}

export async function processarCallbackQuery(callbackQuery: CallbackQuery): Promise<void> {
  const remetente = callbackQuery.from?.id
  if (!ADMIN_CHAT_ID || String(remetente) !== String(ADMIN_CHAT_ID)) {
    await responderCallbackQuery(callbackQuery.id, 'Não autorizado.')
    return
  }

  const dados = callbackQuery.data ?? ''
  const [prefixo, acao, id] = dados.split(':')
  if (prefixo !== 'cobapr' || !id) {
    await responderCallbackQuery(callbackQuery.id)
    return
  }

  const chatId = callbackQuery.message?.chat?.id !== undefined ? String(callbackQuery.message.chat.id) : undefined
  const messageId = callbackQuery.message?.message_id

  if (acao === 'aprovar' || acao === 'retry') {
    await aprovarEDispachar(id, callbackQuery.id, chatId, messageId)
  } else if (acao === 'rejeitar') {
    await rejeitar(id, callbackQuery.id, chatId, messageId)
  } else {
    await responderCallbackQuery(callbackQuery.id)
  }
}
