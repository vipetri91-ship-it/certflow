// Envio de e-mail via API HTTP do Brevo (porta 443) em vez de SMTP (portas
// 587/465/2525), que o Railway bloqueia para saída. Mantém a mesma
// assinatura de `transporte.sendMail(...)` do nodemailer para não exigir
// alteração nos pontos de chamada existentes (jobs, notificações, webhooks).

interface OpcoesEnvio {
  from?: string
  to: string
  subject: string
  html?: string
  text?: string
  // Etiqueta devolvida pelo Brevo nos eventos de webhook (entregue, aberto,
  // clicado, bounce) — usada para religar o evento ao EmailLog de origem.
  tag?: string
  attachments?: { name: string; contentBase64: string }[]
}

export const transporte = {
  async sendMail(opcoes: OpcoesEnvio) {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) throw new Error('BREVO_API_KEY não configurado')

    const remetente = opcoes.from ?? process.env.SMTP_FROM
    if (!remetente) throw new Error('SMTP_FROM não configurado')

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: remetente },
        to: [{ email: opcoes.to }],
        subject: opcoes.subject,
        ...(opcoes.html ? { htmlContent: opcoes.html } : {}),
        ...(opcoes.text ? { textContent: opcoes.text } : {}),
        ...(opcoes.tag ? { tags: [opcoes.tag] } : {}),
        ...(opcoes.attachments?.length
          ? { attachment: opcoes.attachments.map(a => ({ name: a.name, content: a.contentBase64 })) }
          : {}),
      }),
    })

    if (!res.ok) {
      const dados = await res.json().catch(() => ({}))
      throw new Error(dados?.message ?? `Erro ${res.status} ao enviar e-mail via Brevo`)
    }

    return res.json().catch(() => ({}))
  },
}