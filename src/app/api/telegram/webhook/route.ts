import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
// Chat ID autorizado — só o dono do bot responde
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Enviar mensagem ───────────────────────────────────────────────────────────

async function enviar(chatId: number, texto: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'Markdown' }),
  })
}

// ── Dados do banco ────────────────────────────────────────────────────────────

async function consultarPeriodo(periodo: 'dia' | 'semana' | 'mes') {
  const hoje = new Date()
  const inicio = periodo === 'dia'    ? startOfDay(hoje)
               : periodo === 'semana' ? startOfWeek(hoje, { weekStartsOn: 0 })
               : startOfMonth(hoje)
  const fim    = periodo === 'dia'    ? endOfDay(hoje)
               : periodo === 'semana' ? endOfWeek(hoje, { weekStartsOn: 0 })
               : endOfMonth(hoje)

  const [vendas, fat, emissoes] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { emitidoEm: { gte: inicio, lte: fim } } }),
  ])

  return { vendas, faturamento: Number(fat._sum.valorFinal ?? 0), emissoes }
}

async function consultarFinanceiro() {
  const [aReceber, vencidos] = await Promise.all([
    prisma.lancamento.aggregate({ _sum: { valor: true }, where: { tipo: 'RECEBER', status: 'PENDENTE' } }),
    prisma.lancamento.aggregate({ _sum: { valor: true }, where: { tipo: 'RECEBER', status: 'PENDENTE', dataVencimento: { lt: new Date() } } }),
  ])
  return {
    aReceber: Number(aReceber._sum.valor ?? 0),
    vencidos:  Number(vencidos._sum.valor ?? 0),
  }
}

// ── IA ────────────────────────────────────────────────────────────────────────

async function gerarResposta(pergunta: string): Promise<string> {
  const hoje = new Date()
  const [dia, semana, mes, fin] = await Promise.all([
    consultarPeriodo('dia'),
    consultarPeriodo('semana'),
    consultarPeriodo('mes'),
    consultarFinanceiro(),
  ])

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const contexto = `
Hoje: ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

📅 HOJE: ${dia.vendas} vendas | ${fmt(dia.faturamento)} | ${dia.emissoes} emissões
📆 SEMANA: ${semana.vendas} vendas | ${fmt(semana.faturamento)} | ${semana.emissoes} emissões
🗓️ MÊS: ${mes.vendas}/300 vendas | ${fmt(mes.faturamento)} | ${mes.emissoes} emissões
💰 FINANCEIRO: ${fmt(fin.aReceber)} a receber | ${fmt(fin.vencidos)} vencidos
`.trim()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: `Você é o assistente de gestão da V&G Certificação Digital, respondendo via Telegram para o proprietário Vinicius.
Seja direto, conciso e use emojis com moderação. Use *negrito* para destacar números importantes.
Dados atuais:\n${contexto}`,
    messages: [{ role: 'user', content: pergunta }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text : 'Não consegui processar.'
}

// ── Webhook ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat?.id
    const texto  = message.text?.trim() ?? ''

    if (!chatId || !texto) return NextResponse.json({ ok: true })

    // Primeiro acesso — envia o chat ID para configuração
    if (!ADMIN_CHAT_ID) {
      await enviar(chatId, `🤖 Bot ativo! Seu Chat ID é: \`${chatId}\`\n\nAdicione como variável TELEGRAM_ADMIN_CHAT_ID no Vercel.`)
      return NextResponse.json({ ok: true })
    }

    // Só responde para o admin
    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
      await enviar(chatId, '⛔ Acesso não autorizado.')
      return NextResponse.json({ ok: true })
    }

    // Gera e envia resposta
    await enviar(chatId, '⏳ Consultando...')
    const resposta = await gerarResposta(texto)
    await enviar(chatId, resposta)

  } catch (err) {
    console.error('[telegram/webhook]', err)
  }

  return NextResponse.json({ ok: true })
}