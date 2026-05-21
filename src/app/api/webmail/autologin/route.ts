import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const WEBMAIL_URL = 'https://webmail-seguro.com.br/vegcertificado.com.br/'
const WEBMAIL_USER = 'piracaia@vegcertificado.com.br'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const senha = process.env.WEBMAIL_PASSWORD
  if (!senha) {
    return new NextResponse('WEBMAIL_PASSWORD não configurado', { status: 500 })
  }

  // Página HTML que auto-submete o formulário de login do Roundcube
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{margin:0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;font-size:14px}</style></head>
<body>
  <p>Acessando e-mail...</p>
  <form id="f" method="POST" action="${WEBMAIL_URL}" style="display:none">
    <input type="hidden" name="_user"   value="${WEBMAIL_USER}">
    <input type="hidden" name="_pass"   value="${senha}">
    <input type="hidden" name="_action" value="login">
    <input type="hidden" name="_task"   value="login">
  </form>
  <script>document.getElementById('f').submit()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}