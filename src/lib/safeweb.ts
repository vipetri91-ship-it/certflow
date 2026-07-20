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

// ── Lookup de códigos IBGE (Município/UF) ────────────────────────────────────
// Exigido pela Safeweb em ClienteNotaFiscal.CidadeCodigo / UFCodigo.
// Usa a API pública do IBGE e mantém cache em memória (códigos não mudam).

const _ibgeCache = new Map<string, { codigoMunicipio: string; codigoUF: string } | null>()

function normalizarTexto(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

async function buscarCodigosIbge(cidade: string, uf: string): Promise<{ codigoMunicipio: string; codigoUF: string } | null> {
  const chave = `${uf.toUpperCase()}|${normalizarTexto(cidade)}`
  if (_ibgeCache.has(chave)) return _ibgeCache.get(chave)!

  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.toUpperCase()}/municipios`, {
      signal: AbortSignal.timeout(8000),
    })
    const lista = await res.json() as Array<{
      id: number
      nome: string
      microrregiao?: { mesorregiao?: { UF?: { id: number } } }
    }>
    const municipio = lista.find(m => normalizarTexto(m.nome) === normalizarTexto(cidade))
    const resultado = municipio
      ? { codigoMunicipio: String(municipio.id), codigoUF: String(municipio.microrregiao?.mesorregiao?.UF?.id ?? '') }
      : null
    _ibgeCache.set(chave, resultado)
    return resultado
  } catch {
    _ibgeCache.set(chave, null)
    return null
  }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface EnderecoSafeweb {
  cep:          string
  logradouro:   string
  numero:       string
  complemento?: string
  bairro:       string
  cidade:       string
  estado:       string   // sigla da UF
}

export interface ResponsavelSafeweb {
  nome:            string
  cpf:             string
  dataNascimento?: string   // YYYY-MM-DD
  email?:          string
  ddd?:            string
  telefone?:       string
  endereco?:       EnderecoSafeweb
}

export interface SolicitacaoVideoconferencia {
  cpf?:            string   // CPF do titular (PF)
  cnpj?:           string   // CNPJ da empresa (PJ)
  nome:            string   // Nome completo (PF) — usado como Sacado/RazaoSocial se não houver outro
  razaoSocial?:    string   // Razão social (PJ)
  nomeFantasia?:   string   // Nome fantasia (PJ)
  email?:          string
  ddd?:            string
  telefone?:       string
  dataNascimento?: string   // YYYY-MM-DD (obrigatório para PF)
  endereco?:       EnderecoSafeweb
  responsavel?:    ResponsavelSafeweb   // Titular/responsável — obrigatório para PJ
  produtoId:       string   // Código do produto Safeweb (ver listarProdutos)
}

export interface ResultadoProtocolo {
  ok:         boolean
  protocolo?: string
  erro?:      string
  raw?:       Record<string, unknown>
}

// ── 0. Consulta Prévia — checagem de elegibilidade na RFB (CPF/CNPJ) ─────────
// Mesmo checkpoint que a Safeweb usa antes de permitir a emissão: detecta
// CPF/CNPJ CANCELADO, INAPTO, SUSPENSO, divergência de data de nascimento etc.

export async function realizarConsultaPrevia(params: {
  documento:        string  // CPF ou CNPJ, somente números
  documentoTipo:    '1' | '2'
  dtNascimento:     string  // formato YYYY-MM-DD
  cpfResponsavel?:  string  // obrigatório quando documentoTipo === '2' (CNPJ)
}): Promise<{ ok: boolean; codigo?: number; mensagem?: string; nome?: string; erro?: string; _rawData?: Record<string, unknown> }> {
  try {
    const payload: Record<string, unknown> = params.documentoTipo === '1'
      ? {
          CPF:           params.documento,
          DocumentoTipo: '1',
          DtNascimento:  params.dtNascimento,
        }
      : {
          CNPJ:          params.documento,
          CPF:           params.cpfResponsavel ?? '',
          DocumentoTipo: '2',
          DtNascimento:  params.dtNascimento,
        }

    const { ok, data } = await req('POST', '/Shared/ConsultaPrevia/api/RealizarConsultaPrevia', payload)
    if (!ok) return { ok: false, erro: String(data.Mensagem ?? data.mensagem ?? data.message ?? 'Erro ao realizar consulta prévia') }

    const codigo   = Number(data.Codigo ?? data.codigo ?? -1)
    const mensagem = String(data.Mensagem ?? data.mensagem ?? '')
    // Quando codigo === 0 (liberado), Safeweb retorna o nome completo no campo Mensagem
    const nome     = codigo === 0 ? mensagem : ''
    return { ok: true, codigo, mensagem, nome }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 1. Adicionar Solicitação — Videoconferência (Add/3) ou Presencial (Add/1) ─

// Converte data de YYYY-MM-DD para DD/MM/YYYY (formato exigido pela Safeweb no Add/1 e Add/3)
// O DataValid usa a data de nascimento para validar o CPF automaticamente — formato errado
// faz o DataValid falhar silenciosamente e o protocolo cai em conferência ACI.
function toDataBR(data?: string): string {
  if (!data) return ''
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return data  // já está em DD/MM/YYYY
  const m = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : data
}

// Monta o objeto Endereco no formato exigido pela Safeweb (com códigos IBGE)
async function montarEndereco(end?: EnderecoSafeweb) {
  if (!end) return undefined
  const ibge = await buscarCodigosIbge(end.cidade, end.estado)
  return {
    Logradouro:          end.logradouro,
    Numero:              end.numero,
    Complemento:         end.complemento || '',
    Bairro:              end.bairro,
    UF:                  end.estado,
    Cidade:              end.cidade,
    CodigoIbgeMunicipio: ibge?.codigoMunicipio ?? '',
    CodigoIbgeUF:        ibge?.codigoUF ?? '',
    CEP:                 (end.cep ?? '').replace(/\D/g, ''),
  }
}

// Monta o objeto ClienteNotaFiscal — obrigatório no Add/1 e Add/3 (dados de faturamento)
async function montarClienteNotaFiscal(nome: string, documento: string, end: EnderecoSafeweb | undefined, email?: string) {
  if (!end) return undefined
  const ibge = await buscarCodigosIbge(end.cidade, end.estado)
  return {
    Sacado:           nome,
    Documento:        documento.replace(/\D/g, ''),
    Bairro:           end.bairro,
    Cep:              (end.cep ?? '').replace(/\D/g, ''),
    Cidade:           end.cidade,
    CidadeCodigo:     ibge?.codigoMunicipio ?? '',
    Complemento:      end.complemento || null,
    Email1:           email || '',
    Email2:           null,
    Endereco:         end.logradouro,
    Numero:           end.numero,
    UF:               end.estado,
    UFCodigo:         ibge?.codigoUF ?? '',
    Pais:             'Brasil',
    PaisCodigoAlpha3: 'BRA',
    IE:               null,
  }
}

function montarContato(ddd?: string, telefone?: string, email?: string) {
  const dddDigits = (ddd ?? '').replace(/\D/g, '')
  let telDigits = (telefone ?? '').replace(/\D/g, '')
  // No nosso cadastro o celular às vezes vem com o DDD embutido (ex.: "11963447697").
  // A Safeweb espera DDD e Telefone em campos separados, sem repetição — remove o
  // DDD do início do telefone quando ele já vier duplicado.
  if (dddDigits && telDigits.startsWith(dddDigits) && telDigits.length - dddDigits.length >= 8) {
    telDigits = telDigits.slice(dddDigits.length)
  }
  return {
    DDD:      dddDigits,
    Telefone: telDigits,
    Email:    email ?? '',
  }
}

export async function adicionarVideoconferencia(
  params: SolicitacaoVideoconferencia,
  idTipoEmissao: 1 | 3 | 5 = 3,  // 1 = Presencial · 3 = Videoconferência · 5 = Emissão Online
  protocoloOrigem?: string,        // Add/5 apenas: protocolo do cert A3 PF retornado por EmitirCertificadoOnline
): Promise<ResultadoProtocolo> {
  const { codigoAR, cnpjAR } = cfg()
  // O webhook não tinha nenhuma autenticação — qualquer POST com um número de
  // protocolo válido (não é segredo, aparece em comprovante/e-mail do
  // cliente) conseguia criar Certificado + Lancamento financeiro de verdade.
  // Mesmo padrão já usado no job token e no webhook do Brevo: token na
  // query string, comparado no recebimento (achado 17/07/2026, auditoria de
  // segurança). Só vale pra protocolos criados a partir de agora — os poucos
  // já em andamento continuam com a URL antiga sem token.
  const baseWebhookUrl = process.env.SAFEWEB_WEBHOOK_URL
    ?? `${process.env.NEXTAUTH_URL}/api/safeweb/webhook`
  const webhookUrl = `${baseWebhookUrl}?token=${encodeURIComponent(process.env.AUTH_SECRET ?? '')}`

  try {
    let payload: Record<string, unknown>

    if (params.cnpj) {
      // ── Pessoa Jurídica ──────────────────────────────────────────────────
      const resp = params.responsavel
      payload = {
        CnpjAR:              cnpjAR,
        CodigoParceiro:      codigoAR,
        idProduto:           String(params.produtoId),
        VoucherCodigo:       '',
        RazaoSocial:         params.razaoSocial ?? params.nome,
        NomeFantasia:        params.nomeFantasia ?? '',
        CNPJ:                params.cnpj.replace(/\D/g, ''),
        CEI:                 '',
        CAEPF:               '',
        NIS:                 null,
        UrlSolicitacao:      webhookUrl,
        CandidataRemocaoACI: true,
        DocumentoIdentidade: { TipoDocumento: '0', Numero: '', Emissor: '' },
        Contato:             montarContato(params.ddd, params.telefone, params.email),
        Endereco:            await montarEndereco(params.endereco),
        Titular: resp ? {
          Nome:            resp.nome,
          CPF:             resp.cpf.replace(/\D/g, ''),
          DataNascimento:  resp.dataNascimento ?? '',
          Contato:         montarContato(resp.ddd, resp.telefone, resp.email),
          Endereco:        await montarEndereco(resp.endereco ?? params.endereco),
        } : undefined,
        ClienteNotaFiscal:   await montarClienteNotaFiscal(
          params.razaoSocial ?? params.nome,
          params.cnpj,
          params.endereco,
          params.email,
        ),
        CPFContador:         '',
        Parametro1:          'Matriz',
        Parametro2:          '',
        Parametro3:          null,
        Parametro4:          '-',
      }
    } else {
      // ── Pessoa Física ────────────────────────────────────────────────────
      payload = {
        CnpjAR:              cnpjAR,
        CodigoParceiro:      codigoAR,
        idProduto:           String(params.produtoId),
        VoucherCodigo:       '',
        Nome:                params.nome,
        CPF:                 (params.cpf ?? '').replace(/\D/g, ''),
        DataNascimento:      params.dataNascimento ?? '',
        CEI:                 '',
        CAEPF:               '',
        NIS:                 null,
        UrlSolicitacao:      webhookUrl,
        CandidataRemocaoACI: true,
        DocumentoIdentidade: { TipoDocumento: '0', Numero: '', Emissor: '' },
        Contato:             montarContato(params.ddd, params.telefone, params.email),
        Endereco:            await montarEndereco(params.endereco),
        ClienteNotaFiscal:   await montarClienteNotaFiscal(
          params.nome,
          params.cpf ?? '',
          params.endereco,
          params.email,
        ),
        CPFContador:         '',
        Parametro1:          'Matriz',
        Parametro2:          '',
        Parametro3:          null,
        Parametro4:          '-',
      }
    }

    // Add/5 (Emissão Online): inclui o protocolo do cert A3 PF de origem quando disponível
    if (idTipoEmissao === 5 && protocoloOrigem) {
      payload.Protocolo = protocoloOrigem
    }

    console.log(`[Safeweb] Add/${idTipoEmissao} REQUEST:`, JSON.stringify(payload))
    const { ok, data } = await req('POST', `/Shared/Partner/api/Add/${idTipoEmissao}`, payload)
    console.log(`[Safeweb] Add/${idTipoEmissao} RESPONSE (${ok ? 'ok' : 'erro'}):`, JSON.stringify(data))

    if (!ok) return { ok: false, erro: String(data.Message ?? data.mensagem ?? data.message ?? 'Erro ao criar protocolo'), raw: data }

    // Safeweb pode retornar o protocolo em diferentes campos (PascalCase ou camelCase)
    const protocolo = String(
      data.Protocolo ?? data.protocolo ??
      data.NumeroProtocolo ?? data.numeroProtocolo ??
      data.Id ?? data.id ?? data ?? ''
    )
    return { ok: true, protocolo, raw: data }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 2. Integração HOPE — Primeira Emissão ────────────────────────────────────
// Passo obrigatório após adicionarVideoconferencia — torna o protocolo visível no HOPE

export async function integracaoHope(protocolo: string): Promise<{ ok: boolean; erro?: string; url?: string }> {
  const { baseUrl, attendancePlaceId } = cfg()
  try {
    // A API do Hope exige o prefixo "Bearer " no token — diferente da API Partner,
    // que aceita o token sem prefixo (por isso não usamos o helper genérico req()).
    const token = await getToken()
    const res = await fetch(`${baseUrl}/Hope/Shared/api/integration/solicitation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocol:             String(protocolo),
        attendancePlaceId,
        aciRemovalCandidate:  false, // NUNCA true — confirmado Safeweb 01/07/2026: true CAUSA ACI obrigatória em todos os pedidos
      }),
      signal: AbortSignal.timeout(12000),
    })
    const raw = await res.text()
    console.log(`[Safeweb] HOPE REQUEST: protocol=${protocolo} attendancePlaceId=${attendancePlaceId}`)
    console.log(`[Safeweb] HOPE RESPONSE (HTTP ${res.status}):`, raw.slice(0, 500))
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(raw) } catch { data = { _raw: raw } }
    if (!res.ok) return { ok: false, erro: String(data.mensagem ?? data.message ?? `Erro ao vincular ao HOPE (HTTP ${res.status})`) }
    return { ok: true, url: typeof data.url === 'string' ? data.url : undefined }
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
      Protocolo:      String(protocolo),
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
// Mapeia automaticamente o modelo do CertFlow → idProduto da Safeweb.
//
// Regra confirmada com o suporte da Safeweb (chamado de 25/06/2026) e com a
// própria API GetListProdutoByAR — NÃO é uma suposição:
// - O campo que distingue a mídia é `MidiaTipo`, não `ProdutoModelo` (que é
//   sempre "A3", igual em todos os produtos A3, com ou sem mídia).
// - A linha SafeID (mídia "PSC" = nuvem) é vendida por período de uso, em
//   `DiasPeriodoUso` (120 = 4 meses, 365 = 1 ano, 730 = 2 anos) — o campo
//   `ProdutoValidade` nessa linha sempre mostra "2 Anos", que é a validade
//   técnica do certificado emitido, não o período comercial vendido.
// - Nas demais linhas (sem mídia, cartão, token, arquivo), não existe opção
//   de "4 meses" — só 1 ano ou 2 anos — e `ProdutoValidade` reflete isso
//   corretamente.
const MIDIA_TIPO_POR_SUPORTE: Record<string, string> = {
  NUVEM: 'PSC',
  TOKEN: 'Token',
  CARTAO: 'Cartão',
  ARQUIVO: 'Arquivo',
  SEM_MIDIA: 'Sem mídia',
}

