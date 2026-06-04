import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, getToken } from '@/lib/safeweb'

async function testar(idTipo: number, cnpj: string, baseUrl: string, token: string, label: string) {
  const url = `${baseUrl}/Shared/Product/api/GetListProdutoByAR/${idTipo}/${encodeURIComponent(cnpj)}`
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const raw = await res.text()
    let data: unknown
    try { data = JSON.parse(raw) } catch { data = raw.slice(0, 300) }
    return { label, url, status: res.status, ok: res.ok, data }
  } catch (err) {
    return { label, url, status: 0, ok: false, data: String(err) }
  }
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

  // Testa todas as combinações: tipos 1-5, CNPJ numérico e formatado (URL-encoded)
  const resultados = await Promise.all([
    testar(1, cnpjNum, baseUrl, token, 'tipo1 + numérico'),
    testar(2, cnpjNum, baseUrl, token, 'tipo2 + numérico'),
    testar(3, cnpjNum, baseUrl, token, 'tipo3 + numérico'),
    testar(4, cnpjNum, baseUrl, token, 'tipo4 + numérico'),
    testar(5, cnpjNum, baseUrl, token, 'tipo5 + numérico'),
    testar(3, cnpjFmt, baseUrl, token, 'tipo3 + formatado (URL-encoded)'),
  ])

  const sucesso = resultados.find(r => r.ok)

  return NextResponse.json({
    ...diagnostico,
    sucesso: sucesso ? { label: sucesso.label, url: sucesso.url } : null,
    resultados: resultados.map(r => ({ label: r.label, status: r.status, ok: r.ok, url: r.url, data: r.ok ? r.data : r.data })),
  })
}