// Endpoint temporário de diagnóstico — testa diferentes paths da API Safeweb
// para descobrir qual retorna dados de status de um protocolo.
// Uso: GET /api/admin/testar-consulta-safeweb?protocolo=1010813157
// Acessível apenas por ADMIN.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getToken } from '@/lib/safeweb'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const protocolo = req.nextUrl.searchParams.get('protocolo')
  if (!protocolo) {
    return NextResponse.json({ erro: 'Parâmetro ?protocolo= obrigatório' }, { status: 400 })
  }

  const baseUrl = process.env.SAFEWEB_BASE_URL ?? 'https://pss.safewebpss.com.br/Service/Microservice'
  const cnpjAR  = process.env.SAFEWEB_CNPJ_AR ?? ''

  // Candidatos de endpoint para consulta de status
  const paths = [
    `/Shared/Partner/api/ConsultarSolicitacao/${protocolo}`,
    `/Shared/Partner/api/Solicitacao/${protocolo}`,
    `/Shared/Partner/api/BuscarSolicitacao/${protocolo}`,
    `/api/solicitacao/${protocolo}`,
    `/Shared/Partner/api/ConsultarSolicitacao/${protocolo}/${cnpjAR}`,
    `/Shared/Partner/api/Solicitacao/${protocolo}/${cnpjAR}`,
  ]

  let token: string
  try {
    token = await getToken()
  } catch (err) {
    return NextResponse.json({ erro: `Falha ao obter token: ${err}` }, { status: 500 })
  }

  const resultados: Array<{
    path: string
    status: number
    ok: boolean
    corpo: unknown
  }> = []

  for (const path of paths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      const raw = await res.text()
      let corpo: unknown = raw
      try { corpo = JSON.parse(raw) } catch { /* mantém como string */ }
      resultados.push({ path, status: res.status, ok: res.ok, corpo })
    } catch (err) {
      resultados.push({ path, status: 0, ok: false, corpo: String(err) })
    }
  }

  return NextResponse.json({ protocolo, baseUrl, resultados })
}
