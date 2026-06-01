import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ORIGEM_COORDS = { lat: -23.0542, lon: -46.3597 } // Piracaia/SP

// ── Expansões ─────────────────────────────────────────────────────────────────

const ABREVIACOES: Record<string, string> = {
  'r\\.':   'Rua', 'av\\.':  'Avenida', 'al\\.':   'Alameda',
  'rod\\.': 'Rodovia', 'trav\\.': 'Travessa', 'pca\\.': 'Praça',
  'pc\\.':  'Praça', 'est\\.':  'Estrada',
}

const ESTADOS: Record<string, string> = {
  AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia',
  CE:'Ceará', DF:'Distrito Federal', ES:'Espírito Santo', GO:'Goiás',
  MA:'Maranhão', MT:'Mato Grosso', MS:'Mato Grosso do Sul', MG:'Minas Gerais',
  PA:'Pará', PB:'Paraíba', PR:'Paraná', PE:'Pernambuco', PI:'Piauí',
  RJ:'Rio de Janeiro', RN:'Rio Grande do Norte', RS:'Rio Grande do Sul',
  RO:'Rondônia', RR:'Roraima', SC:'Santa Catarina', SP:'São Paulo',
  SE:'Sergipe', TO:'Tocantins',
}

function expandirAbreviacoes(s: string): string {
  let r = s
  for (const [abr, exp] of Object.entries(ABREVIACOES)) {
    r = r.replace(new RegExp(abr, 'gi'), exp)
  }
  return r
}

function expandirEstado(s: string): string {
  // Ex: "Bragança Paulista/SP" → "Bragança Paulista, São Paulo"
  return s.replace(/\/([A-Z]{2})\b/g, (_, uf) => ESTADOS[uf] ? `, ${ESTADOS[uf]}` : `/${uf}`)
}

function extrairCidade(s: string): string | null {
  // Tenta extrair só cidade/estado do fim do endereço
  const m = s.match(/([^,]+(?:\/[A-Z]{2})?)\s*$/)
  return m ? m[1].trim() : null
}

function pareceCep(s: string): boolean {
  return /^\d{5}-?\d{3}$/.test(s.trim())
}

// ── Geocoding ViaCEP ──────────────────────────────────────────────────────────

async function geocodeCep(cep: string): Promise<string | null> {
  try {
    const nums = cep.replace(/\D/g, '')
    const r = await fetch(`https://viacep.com.br/ws/${nums}/json/`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    if (d.erro) return null
    return `${d.logradouro ? d.logradouro + ', ' : ''}${d.bairro ? d.bairro + ', ' : ''}${d.localidade}, ${d.uf}`
  } catch { return null }
}

// ── Nominatim ────────────────────────────────────────────────────────────────

async function nominatim(query: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br&addressdetails=1`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'CertFlow/1.0 (certflow-nine.vercel.app)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    const data = await r.json()
    if (!data?.length) return null
    return { lat: Number(data[0].lat), lon: Number(data[0].lon), display: data[0].display_name }
  } catch { return null }
}

// ── Geocode com fallback múltiplo ─────────────────────────────────────────────

async function geocode(endereco: string): Promise<{ lat: number; lon: number; display: string } | null> {
  const original = endereco.trim()

  // 1. CEP detectado → resolve via ViaCEP e depois geocoda a cidade
  if (pareceCep(original)) {
    const endViaCep = await geocodeCep(original)
    if (endViaCep) {
      const r = await nominatim(endViaCep + ', Brasil')
      if (r) return r
    }
  }

  // 2. Tentativa com endereço original + Brasil
  const tentativas = [
    original + ', Brasil',
    expandirAbreviacoes(expandirEstado(original)) + ', Brasil',
    expandirEstado(original) + ', Brasil',
  ]

  // 3. Se tem barra de estado (Cidade/SP), tenta só cidade + estado expandido
  const comBarra = original.match(/^(.+?)\/([A-Z]{2})$/)
  if (comBarra) {
    const cidade = comBarra[1].trim()
    const uf     = comBarra[2]
    const estado = ESTADOS[uf] ?? uf
    tentativas.push(`${cidade}, ${estado}, Brasil`)
    tentativas.push(`${cidade}, Brasil`)
  }

  // 4. Tenta só a cidade extraída do fim do endereço
  const cidade = extrairCidade(original)
  if (cidade && cidade !== original) {
    tentativas.push(expandirEstado(cidade) + ', Brasil')
    tentativas.push(cidade + ', Brasil')
  }

  for (const tentativa of tentativas) {
    const r = await nominatim(tentativa)
    if (r) return r
    await new Promise(res => setTimeout(res, 500)) // respeita rate limit do Nominatim
  }

  return null
}

// ── Rota via OSRM ─────────────────────────────────────────────────────────────

async function getDistanciaKm(
  orig: { lat: number; lon: number },
  dest: { lat: number; lon: number }
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=false`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) return null
    const data = await r.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null
    return data.routes[0].distance / 1000
  } catch { return null }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { enderecoCliente, precoCombustivel, kmPorLitro } = await req.json()
  if (!enderecoCliente?.trim()) return NextResponse.json({ erro: 'Endereço obrigatório' }, { status: 422 })

  const preco      = Number(precoCombustivel) || 6.66
  const eficiencia = Number(kmPorLitro)       || 10

  const destino = await geocode(enderecoCliente)
  if (!destino) {
    return NextResponse.json({
      erro: 'Endereço não encontrado. Tente: "Bragança Paulista/SP", "Av. Brasil, 100, Atibaia/SP" ou um CEP.',
    }, { status: 404 })
  }

  const distanciaIda = await getDistanciaKm(ORIGEM_COORDS, destino)
  if (!distanciaIda) {
    return NextResponse.json({ erro: 'Não foi possível calcular a rota. Tente um endereço mais específico.' }, { status: 422 })
  }

  const idaVolta      = distanciaIda * 2
  const litros        = idaVolta / eficiencia
  const custo         = litros * preco
  const custoSugerido = Math.ceil(custo / 5) * 5

  return NextResponse.json({
    origem:       'Piracaia/SP',
    destino:      destino.display,
    distanciaIda: Math.round(distanciaIda),
    idaVolta:     Math.round(idaVolta),
    litros:       Math.round(litros * 10) / 10,
    custo:        Math.round(custo * 100) / 100,
    custoSugerido,
  })
}