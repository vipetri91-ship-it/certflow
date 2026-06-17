import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enviarWhatsApp } from '@/lib/digisac'
import { transporte } from '@/lib/email/transporte'
import { enviarTelegram } from '@/lib/telegram'
import { resolve4 } from 'node:dns/promises'
import { connect } from 'node:net'

function testarPortaTcp(host: string, porta: number, timeoutMs = 5000): Promise<{ ok: boolean; erro?: string }> {
  return new Promise((resolve) => {
    const socket = connect({ host, port: porta, timeout: timeoutMs })
    socket.once('connect', () => { socket.destroy(); resolve({ ok: true }) })
    socket.once('timeout', () => { socket.destroy(); resolve({ ok: false, erro: 'timeout' }) })
    socket.once('error', (e) => { socket.destroy(); resolve({ ok: false, erro: e.message }) })
  })
}

// Endpoint de diagnóstico — somente ADMIN (ou x-job-token). Testa os três
// canais usados pelo alerta crítico de emissão (WhatsApp via Digisac,
// e-mail via SMTP, Telegram), de forma independente, para confirmar que a
// rede de segurança funciona de fato em produção sem precisar esperar uma
// falha real.
//
// Em 17/06/2026 descobrimos dois problemas simultâneos: api.digisac.com.br
// está em NXDOMAIN (DNS público confirma — falha do lado do Digisac) e o
// Railway bloqueia as portas SMTP de saída (587/465/2525 todas com timeout,
// mesmo com DNS resolvendo). Por isso o Telegram (HTTPS/443) entrou como
// terceiro canal.
export async function GET(req: NextRequest) {
  const tokenJob = req.headers.get('x-job-token') ?? req.nextUrl.searchParams.get('token')
  const autorizadoPorToken = tokenJob === process.env.AUTH_SECRET

  if (!autorizadoPorToken) {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
  }

  const numero = process.env.BOT_ADMIN_NUMERO ?? '11943156015'
  const mensagem = '🧪 Teste do sistema de alerta — CertFlow. Se você recebeu esta mensagem, o canal está funcionando.'

  const dnsDigisac = await resolve4('api.digisac.com.br').then(
    (ips) => ({ ok: true, ips }),
    (e) => ({ ok: false, erro: (e as Error).message }),
  )

  const dnsBrevo = await resolve4('smtp-relay.brevo.com').then(
    (ips) => ({ ok: true, ips }),
    (e) => ({ ok: false, erro: (e as Error).message }),
  )

  const portaBrevo587 = await testarPortaTcp('smtp-relay.brevo.com', 587)

  // Diagnóstico bruto da busca de contato — para ver a resposta exata da API
  // nova (vegcertificados.digisac.biz) quando a função de alto nível falha.
  let digisacContatoBruto: Record<string, unknown>
  try {
    const numeroLimpo = '55' + numero.replace(/\D/g, '').replace(/^55/, '')
    const url = process.env.DIGISAC_URL
    const res = await fetch(`${url}/contacts?number=${numeroLimpo}&serviceId=${process.env.DIGISAC_CHANNEL_ID}`, {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` },
    })
    const data = await res.json().catch(() => ({}))
    digisacContatoBruto = { status: res.status, ok: res.ok, data }
  } catch (e) {
    digisacContatoBruto = { erro: (e as Error).message }
  }

  const whatsapp = await enviarWhatsApp({ telefone: numero, mensagem })

  const email = await transporte.sendMail({
    from: process.env.SMTP_FROM,
    to: 'vipetri91@gmail.com',
    subject: '🧪 Teste do sistema de alerta — CertFlow',
    text: mensagem,
  }).then(
    () => ({ ok: true }),
    (e) => ({ ok: false, erro: (e as Error).message }),
  )

  const telegram = await enviarTelegram(mensagem)

  return NextResponse.json({ dnsDigisac, dnsBrevo, portaBrevo587, digisacContatoBruto, whatsapp, email, telegram })
}
