// Registra o webhook do bot do Telegram com o secret_token de verificação de
// origem (achado 17/07/2026, auditoria de segurança). Rodar de novo só é
// necessário se o token do bot mudar ou o TELEGRAM_WEBHOOK_SECRET for
// rotacionado — não faz parte do deploy normal.
//
// Uso: railway run --service certflow -- node scripts/registrar-webhook-telegram.mjs
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const url = 'https://www.vazcertflow.com.br/api/telegram/webhook'

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado')
  if (!secret) throw new Error('TELEGRAM_WEBHOOK_SECRET não configurado')

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, secret_token: secret }),
  })
  const data = await res.json()
  console.log(JSON.stringify(data, null, 2))

  if (!data.ok) {
    console.error('Falha ao registrar webhook.')
    process.exit(1)
  }

  const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json())
  console.log('\nConfirmação (getWebhookInfo):')
  console.log(JSON.stringify(info.result, null, 2))
}
main().catch(e => { console.error('ERRO:', e); process.exit(1) })
