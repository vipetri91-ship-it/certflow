import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ORIGEM = 'Praça Benedito Peçanha Franco, 28, Centro, Piracaia, SP, Brasil'
const ORIGEM_COORDS = { lat: -23.0542, lon: -46.3597 } // fallback fixo

async function geocode(address: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Brasil')}&format=json&limit=1&countrycodes=br`
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { enderecoCliente, precoCombustivel, kmPorLitro } = await req.json()

  if (!enderecoCliente?.trim()) return NextResponse.json({ erro: 'Endereço do cliente obrigatório' }, { status: 422 })

  const preco = Number(precoCombustivel) || 6.66
  const eficiencia = Number(kmPorLitro) || 10

  // Geocode do destino
  const destino = await geocode(enderecoCliente)
  if (!destino) {
    return NextResponse.json({ erro: 'Endereço do cliente não encontrado. Tente incluir cidade e estado.' }, { status: 404 })
  }

  // Calcula rota real
  const distanciaIda = await getDistanciaKm(ORIGEM_COORDS, destino)
  if (!distanciaIda) {
    return NextResponse.json({ erro: 'Não foi possível calcular a rota. Verifique o endereço.' }, { status: 422 })
  }

  const idaVolta      = distanciaIda * 2
  const litros        = idaVolta / eficiencia
  const custo         = litros * preco
  const custoSugerido = Math.ceil(custo / 5) * 5  // arredonda pra cima no R$5

  return NextResponse.json({
    origem:         ORIGEM,
    destino:        destino.display,
    distanciaIda:   Math.round(distanciaIda),
    idaVolta:       Math.round(idaVolta),
    litros:         Math.round(litros * 10) / 10,
    custo:          Math.round(custo * 100) / 100,
    custoSugerido,
  })
}