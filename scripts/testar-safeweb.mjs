// Testa o fluxo Safeweb: auth → listar produtos → buscar produto → criar protocolo
import { readFileSync } from 'fs'

// Lê o .env.prod.test
const env = Object.fromEntries(
  readFileSync('.env.prod.test', 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')]
    })
)

const homolog    = env.SAFEWEB_HOMOLOGACAO === 'true'
const identificador = homolog ? (env.SAFEWEB_IDENTIFICADOR_HOMOLOG || env.SAFEWEB_IDENTIFICADOR) : env.SAFEWEB_IDENTIFICADOR
const segredo    = homolog ? (env.SAFEWEB_SEGREDO_HOMOLOG || env.SAFEWEB_SEGREDO) : env.SAFEWEB_SEGREDO
const baseUrl    = homolog
  ? 'https://h-pss.safewebpss.com.br/Service/Microservice'
  : (env.SAFEWEB_BASE_URL ?? 'https://pss.safewebpss.com.br/Service/Microservice')
const codigoAR   = env.SAFEWEB_CODIGO_AR
const cnpjAR     = env.SAFEWEB_CNPJ_AR
const attendancePlaceId = Number(env.SAFEWEB_ATTENDANCE_PLACE_ID ?? 0)

console.log('=== CONFIG ===')
console.log('homolog:', homolog)
console.log('baseUrl:', baseUrl)
console.log('codigoAR:', codigoAR)
console.log('cnpjAR:', cnpjAR)
console.log('attendancePlaceId:', attendancePlaceId)
console.log('identificador definido:', !!identificador)
console.log()

// 1. Autenticar
console.log('=== 1. AUTENTICAÇÃO ===')
const encoded = Buffer.from(`${identificador}:${segredo}`).toString('base64')
const authRes = await fetch(`${baseUrl}/Shared/HubAutenticacao/Autenticacoes/api/autorizacao/token`, {
  method: 'POST',
  headers: { 'Authorization': `Basic ${encoded}`, 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(15000),
})
const authData = await authRes.json().catch(() => ({}))
console.log('status:', authRes.status)
console.log('campos recebidos:', Object.keys(authData))
if (!authRes.ok) { console.error('ERRO auth:', authData); process.exit(1) }

const token = authData.tokenAcesso ?? authData.access_token ?? authData.token
console.log('token obtido:', !!token)
console.log()

// 2. Listar produtos tipo 3 (videoconferência)
console.log('=== 2. LISTAR PRODUTOS (idTipoEmissao=3) ===')
const prodRes = await fetch(`${baseUrl}/Shared/Product/api/GetListProdutoByAR/3/${cnpjAR}`, {
  headers: { 'Authorization': token, 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(15000),
})
const prodRaw = await prodRes.text()
let produtos = []
try {
  const parsed = JSON.parse(prodRaw)
  produtos = Array.isArray(parsed) ? parsed : (parsed.produtos ?? [])
} catch { console.error('não parseou JSON:', prodRaw.slice(0, 200)) }
console.log('status:', prodRes.status)
console.log('total produtos:', produtos.length)
if (produtos.length > 0) {
  console.log('campos de 1 produto:', Object.keys(produtos[0]))
  console.log('amostra (3 produtos):')
  produtos.slice(0, 5).forEach(p => console.log('  ', JSON.stringify(p)))
}
console.log()

// 3. Buscar produto e-CPF A3 24 meses
console.log('=== 3. BUSCAR PRODUTO e-CPF A3 24 meses ===')
const produto = produtos.find(p =>
  String(p.ProdutoTipo ?? '').includes('e-CPF') &&
  String(p.ProdutoModelo ?? '') === 'A3' &&
  String(p.ProdutoValidade ?? '').includes('2')
)
const fallback = produto ?? produtos.find(p =>
  String(p.ProdutoTipo ?? '').includes('e-CPF') &&
  String(p.ProdutoModelo ?? '') === 'A3'
)
console.log('produto exato encontrado:', !!produto)
console.log('fallback encontrado:', !!fallback)
if (fallback) console.log('produto:', JSON.stringify(fallback))
const idProduto = fallback?.idProduto ?? fallback?.Id ?? fallback?.id
console.log('idProduto:', idProduto)
console.log()

if (!idProduto) {
  console.error('PRODUTO NÃO ENCONTRADO — os campos do produto são diferentes do esperado')
  console.log('Todos os produtos:')
  produtos.forEach(p => console.log(' ', JSON.stringify(p)))
  process.exit(1)
}

// 4. Criar protocolo (apenas informa o resultado, sem cancelar)
console.log('=== 4. CRIAR PROTOCOLO (TESTE — será cancelado depois) ===')
const webhookUrl = 'https://certflow-nine.vercel.app/api/safeweb/webhook'
const body = {
  cpf: '44114585869', // CPF de teste (LARYSSA)
  nome: 'LARYSSA SCHIAVE BUENO DE OLIVEIRA',
  produtoId: String(idProduto),
  codigoAR,
  urlNotificacao: webhookUrl,
}
console.log('body enviado:', JSON.stringify(body))
const protRes = await fetch(`${baseUrl}/Shared/Partner/api/Add/3`, {
  method: 'POST',
  headers: { 'Authorization': token, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(15000),
})
const protRaw = await protRes.text()
let protData = {}
try { protData = JSON.parse(protRaw) } catch { protData = { _raw: protRaw } }
console.log('status:', protRes.status)
console.log('resposta:', JSON.stringify(protData, null, 2))
