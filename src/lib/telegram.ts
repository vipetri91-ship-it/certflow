// Integração com Telegram — usada como canal de alerta crítico (HTTPS/443,
// não sujeito ao bloqueio de portas SMTP observado no Railway).

export async function enviarTelegram(mensagem: string): Promise<{ ok: boolean; erro?: string }> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token || !chatId) {
    return { ok: false, erro: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurado' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensagem }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, erro: data?.description ?? `Erro ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}
