// Integração com Digisac para envio de WhatsApp

async function digisacRequest(path: string, options: { method?: string; body?: object } = {}) {
  const url = process.env.DIGISAC_URL
  const token = process.env.DIGISAC_TOKEN

  if (!url || !token) throw new Error('Digisac não configurado')

  const res = await fetch(`${url}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// Busca contato pelo número de telefone com verificação exata
async function buscarOuCriarContato(numero: string, nomeCliente?: string): Promise<string | null> {
  const serviceId = process.env.DIGISAC_CHANNEL_ID

  // Formata o número (apenas dígitos, com DDI 55)
  const numeroLimpo = '55' + numero.replace(/\D/g, '').replace(/^55/, '')

  // 1. Busca contato existente
  const busca = await digisacRequest(`/contacts?number=${numeroLimpo}&serviceId=${serviceId}`)

  if (busca.ok) {
    const lista = busca.data?.data ?? busca.data?.contacts ?? []
    if (Array.isArray(lista) && lista.length > 0) {
      // VERIFICAÇÃO EXATA: só usa o contato se o número bater
      const contato = lista.find((c: Record<string, string>) => {
        const numContato = (c.number ?? c.phone ?? c.whatsapp ?? '').replace(/\D/g, '')
        return numContato === numeroLimpo || numContato === numeroLimpo.replace(/^55/, '')
      })
      if (contato) {
        return contato.id ?? contato._id ?? null
      }
    }
  }

  // 2. Cria contato apenas se não encontrou correspondência exata
  const criacao = await digisacRequest('/contacts', {
    method: 'POST',
    body: {
      number: numeroLimpo,
      serviceId,
      name: nomeCliente ?? 'Cliente',   // usa o nome real do cliente
    },
  })

  if (criacao.ok) {
    return criacao.data?.id ?? criacao.data?.data?.id ?? null
  }

  return null
}

export async function enviarWhatsApp(params: {
  telefone: string
  mensagem: string
  nomeCliente?: string
}): Promise<{ ok: boolean; erro?: string }> {
  const url = process.env.DIGISAC_URL
  const token = process.env.DIGISAC_TOKEN
  const serviceId = process.env.DIGISAC_CHANNEL_ID

  if (!url || !token || !serviceId) {
    return { ok: false, erro: 'Digisac não configurado (DIGISAC_URL, DIGISAC_TOKEN, DIGISAC_CHANNEL_ID)' }
  }

  try {
    // Passo 1: busca ou cria o contato
    const contactId = await buscarOuCriarContato(params.telefone, params.nomeCliente)

    if (!contactId) {
      return { ok: false, erro: 'Não foi possível encontrar ou criar o contato no Digisac' }
    }

    // Passo 2: envia a mensagem
    const res = await digisacRequest('/messages', {
      method: 'POST',
      body: {
        type: 'chat',
        text: params.mensagem,
        contactId,
        serviceId,
      },
    })

    if (!res.ok) {
      return { ok: false, erro: res.data?.message ?? res.data?.error ?? `Erro ${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

export function gerarMensagemWhatsApp(params: {
  nomeCliente: string
  modeloCertificado: string
  dataVencimento: string
  diasRestantes: number
}): string {
  const { nomeCliente, modeloCertificado, dataVencimento, diasRestantes } = params
  const primeiroNome = nomeCliente.split(' ')[0]

  // ─── Certificado VENCIDO — máxima urgência ──────────────────────────────
  if (diasRestantes < 0) {
    const diasVencido = Math.abs(diasRestantes)
    return (
      `🚨 *ATENÇÃO, ${primeiroNome}!*\n\n` +
      `Seu certificado digital *${modeloCertificado}* *VENCEU há ${diasVencido} dia${diasVencido !== 1 ? 's' : ''}* (${dataVencimento}).\n\n` +
      `⛔ *Com o certificado vencido você não consegue:*\n` +
      `• Emitir Notas Fiscais\n` +
      `• Acessar o e-CAC e portais da Receita Federal\n` +
      `• Assinar contratos e documentos digitalmente\n` +
      `• Acessar sistemas bancários com certificado\n` +
      `• Cumprir obrigações fiscais (SPED, eSocial, DCTF)\n\n` +
      `⚠️ A irregularidade pode gerar *multas e bloqueios* em seus sistemas.\n\n` +
      `A renovação é *rápida — feita por videoconferência* sem sair de casa!\n\n` +
      `📲 *Fale conosco agora:*\n` +
      `👉 wa.me/5511933323003\n\n` +
      `_V&G Certificação Digital_`
    )
  }

  // ─── Pré-vencimento ─────────────────────────────────────────────────────
  const cabecalho = diasRestantes <= 7
    ? `⚠️ *URGENTE, ${primeiroNome}!*\n\nSeu certificado vence em apenas *${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}!*`
    : diasRestantes <= 15
    ? `⏳ *Atenção, ${primeiroNome}!*\n\nSeu certificado vence em *${diasRestantes} dias* (${dataVencimento}).`
    : `📅 *Olá, ${primeiroNome}!*\n\nSeu certificado digital vence em *${diasRestantes} dias* (${dataVencimento}).`

  return (
    `${cabecalho}\n\n` +
    `📋 *Certificado:* ${modeloCertificado}\n\n` +
    `Renove antes que expire e evite interrupções nas suas atividades.\n\n` +
    `✅ Renovação 100% online\n` +
    `✅ Videoconferência — sem sair de casa\n` +
    `✅ Processo rápido e simples\n\n` +
    `📲 *Agende agora:*\n` +
    `👉 wa.me/5511933323003\n\n` +
    `_V&G Certificação Digital_`
  )
}

// Mensagens de nutrição (retenção) — mesmo espírito dos e-mails de nutrição
// em src/lib/email/templates.ts, só que em formato curto para WhatsApp.
export function gerarMensagemNutricaoWhatsApp(params: {
  nomeCliente: string
  trimestre: 1 | 2 | 3
}): string {
  const primeiroNome = params.nomeCliente.split(' ')[0]

  const conteudos: Record<1 | 2 | 3, string> = {
    1:
      `👋 *Olá, ${primeiroNome}!*\n\n` +
      `Já faz 3 meses desde que você adquiriu seu certificado digital. Você sabia que pode usá-lo para:\n\n` +
      `• Assinar PDFs (Adobe Acrobat/DocuSign)\n` +
      `• Declarar o IR no e-CAC sem senha\n` +
      `• Abrir MEI/CNPJ 100% digital\n` +
      `• Participar de licitações públicas\n\n` +
      `Qualquer dúvida, é só chamar! 😊\n\n` +
      `_V&G Certificação Digital_`,
    2:
      `🔐 *${primeiroNome}, dica de segurança!*\n\n` +
      `Seu certificado digital é como uma identidade eletrônica. Pra mantê-lo seguro:\n\n` +
      `• Nunca compartilhe sua senha PIN\n` +
      `• Remova o token/cartão quando não usar\n` +
      `• Mantenha o driver do token atualizado\n\n` +
      `Precisa de suporte? Estamos por aqui!\n\n` +
      `_V&G Certificação Digital_`,
    3:
      `📅 *${primeiroNome}, hora de planejar a renovação!*\n\n` +
      `Seu certificado digital está na reta final de validade. Renovando com a gente você mantém:\n\n` +
      `• Todos os seus dados cadastrais\n` +
      `• Histórico de documentos assinados\n` +
      `• Acesso contínuo a todos os sistemas\n\n` +
      `Agende com antecedência e evite imprevistos! 👉 wa.me/5511933323003\n\n` +
      `_V&G Certificação Digital_`,
  }

  return conteudos[params.trimestre]
}