// Robô diário de cobrança de vencidos — 16/07/2026, a pedido do Vinicius.
// Identifica Lancamento (tipo RECEBER) vencidos e manda pra aprovação no
// Telegram (botões inline) usando sempre a mesma mensagem padrão fixa —
// nunca gerada por IA, nunca variada (pedido explícito do Vinicius, pra
// manter previsibilidade). Nunca dispara nada ao cliente sem aprovação humana.
import { differenceInCalendarDays, format } from 'date-fns'
import { prisma } from '../prisma'
import { montarMensagemPadraoCobranca } from './mensagem-cobranca'
import { reservarOrcamentoDiario, cobrancaRoboAtivo } from './cobranca-orcamento'
import { enviarTelegramComBotoes, enviarTelegram, type BotaoInline } from '../telegram'

// Calendário corrido (não dias úteis) — simplicidade deliberada; ajustar se
// o Vinicius quiser considerar fins de semana separadamente.
const DIAS_ANTES_DE_REFORCAR = 3
const DIAS_ANTES_DE_ACOMPANHAMENTO = 5

export interface ResultadoCobrancaVencidos {
  vencidosEncontrados: number
  rascunhosNovos: number
  lembretesReenviados: number
  aguardandoResposta: number
}

function montarTextoAprovacao(nomeCliente: string, valor: number, diasAtraso: number, dataVencimento: Date, rascunho: string): string {
  const valorFmt = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const vencimentoFmt = format(dataVencimento, 'dd/MM/yyyy')
  return (
    `🧾 *Cobrança vencida — ${nomeCliente}*\n` +
    `💰 R$ ${valorFmt} — venceu há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''} (${vencimentoFmt})\n\n` +
    `Rascunho da mensagem:\n—————————————\n${rascunho}\n—————————————\n\n` +
    `Aprovando, esse texto (+ boleto/Pix) vai direto pro WhatsApp e e-mail do cliente agora.`
  )
}

async function reforcarPendente(
  lancamentoDescricao: string,
  nomeCliente: string,
  valor: number,
  dataVencimento: Date,
  cobranca: { id: string; diasAtraso: number; mensagemRascunho: string; status: string }
): Promise<boolean> {
  const botoes: BotaoInline[][] = cobranca.status === 'ERRO_ENVIO'
    ? [[{ text: '🔁 Tentar de novo', callback_data: `cobapr:retry:${cobranca.id}` }]]
    : [[
        { text: '✅ Aprovar e enviar', callback_data: `cobapr:aprovar:${cobranca.id}` },
        { text: '❌ Rejeitar', callback_data: `cobapr:rejeitar:${cobranca.id}` },
      ]]

  const prefixo = cobranca.status === 'ERRO_ENVIO'
    ? '🔔 Lembrete: essa cobrança falhou ao enviar e ainda não foi resolvida.\n\n'
    : '🔔 Lembrete: ainda aguardando sua decisão sobre esta cobrança.\n\n'

  const texto = prefixo + montarTextoAprovacao(nomeCliente, valor, cobranca.diasAtraso, dataVencimento, cobranca.mensagemRascunho)
  const envio = await enviarTelegramComBotoes(texto, botoes)
  if (envio.ok && envio.messageId) {
    await prisma.cobrancaAprovacao.update({
      where: { id: cobranca.id },
      data: { telegramMessageId: String(envio.messageId) },
    })
  }
  return envio.ok
}

