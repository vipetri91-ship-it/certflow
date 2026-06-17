import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enviarWhatsApp } from '@/lib/digisac'
import { transporte } from '@/lib/email/transporte'
import { resolve4 } from 'node:dns/promises'

// Endpoint de diagnóstico — somente ADMIN (ou x-job-token). Testa os dois
// canais usados pelo alerta crítico de emissão (WhatsApp via Digisac e
// e-mail via SMTP), de forma independente, para confirmar que a rede de
// segurança funciona de fato em produção sem precisar esperar uma falha real.
//
// Em 17/06/2026 descobrimos que api.digisac.com.br pode entrar em NXDOMAIN
// (confirmado via DNS público, não é problema de rede do Railway) — por
// isso o alerta crítico manda os dois canais sempre, nunca só um.
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

  return NextResponse.json({ dnsDigisac, whatsapp, email })
}
