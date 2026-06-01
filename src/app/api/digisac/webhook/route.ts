import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp } from '@/lib/digisac'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// Número do dono — único que ativa o bot
const NUMERO_ADMIN = (process.env.BOT_ADMIN_NUMERO ?? '11943156015').replace(/\D/g, '')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Consultas ao banco ────────────────────────────────────────────────────────

async function consultarDados(periodo: 'dia' | 'semana' | 'mes') {
  const hoje = new Date()
  const inicio = periodo === 'dia'    ? startOfDay(hoje)
               : periodo === 'semana' ? startOfWeek(hoje, { weekStartsOn: 0 })
               : startOfMonth(hoje)
  const fim    = periodo === 'dia'    ? endOfDay(hoje)
               : periodo === 'semana' ? endOfWeek(hoje, { weekStartsOn: 0 })
               : endOfMonth(hoje)

  const [vendas, faturamento, emissoes, sst] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { emitidoEm: { gte: inicio, lte: fim } } }),
    prisma.sSTLead.count({ where: { createdAt: { gte: inicio, lte: fim } } }).catch(() => 0),
  ])

  return {
    vendas,
    faturamento: Number(faturamento._sum.valorFinal ?? 0),
    emissoes,
    sst,
  }
}

async function consultarAgenda() {
  const hoje = new Date()
  const inicio = startOfDay(hoje)
  const fim    = endOfDay(hoje)
  const eventos = await prisma.eventoAgenda.findMany({
    where: { inicio: { gte: inicio, lte: fim } },
    orderBy: { inicio: 'asc' },
    take: 10,
  }).catch(() => [])
  return eventos
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

// ── Responder via IA ─────────────────────────────────────────────────────────

async function gerarResposta(pergunta: string): Promise<string> {
  const hoje = new Date()

  // Busca dados do dia sempre (contexto base)
  const [dia, mes, financeiro] = await Promise.all([
    consultarDados('dia'),
    consultarDados('mes'),
    consultarFinanceiro(),
  ])

  const contexto = `
Hoje é ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.

DADOS DO DIA:
- Vendas: ${dia.vendas}
- Faturamento: R$ ${dia.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Emissões: ${dia.emissoes}
- Novos leads SST: ${dia.sst}

DADOS DO MÊS:
- Vendas: ${mes.vendas} / meta 300
- Faturamento: R$ ${mes.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Emissões: ${mes.emissoes}

FINANCEIRO:
- A receber (total pendente): R$ ${financeiro.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Vencidos: R$ ${financeiro.vencidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
`.trim()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `Você é um assistente de gestão da V&G Certificação Digital, respondendo via WhatsApp para o proprietário Vinicius.
Responda de forma direta, concisa e amigável. Use emojis com moderação.
Formate valores em reais. Não use markdown pesado — apenas *negrito* quando necessário.
Se não tiver dados suficientes para responder, diga claramente.

Dados atuais do sistema:
${contexto}`,
    messages: [{ role: 'user', content: pergunta }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text : 'Não consegui processar sua pergunta.'
}

// ── Webhook ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Extrai dados da mensagem (Digisac pode enviar em formatos diferentes)
    const data    = body?.data ?? body
    const fromMe  = data?.fromMe ?? data?.from_me ?? false
    const texto   = (data?.text ?? data?.body ?? data?.message ?? '').trim()
    const numero  = (data?.contact?.number ?? data?.from ?? '').replace(/\D/g, '').replace(/^55/, '')
    const telefone = '55' + numero

    // Ignora mensagens enviadas pelo próprio bot ou sem texto
    if (fromMe || !texto) return NextResponse.json({ ok: true })

    // Só responde para o número do admin
    const numeroLimpo = numero.replace(/^0+/, '')
    const adminLimpo  = NUMERO_ADMIN.replace(/^0+/, '')
    if (!numeroLimpo.endsWith(adminLimpo.slice(-9))) {
      return NextResponse.json({ ok: true }) // ignora silenciosamente
    }

    // Gera resposta com IA
    const resposta = await gerarResposta(texto)

    // Envia de volta pelo Digisac
    await enviarWhatsApp({ telefone, mensagem: resposta, nomeCliente: 'Vinicius' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[digisac/webhook]', err)
    return NextResponse.json({ ok: true }) // sempre 200 para o Digisac não retentar
  }
}

// GET para verificação do webhook pelo Digisac
export async function GET() {
  return NextResponse.json({ ok: true, bot: 'CertFlow Bot ativo' })
}