export async function executarCobrancaVencidos(): Promise<ResultadoCobrancaVencidos> {
  const resultado: ResultadoCobrancaVencidos = { vencidosEncontrados: 0, rascunhosNovos: 0, lembretesReenviados: 0, aguardandoResposta: 0 }

  if (!(await cobrancaRoboAtivo())) return resultado

  const hoje = new Date()
  // Início do dia de hoje (00h00) — o vencimento só conta como "vencido de
  // verdade" a partir do dia seguinte ao vencimento (pedido explícito do
  // Vinicius: um boleto que vence hoje não deve gerar aviso hoje, só a
  // partir de amanhã). Comparar com `hoje` puro (hora atual) dispararia o
  // aviso no próprio dia do vencimento, cedo demais.
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  // 1. Transição PENDENTE → VENCIDO — nunca era persistida antes, só
  // computada ao vivo nas telas. Corrige de graça um filtro morto que já
  // existia na UI (?status=VENCIDO).
  await prisma.lancamento.updateMany({
    where: { tipo: 'RECEBER', status: 'PENDENTE', dataVencimento: { lt: inicioHoje } },
    data: { status: 'VENCIDO' },
  })

  const vencidos = await prisma.lancamento.findMany({
    where: { tipo: 'RECEBER', status: 'VENCIDO' },
    include: {
      pedido: { include: { cliente: true } },
      cobrancasAprovacao: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  resultado.vencidosEncontrados = vencidos.length

  for (const lancamento of vencidos) {
    const cliente = lancamento.pedido?.cliente
    if (!cliente) continue // sem pedido/cliente vinculado, não dá pra cobrar
    if (!cliente.celular && !cliente.telefone && !cliente.email) continue // sem nenhum contato

    const ultima = lancamento.cobrancasAprovacao[0]
    const diasAtraso = differenceInCalendarDays(hoje, lancamento.dataVencimento)

    if (!ultima) {
      // Gera cobrança nova (texto sempre padrão, nunca variado)
      if (!(await reservarOrcamentoDiario())) continue // estourou o limite diário

      const rascunho = montarMensagemPadraoCobranca(cliente.nome, Number(lancamento.valor))

      const nova = await prisma.cobrancaAprovacao.create({
        data: { lancamentoId: lancamento.id, mensagemRascunho: rascunho, diasAtraso, valorSnapshot: lancamento.valor },
      })

      const texto = montarTextoAprovacao(cliente.nome, Number(lancamento.valor), diasAtraso, lancamento.dataVencimento, rascunho)
      const botoes: BotaoInline[][] = [[
        { text: '✅ Aprovar e enviar', callback_data: `cobapr:aprovar:${nova.id}` },
        { text: '❌ Rejeitar', callback_data: `cobapr:rejeitar:${nova.id}` },
      ]]
      const envio = await enviarTelegramComBotoes(texto, botoes)
      if (envio.ok && envio.messageId) {
        await prisma.cobrancaAprovacao.update({
          where: { id: nova.id },
          data: { telegramChatId: process.env.TELEGRAM_ADMIN_CHAT_ID, telegramMessageId: String(envio.messageId) },
        })
      }
      resultado.rascunhosNovos++
      continue
    }

    if (ultima.status === 'PENDENTE' || ultima.status === 'ERRO_ENVIO') {
      const diasParado = differenceInCalendarDays(hoje, ultima.updatedAt)
      if (diasParado < DIAS_ANTES_DE_REFORCAR) {
        resultado.aguardandoResposta++
        continue
      }
      const enviado = await reforcarPendente(
        lancamento.descricao, cliente.nome, Number(lancamento.valor), lancamento.dataVencimento, ultima
      )
      if (enviado) resultado.lembretesReenviados++
      continue
    }

    if (ultima.status === 'REJEITADO') continue // nunca gera de novo sozinho
    if (ultima.status === 'APROVADO') continue // estado transitório — não deve durar, não insiste

    if (ultima.status === 'ENVIADO') {
      const diasDesdeEnvio = ultima.respondidoEm ? differenceInCalendarDays(hoje, ultima.respondidoEm) : DIAS_ANTES_DE_ACOMPANHAMENTO
      if (diasDesdeEnvio < DIAS_ANTES_DE_ACOMPANHAMENTO) continue // ainda dentro do prazo de cortesia

      // Continua vencido mesmo depois de enviado — a baixa automática não
      // veio. Gera uma nova cobrança de acompanhamento (mesmo texto padrão).
      if (!(await reservarOrcamentoDiario())) continue

      const rascunho = montarMensagemPadraoCobranca(cliente.nome, Number(lancamento.valor))

      const nova = await prisma.cobrancaAprovacao.create({
        data: { lancamentoId: lancamento.id, mensagemRascunho: rascunho, diasAtraso, valorSnapshot: lancamento.valor },
      })

      const texto = montarTextoAprovacao(cliente.nome, Number(lancamento.valor), diasAtraso, lancamento.dataVencimento, rascunho)
      const botoes: BotaoInline[][] = [[
        { text: '✅ Aprovar e enviar', callback_data: `cobapr:aprovar:${nova.id}` },
        { text: '❌ Rejeitar', callback_data: `cobapr:rejeitar:${nova.id}` },
      ]]
      const envio = await enviarTelegramComBotoes(texto, botoes)
      if (envio.ok && envio.messageId) {
        await prisma.cobrancaAprovacao.update({
          where: { id: nova.id },
          data: { telegramChatId: process.env.TELEGRAM_ADMIN_CHAT_ID, telegramMessageId: String(envio.messageId) },
        })
      }
      resultado.rascunhosNovos++
    }
  }

  if (resultado.vencidosEncontrados > 0) {
    await enviarTelegram(
      `📋 Robô de cobrança: ${resultado.vencidosEncontrados} vencido(s) identificado(s), ` +
      `${resultado.rascunhosNovos} rascunho(s) novo(s) pra aprovação, ` +
      `${resultado.lembretesReenviados} lembrete(s) reforçado(s), ` +
      `${resultado.aguardandoResposta} aguardando resposta antiga.`
    )
  }

  return resultado
}