const DIAS_PERIODO_USO_POR_VALIDADE: Record<number, number> = {
  4: 120,
  12: 365,
  24: 730,
}

export interface FiltrosProduto {
  tipoPessoa: 'PF' | 'PJ'           // PF → e-CPF, PJ → e-CNPJ
  tipoCertificado: 'A1' | 'A3'      // A1 ou A3
  validadeMeses: number              // período comercial: 4, 12 ou 24
  idTipoEmissao?: number             // 3 = videoconferência (padrão)
  suporte?: string                   // NUVEM, TOKEN, CARTAO, ARQUIVO
  comLeitora?: boolean               // só para CARTAO: distingue "+ cartão" de "+ cartão + leitora"
}

// Retorna o produto cuja mídia e período batem exatamente com o solicitado.
// Não existe mais fallback "produto parecido" — se não houver correspondência
// exata, a venda deve falhar com erro claro em vez de seguir com um produto
// que pode não ser o que o cliente pediu.
export function encontrarNosprodutos(
  produtos: Record<string, unknown>[],
  tipoProduto: string,
  modelo: string,
  filtros: FiltrosProduto,
): Record<string, unknown> | undefined {
  const midiaTipoEsperado = filtros.suporte ? MIDIA_TIPO_POR_SUPORTE[filtros.suporte] : undefined

  return produtos.find((p: Record<string, unknown>) => {
    // "SafeAgro + SafeID ..." é um produto combinado separado (voltado a
    // produtores rurais) — fora do escopo desta busca automática por
    // decisão do Vinicius em 25/06/2026. Tratamento do SafeAgro fica para
    // depois (precisa de um jeito de fixar o produto exato por modelo).
    if (String(p.Nome ?? '').includes('SafeAgro')) return false
    if (!String(p.ProdutoTipo).includes(tipoProduto)) return false
    if (String(p.ProdutoModelo) !== modelo) return false
    if (midiaTipoEsperado && String(p.MidiaTipo) !== midiaTipoEsperado) return false

    // Cartão simples e cartão+leitora têm os mesmos ProdutoTipo/Modelo/Midia
    // — só o campo `Acessorio` ("Leitora" ou null) distingue os dois.
    if (midiaTipoEsperado === 'Cartão') {
      const temLeitora = Boolean(p.Acessorio)
      if (temLeitora !== Boolean(filtros.comLeitora)) return false
    }

    if (midiaTipoEsperado === 'PSC') {
      const diasEsperados = DIAS_PERIODO_USO_POR_VALIDADE[filtros.validadeMeses]
      return diasEsperados !== undefined && Number(p.DiasPeriodoUso) === diasEsperados
    }

    const validade = filtros.validadeMeses <= 12 ? '1 Ano' : '2 Anos'
    return String(p.ProdutoValidade).includes(validade.split(' ')[0])
  }) as Record<string, unknown> | undefined
}

