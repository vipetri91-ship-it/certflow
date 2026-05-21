import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ImapFlow } from 'imapflow'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const senha = process.env.WEBMAIL_PASSWORD
  if (!senha) return NextResponse.json({ naoLidos: 0 })

  const client = new ImapFlow({
    host:   'mail.vegcertificado.com.br',
    port:   993,
    secure: true,
    auth: {
      user: 'piracaia@vegcertificado.com.br',
      pass: senha,
    },
    logger: false,
    tls: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    const status = await client.status('INBOX', { unseen: true, messages: true })
    await client.logout()
    return NextResponse.json({
      naoLidos: status.unseen  ?? 0,
      total:    status.messages ?? 0,
    })
  } catch (err) {
    try { await client.logout() } catch {}
    console.error('[IMAP]', err)
    return NextResponse.json({ naoLidos: 0, total: 0, erro: 'Falha na conexão IMAP' })
  }
}