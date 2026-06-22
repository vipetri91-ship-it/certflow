import https from 'node:https'

const BASE = 'https://cdpj.partners.bancointer.com.br'

type CachedToken = { access_token: string; expires_at: number }
let cachedToken: CachedToken | null = null

function mkAgent() {
  const cert = Buffer.from(process.env.INTER_CERT_B64!, 'base64').toString('utf-8')
  const key  = Buffer.from(process.env.INTER_KEY_B64!,  'base64').toString('utf-8')
  return new https.Agent({ cert, key, rejectUnauthorized: true })
}

async function req(
  method: string,
  path: string,
  body?: string,
  headers?: Record<string, string>
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path)
    const r = https.request(
      { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers, agent: mkAgent() },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8')
          try { resolve({ status: res.statusCode!, data: JSON.parse(text) }) }
          catch { resolve({ status: res.statusCode!, data: text }) }
        })
      }
    )
    r.on('error', reject)
    if (body) r.write(body)
    r.end()
  })
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 30_000) return cachedToken.access_token
  const body = new URLSearchParams({
    client_id:     process.env.INTER_CLIENT_ID!,
    client_secret: process.env.INTER_CLIENT_SECRET!,
    grant_type:    'client_credentials',
    scope:         'boleto-cobranca.read boleto-cobranca.write',
  }).toString()
  const res = await req('POST', '/oauth/v2/token', body, {
    'Content-Type':   'application/x-www-form-urlencoded',
    'Content-Length': String(Buffer.byteLength(body)),
  })
  if (res.status !== 200) throw new Error(`Inter OAuth error ${res.status}: ${JSON.stringify(res.data)}`)
  const d = res.data as { access_token: string; expires_in: number }
  cachedToken = { access_token: d.access_token, expires_at: Date.now() + d.expires_in * 1000 }
  return cachedToken.access_token
}

export interface DadosPagador {
  cpfCnpj:    string
  tipoPessoa: 'FISICA' | 'JURIDICA'
  nome:       string
  email?:     string
  cep?:       string
  logradouro?: string
  numero?:    string
  bairro?:    string
  cidade?:    string
  uf?:        string
}

export interface ParamsCobranca {
  pagador:        DadosPagador
  valorNominal:   number
  dataVencimento: string   // YYYY-MM-DD
  descricao?:     string
}

export interface ResultadoCobranca {
  nossoNumero:    string
  codigoBarras:   string
  linhaDigitavel: string
  pixCopiaECola?: string
}

export async function criarCobranca(params: ParamsCobranca): Promise<ResultadoCobranca> {
  const token = await getToken()
  const payload = JSON.stringify({
    pagador:        params.pagador,
    mensagem:       { linha1: params.descricao?.slice(0, 77) ?? 'CertFlow - Certificado Digital' },
    dataVencimento: params.dataVencimento,
    valorNominal:   params.valorNominal,
    numDiasAgenda:  60,
    multa:          { codigoMulta: 'NAOTEMMULTA', taxa: 0, valor: 0 },
    mora:           { codigoMora: 'ISENTO', taxa: 0, valor: 0 },
    desconto:       { codigoDesconto: 'NAOTEMDESCONTO', taxa: 0, valor: 0, data: '' },
  })
  const res = await req('POST', '/cobranca/v3/cobrancas', payload, {
    'Content-Type':   'application/json',
    'Content-Length': String(Buffer.byteLength(payload)),
    Authorization:    `Bearer ${token}`,
  })
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Inter cobrança error ${res.status}: ${JSON.stringify(res.data)}`)
  }
  return res.data as ResultadoCobranca
}

export async function consultarCobranca(nossoNumero: string): Promise<{ situacao: string; dataPagamento?: string }> {
  const token = await getToken()
  const res = await req('GET', `/cobranca/v3/cobrancas/${nossoNumero}`, undefined, {
    Authorization: `Bearer ${token}`,
  })
  return res.data as { situacao: string; dataPagamento?: string }
}