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

  const codigoAR          = process.env.SAFEWEB_CODIGO_AR            ?? ''
  const cnpjAR            = process.env.SAFEWEB_CNPJ_AR              ?? ''
  const attendancePlaceId = Number(process.env.SAFEWEB_ATTENDANCE_PLACE_ID ?? 0)

  return { identificador, segredo, baseUrl, codigoAR, cnpjAR, attendancePlaceId, homolog }
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
    signal: AbortSignal.timeout(10000),
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
): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; raw: string }> {
  const { baseUrl } = cfg()
  const token = await getToken()

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12000),
  })

  const raw = await res.text()
  let data: Record<string, unknown> = {}
  try { data = JSON.parse(raw) } catch { data = { _raw: raw } }
  return { ok: res.ok, status: res.status, data, raw }
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
    const { ok, data } = await req('POST', '/Shared/Partner/api/Add/3', {
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
  const { attendancePlaceId } = cfg()
  try {
    const { ok, data } = await req('POST', '/Hope/Shared/api/integration/solicitation', {
      protocol:            Number(protocolo),
      attendancePlaceId,
      aciRemocalCandidate: false,
    })
    if (!ok) return { ok: false, erro: String(data.mensagem ?? data.message ?? 'Erro ao vincular ao HOPE') }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 3. Cancelar Solicitação ───────────────────────────────────────────────────

export async function cancelarSolicitacao(
  protocolo: string,
  idJustificativa = 4,
): Promise<{ ok: boolean; erro?: string }> {
  const { cnpjAR } = cfg()
  try {
    const { ok, data } = await req('POST', '/Shared/Partner/api/CancelarSolicitacao', {
      Protocolo:      Number(protocolo),
      CnpjAR:         cnpjAR,
      idJustificativa,
    })
    if (!ok) return { ok: false, erro: String(data.mensagem ?? data.message ?? 'Erro ao cancelar') }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 4. Listar Produtos disponíveis para a AR ──────────────────────────────────

export async function listarProdutos(idTipoEmissao = 3): Promise<{
  ok: boolean
  produtos?: Record<string, unknown>[]
  erro?: string
}> {
  const { cnpjAR } = cfg()
  try {
    const { ok, status, data, raw } = await req('GET', `/Shared/Product/api/GetListProdutoByAR/${idTipoEmissao}/${cnpjAR}`)
    if (!ok) return { ok: false, erro: `HTTP ${status}: ${data.mensagem ?? data.message ?? raw}` }
    const produtos = Array.isArray(data) ? data : (data.produtos as Record<string, unknown>[] ?? [])
    return { ok: true, produtos }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 4b. Buscar produto Safeweb por tipo de pessoa, modelo e validade ─────────
// Mapeia automaticamente o modelo do CertFlow → idProduto da Safeweb

export interface FiltrosProduto {
  tipoPessoa: 'PF' | 'PJ'           // PF → e-CPF, PJ → e-CNPJ
  tipoCertificado: 'A1' | 'A3'      // A1 ou A3
  validadeMeses: number              // 12 → 1 Ano, 24 → 2 Anos
  idTipoEmissao?: number             // 3 = videoconferência (padrão)
}

export async function buscarProduto(filtros: FiltrosProduto): Promise<{
  ok: boolean; idProduto?: number; nome?: string; erro?: string
}> {
  const tipo = filtros.idTipoEmissao ?? 3
  const { ok, produtos, erro } = await listarProdutos(tipo)
  if (!ok || !produtos?.length) return { ok: false, erro: erro ?? 'Sem produtos disponíveis' }

  const tipoProduto = filtros.tipoPessoa === 'PF' ? 'e-CPF' : 'e-CNPJ'
  const modelo      = filtros.tipoCertificado      // 'A1' ou 'A3'
  const validade    = filtros.validadeMeses <= 12 ? '1 Ano' : '2 Anos'

  const produto = produtos.find((p: Record<string, unknown>) =>
    String(p.ProdutoTipo).includes(tipoProduto) &&
    String(p.ProdutoModelo) === modelo &&
    String(p.ProdutoValidade).includes(validade.split(' ')[0])
  ) as Record<string, unknown> | undefined

  if (!produto) {
    // Fallback: só bate tipo pessoa + modelo
    const fallback = produtos.find((p: Record<string, unknown>) =>
      String(p.ProdutoTipo).includes(tipoProduto) &&
      String(p.ProdutoModelo) === modelo
    ) as Record<string, unknown> | undefined

    if (!fallback) return { ok: false, erro: `Produto não encontrado: ${tipoProduto} ${modelo} ${validade}` }
    return { ok: true, idProduto: Number(fallback.idProduto), nome: String(fallback.Nome) }
  }

  return { ok: true, idProduto: Number(produto.idProduto), nome: String(produto.Nome) }
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