import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, getToken } from '@/lib/safeweb'

async function testarProdutos(idTipo: number, cnpj: string, baseUrl: string, token: string) {
  const url = `${baseUrl}/Shared/Product/api/GetListProdutoByAR/${idTipo}/${encodeURIComponent(cnpj)}`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const raw = await res.text()
  let data: unknown
  try { data = JSON.parse(raw) } catch { data = raw.slice(0, 200) }
  return { status: res.status, ok: res.ok, data }
}

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const diagnostico = await diagnosticar()
  if (!diagnostico.tokenOk) return NextResponse.json({ ...diagnostico })

  const token   = await getToken()
  const baseUrl = diagnostico.baseUrl
  const cnpjNum = '33638059000169'
  const cnpjFmt = '33.638.059/0001-69'

  // Testa tipo 3 (videoconferência) com CNPJ numérico e formatado
  const [r1, r2, r3] = await Promise.all([
    testarProdutos(3, cnpjNum, baseUrl, token),
    testarProdutos(3, cnpjFmt, baseUrl, token),
    testarProdutos(1, cnpjNum, baseUrl, token),
  ])

  return NextResponse.json({
    ...diagnostico,
    testes: {
      'tipo3_cnpj_numerico':   r1,
      'tipo3_cnpj_formatado':  r2,
      'tipo1_cnpj_numerico':   r3,
    },
  })
}