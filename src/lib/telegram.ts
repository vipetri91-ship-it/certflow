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

export interface BotaoInline {
  text: string
  callback_data: string
}

// Usado pelo Robô Financeiro (cobrança de vencidos) — manda a mensagem com
// botões de aprovar/rejeitar, e devolve o message_id pra poder editar a
// mensagem depois (remover os botões, mostrar o resultado da decisão).
export async function enviarTelegramComBotoes(
  mensagem: string,
  botoes: BotaoInline[][]
): Promise<{ ok: boolean; messageId?: number; erro?: string }> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token || !chatId) {
    return { ok: false, erro: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurado' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensagem,
        reply_markup: { inline_keyboard: botoes },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, erro: data?.description ?? `Erro ${res.status}` }
    return { ok: true, messageId: data?.result?.message_id }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// Edita uma mensagem já enviada — usado pra remover os botões depois da
// decisão e mostrar o resultado (aprovado/rejeitado/erro no envio).
export async function editarMensagemTelegram(
  chatId: string,
  messageId: string | number,
  novoTexto: string,
  botoes?: BotaoInline[][]
): Promise<{ ok: boolean; erro?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, erro: 'TELEGRAM_BOT_TOKEN não configurado' }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: novoTexto,
        ...(botoes ? { reply_markup: { inline_keyboard: botoes } } : {}),
      }),
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

// Sempre precisa ser chamado depois de um callback_query, mesmo sem texto —
// senão o botão fica com o "carregando" preso no app do Telegram.
export async function responderCallbackQuery(callbackQueryId: string, texto?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, ...(texto ? { text: texto } : {}) }),
    })
  } catch {
    // falha ao responder o callback não é crítica — o Telegram só deixa o
    // spinner do botão um pouco mais lento, nada quebra de verdade.
  }
}
