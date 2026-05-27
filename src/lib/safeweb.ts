// Integração com a API Safeweb PSS — Ambiente Unificado
// Docs homologação: https://h-acsafeweb.safewebpss.com.br/hotsite/documentacao-safewebpss/#/docs/home
// Docs produção:   https://developers.safewebpss.com.br/#/docs/autenticacao/autenticacao

// ── Configuração ─────────────────────────────────────────────────────────────

function cfg() {
  const homolog = process.env.SAFEWEB_HOMOLOGACAO === 'true'

  const identificador = homolog
    ? (process.env.SAFEWEB_IDENTIFICADOR_HOMOLOG ?? process.env.SAFEWEB_IDENTIFICADOR)
    : process.env.SAFEWEB_IDENTIFICADOR

  const segredo = homolog
    ? (process.env.SAFEWEB_SEGREDO_HOMOLOG ?? process.env.SAFEWEB_SEGREDO)
    : process.env.SAFEWEB_SEGREDO

  const baseUrl = homolog
    ? (process.env.SAFEWEB_BASE_URL_HOMOLOG ?? 'https://h-pss.safewebpss.com.br/Service/Microservice')
    : (process.env.SAFEWEB_BASE_URL          ?? 'https://pss.safewebpss.com.br/Service/Microservice')

  const codigoAR = process.env.SAFEWEB_CODIGO_AR ?? ''

  return { identificador, segredo, baseUrl, codigoAR, homolog }
}

// ── Cache de token JWT ────────────────────────────────────────────────────────
// Token expira em 10 minutos — reutiliza com margem de 60s

let _tokenCache: { token: string; expiraMs: number } | null = null

export async function getToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiraMs - 60_000) {
    return _tokenCache.token
  }

  const { identificador, segredo, baseUrl } = cfg()
  if (!identificador || !segredo) {
    throw new Error('Safeweb não configurado — defina SAFEWEB_IDENTIFICADOR e SAFEWEB_SEGREDO')
  }

  const encoded = Buffer.from(`${identificador}:${segredo}`).toString('base64')
  const url = `${baseUrl}/Shared/HubAutenticacao/Autenticacoes/api/autorizacao/token`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.mensagem ?? data.message ?? `Falha na autenticação Safeweb (HTTP ${res.status})`)
  }

  // Aceita tanto "tokenAcesso" quanto "access_token" / "token"
  const token = data.tokenAcesso ?? data.access_token ?? data.token
  if (!token) throw new Error('Safeweb não retornou token válido')

  // Expira em 10 minutos (600s) — armazena em ms absoluto
  const expiresIn = data.expiresIn ?? data.expiraEm ?? 600
  _tokenCache = {
    token,
    expiraMs: typeof expiresIn === 'number' && expiresIn > Date.now() / 1000
      ? expiresIn * 1000          // timestamp Unix em segundos → ms
      : Date.now() + expiresIn * 1000, // duração em segundos → ms absoluto
  }

  return token
}

// ── Helpers de requisição autenticada ────────────────────────────────────────

async function req(
  method: 'GET' | 'POST',
  path: string,
  body?: object,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const { baseUrl } = cfg()
  const token = await getToken()

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SolicitacaoVideoconferencia {
  cpf?:      string   // CPF do titular (PF)
  cnpj?:     string   // CNPJ da empresa (PJ)
  nome:      string   // Nome completo / Razão Social
  email?:    string
  telefone?: string
  produtoId: string   // Código do produto Safeweb (ver listarProdutos)
}

export interface ResultadoProtocolo {
  ok:         boolean
  protocolo?: string
  erro?:      string
  raw?:       Record<string, unknown>
}

// ── 1. Adicionar Solicitação — Videoconferência ───────────────────────────────

export async function adicionarVideoconferencia(
  params: SolicitacaoVideoconferencia,
): Promise<ResultadoProtocolo> {
  const { codigoAR } = cfg()
  const webhookUrl = process.env.SAFEWEB_WEBHOOK_URL
    ?? `${process.env.NEXTAUTH_URL}/api/safeweb/webhook`

  try {
    const { ok, data } = await req('POST', '/api/solicitacao/videoconferencia', {
      cpf:            params.cpf,
      cnpj:           params.cnpj,
      nome:           params.nome,
      email:          params.email,
      telefone:       params.telefone,
      produtoId:      params.produtoId,
      codigoAR,
      urlNotificacao: webhookUrl,
    })

    if (!ok) return { ok: false, erro: String(data.mensagem ?? data.message ?? 'Erro ao criar protocolo'), raw: data }

    const protocolo = String(data.protocolo ?? data.numeroProtocolo ?? data.id ?? '')
    return { ok: true, protocolo, raw: data }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 2. Integração HOPE — Primeira Emissão ────────────────────────────────────
// Passo obrigatório após adicionarVideoconferencia — torna o protocolo visível no HOPE

export async function integracaoHope(protocolo: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { ok, data } = await req('POST', '/api/hope/primeiraemissao', { protocolo })
    if (!ok) return { ok: false, erro: String(data.mensagem ?? data.message ?? 'Erro ao vincular ao HOPE') }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 3. Cancelar Solicitação ───────────────────────────────────────────────────

export async function cancelarSolicitacao(protocolo: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { ok, data } = await req('POST', '/api/solicitacao/cancelar', { protocolo })
    if (!ok) return { ok: false, erro: String(data.mensagem ?? data.message ?? 'Erro ao cancelar') }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 4. Listar Produtos disponíveis para a AR ──────────────────────────────────

export async function listarProdutos(): Promise<{
  ok: boolean
  produtos?: Record<string, unknown>[]
  erro?: string
}> {
  const { codigoAR } = cfg()
  try {
    const { ok, data } = await req('GET', `/api/produtos?codigoAR=${codigoAR}`)
    if (!ok) return { ok: false, erro: String(data.mensagem ?? 'Erro ao listar produtos') }
    const produtos = Array.isArray(data) ? data : (data.produtos as Record<string, unknown>[] ?? [])
    return { ok: true, produtos }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 5. Consultar status de um protocolo ──────────────────────────────────────

export async function consultarProtocolo(protocolo: string): Promise<{
  ok: boolean
  dados?: Record<string, unknown>
  erro?: string
}> {
  try {
    const { ok, data } = await req('GET', `/api/solicitacao/${protocolo}`)
    if (!ok) return { ok: false, erro: String(data.mensagem ?? 'Protocolo não encontrado') }
    return { ok: true, dados: data }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 6. Diagnóstico — valida configuração e autenticação ──────────────────────

export async function diagnosticar(): Promise<{
  configurado: boolean
  homologacao: boolean
  baseUrl: string
  codigoAR: string
  tokenOk: boolean
  erro?: string
}> {
  const { identificador, segredo, baseUrl, codigoAR, homolog } = cfg()
  const configurado = !!(identificador && segredo)

  if (!configurado) {
    return { configurado: false, homologacao: homolog, baseUrl, codigoAR, tokenOk: false, erro: 'Credenciais não configuradas' }
  }

  try {
    await getToken()
    return { configurado: true, homologacao: homolog, baseUrl, codigoAR, tokenOk: true }
  } catch (err) {
    return { configurado: true, homologacao: homolog, baseUrl, codigoAR, tokenOk: false, erro: String(err) }
  }
}