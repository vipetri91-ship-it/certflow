export const preferredRegion = 'gru1' // São Paulo — necessário para IPs brasileiros na API Safeweb

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, getToken } from '@/lib/safeweb'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const diagnostico = await diagnosticar()
  if (!diagnostico.tokenOk) return NextResponse.json({ ...diagnostico })

  // Descobre o IP de saída do Vercel
  const ipInfo = await fetch('https://api.ipify.org?format=json')
    .then(r => r.json()).catch(() => ({ ip: 'desconhecido' }))

  const token   = await getToken()
  const baseUrl = diagnostico.baseUrl
  const cnpj    = '33638059000169'

  const codigoAR = diagnostico.codigoAR

  async function get(url: string) {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
    const raw = await res.text()
    let data: unknown
    try { data = JSON.parse(raw) } catch { data = raw.slice(0, 100) }
    return { url, status: res.status, ok: res.ok, data }
  }

  // Tenta 4 variações do endpoint
  const [t1, t2, t3, t4] = await Promise.all([
    get(`${baseUrl}/Shared/Product/api/GetListProdutoByAR/3/${cnpj}`),
    get(`${baseUrl}/Shared/Product/api/GetListProdutoByAR/3/${encodeURIComponent(codigoAR)}`),
    get(`${baseUrl}/Shared/Product/api/GetListProdutoByAR/3/${cnpj}?codigoAR=${encodeURIComponent(codigoAR)}`),
    get(`${baseUrl}/Shared/Product/api/GetProdutos?codigoAR=${encodeURIComponent(codigoAR)}`),
  ])

  const sucesso = [t1, t2, t3, t4].find(r => r.ok)

  return NextResponse.json({
    ...diagnostico,
    ip_saida_vercel: ipInfo.ip,
    sucesso: sucesso ?? null,
    testes: { cnpj: t1, codigoAR: t2, cnpjComCodigoAR: t3, getProdutos: t4 },
  })
}