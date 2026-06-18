import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Webhook de eventos transacionais do Brevo (entregue, aberto, clicado,
// bounce). Cada e-mail automático enviado via src/lib/email/enviar.ts leva
// uma "tag" igual ao id do EmailLog — o Brevo devolve essa tag no evento,
// permitindo religar a notificação ao registro de origem para alimentar o
// widget de monitoramento do dashboard.
//
// Configuração necessária no painel do Brevo (Transactional → Settings →
// Webhook): URL = https://<dominio>/api/brevo/webhook?token=AUTH_SECRET,
// eventos: delivered, opened, click, hard_bounce, soft_bounce, blocked,
// invalid_email, spam, unsubscribed.

interface EventoBrevo {
  event?: string
  tag?: string
  tags?: string[]
  email?: string
  reason?: string
  date?: string
}

function autorizado(req: NextRequest): boolean {
  const token = req.nextUrl.searchParams.get('token')
  return token === process.env.AUTH_SECRET
}

// A grafia dos eventos varia entre versões da API do Brevo (ex.: "hardBounce"
// vs "hard_bounce"). Normaliza para minúsculo sem separadores antes de
// comparar, para não depender de acertar a grafia exata.
function normalizar(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

const EVENTOS_FALHA_DEFINITIVA = new Set(['hardbounce', 'blocked', 'invalidemail', 'invalid'])
const EVENTOS_FALHA_REGISTRO   = new Set(['hardbounce', 'blocked', 'invalidemail', 'invalid', 'softbounce', 'spam', 'unsubscribed', 'deferred', 'error'])

async function processarEvento(ev: EventoBrevo) {
  const logId = ev.tag ?? ev.tags?.[0]
  if (!logId) return

  const evento = normalizar(ev.event ?? '')
  const agora = new Date()

  const data: Record<string, unknown> = {}

  if (evento === 'delivered') data.entregueEm = agora
  if (evento === 'opened' || evento === 'uniqueopened') data.abertoEm = agora
  if (evento === 'click') data.clicadoEm = agora
  if (EVENTOS_FALHA_REGISTRO.has(evento)) data.motivoFalha = `${ev.event}${ev.reason ? `: ${ev.reason}` : ''}`
  if (EVENTOS_FALHA_DEFINITIVA.has(evento)) data.status = 'ERRO'

  if (Object.keys(data).length === 0) return

  try {
    await prisma.emailLog.update({ where: { id: logId }, data })
  } catch {
    // EmailLog pode não existir (ex.: e-mail manual sem tag) — ignora silenciosamente
  }
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    console.warn('[Brevo Webhook] Token inválido ou ausente na query')
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  console.log('[Brevo Webhook] Payload recebido:', JSON.stringify(payload).slice(0, 500))

  const eventos = Array.isArray(payload) ? payload : [payload]
  await Promise.allSettled(eventos.map(ev => processarEvento(ev as EventoBrevo)))

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: 'Brevo Webhook CertFlow', ativo: true })
}
