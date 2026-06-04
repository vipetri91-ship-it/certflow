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

  // Testa tipo 3
  const url = `${baseUrl}/Shared/Product/api/GetListProdutoByAR/3/${cnpj}`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const raw  = await res.text()
  let data: unknown
  try { data = JSON.parse(raw) } catch { data = raw.slice(0, 200) }

  return NextResponse.json({
    ...diagnostico,
    ip_saida_vercel: ipInfo.ip,
    aviso: 'Se o IP não for brasileiro, a Safeweb pode estar bloqueando. APIs gov.br frequentemente restringem IPs fora do Brasil.',
    produto_teste: { url, status: res.status, ok: res.ok, data },
  })
}