export async function buscarProduto(filtros: FiltrosProduto): Promise<{
  ok: boolean; idProduto?: number; nome?: string; idTipoEmissaoUsado?: number; erro?: string
}> {
  const idTipoEmissao = filtros.idTipoEmissao ?? 3
  const tipoProduto    = filtros.tipoPessoa === 'PF' ? 'e-CPF' : 'e-CNPJ'
  const modelo         = filtros.tipoCertificado

  // Decisão de 25/06/2026: nunca trocar o tipo de emissão por baixo dos
  // panos. Presencial (Add/1), videoconferência (Add/3) e emissão online
  // (Add/5) são endpoints e fluxos diferentes na Safeweb — usar o produto
  // de um tipo para o protocolo de outro pode gerar uma solicitação que a
  // Safeweb processa de um jeito que o CertFlow não espera. Se não houver
  // produto exato para o tipo pedido, a venda deve falhar, não trocar de tipo.
  const { ok, produtos, erro } = await listarProdutos(idTipoEmissao)
  if (!ok || !produtos?.length) {
    return { ok: false, erro: erro ?? 'Sem produtos disponíveis' }
  }

  const encontrado = encontrarNosprodutos(produtos, tipoProduto, modelo, filtros)
  if (encontrado) {
    return { ok: true, idProduto: Number(encontrado.idProduto), nome: String(encontrado.Nome), idTipoEmissaoUsado: idTipoEmissao }
  }

  return {
    ok: false,
    erro: `Produto Safeweb não encontrado para ${tipoProduto} ${modelo}, suporte ${filtros.suporte ?? '(não informado)'}, ${filtros.validadeMeses} meses, tipo de emissão ${idTipoEmissao}. Confira o catálogo real (GetListProdutoByAR) antes de tentar novamente — não existe produto aproximado, nem de outro tipo de emissão.`,
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

// ── 6. Emissão Online — validar cert A3 PF existente (GET EmitirCertificadoOnline) ────────────

export async function validarCertificadoOnline(
  numeroSerie: string,
  idProduto: string,
): Promise<{ ok: boolean; protocolo?: string; dados?: Record<string, unknown>; erro?: string }> {
  const { cnpjAR } = cfg()
  try {
    const { ok, data } = await req(
      'GET',
      `/Shared/Partner/api/EmitirCertificadoOnline/${encodeURIComponent(numeroSerie)}/${encodeURIComponent(idProduto)}/${cnpjAR}`,
    )
    if (!ok) return { ok: false, erro: String(data.Message ?? data.mensagem ?? 'Certificado inválido ou não encontrado') }
    const protocolo = String(data.Protocolo ?? data.protocolo ?? '')
    return { ok: true, protocolo: protocolo || undefined, dados: data }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 7. Emissão Online — liberar protocolo após confirmação de pagamento ───────

export async function liberarEmissaoOnline(
  protocolo: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { cnpjAR } = cfg()
  try {
    const { ok, data } = await req('POST', '/Shared/Partner/api/UpdateLiberacao', {
      Protocolo: protocolo,
      CNPJ:      cnpjAR,
    })
    // A Safeweb retorna um boolean diretamente (true = sucesso, false = falhou)
    if (!ok || (data as unknown) === false) {
      return { ok: false, erro: 'Liberação recusada pela Safeweb' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

// ── 8. Diagnóstico — valida configuração e autenticação ──────────────────────

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