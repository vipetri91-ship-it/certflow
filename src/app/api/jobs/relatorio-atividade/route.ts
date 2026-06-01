import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

async function enviarTelegram(texto: string) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'Markdown' }),
  })
}

function fmtTempo(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export async function GET() {
  const hoje     = new Date()
  const mesAnterior = subMonths(hoje, 1)
  const inicio   = startOfMonth(mesAnterior)
  const fim      = endOfMonth(mesAnterior)
  const nomeMes  = format(mesAnterior, 'MMMM yyyy', { locale: ptBR })

  const atividades = await prisma.sessaoAtividade.groupBy({
    by: ['usuarioId'],
    _sum: { minutosAtivos: true },
    where: { data: { gte: inicio, lte: fim } },
  })

  const usuarios = await prisma.usuario.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, role: true },
    orderBy: { nome: 'asc' },
  })

  const mapa: Record<string, number> = {}
  for (const a of atividades) mapa[a.usuarioId] = a._sum.minutosAtivos ?? 0

  const diasUteis = 22
  const esperadoMin = diasUteis * 8 * 60 // 22 dias × 8h

  const linhas = usuarios.map(u => {
    const ativos   = mapa[u.id] ?? 0
    const inativos = Math.max(0, esperadoMin - ativos)
    const pct      = Math.round((ativos / esperadoMin) * 100)
    const icone    = pct >= 80 ? '🟢' : pct >= 50 ? '🟡' : '🔴'
    return `${icone} *${u.nome.split(' ')[0]}* — ${fmtTempo(ativos)} ativos (${pct}%) | ${fmtTempo(inativos)} inativos`
  })

  const totalAtivos = usuarios.reduce((s, u) => s + (mapa[u.id] ?? 0), 0)

  const mensagem = `📊 *RELATÓRIO DE ATIVIDADE — ${nomeMes.toUpperCase()}*

${linhas.join('\n')}

---
⏱️ Total ativo da equipe: *${fmtTempo(totalAtivos)}*
📅 Base: ~${diasUteis} dias úteis × 8h = ${fmtTempo(esperadoMin)} esperados por pessoa`

  await enviarTelegram(mensagem)
  return NextResponse.json({ ok: true, mes: nomeMes, usuarios: linhas.length })
}
