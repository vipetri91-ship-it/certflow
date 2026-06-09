export const preferredRegion = 'gru1'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getToken } from '@/lib/safeweb'

function baseUrl() {
  const homolog = process.env.SAFEWEB_HOMOLOGACAO === 'true'
  return homolog
    ? (process.env.SAFEWEB_BASE_URL_HOMOLOG ?? 'https://h-pss.safewebpss.com.br/Service/Microservice')
    : (process.env.SAFEWEB_BASE_URL          ?? 'https://pss.safewebpss.com.br/Service/Microservice')
}

async function safeFetch(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) })
    const raw = await res.text()
    let data: unknown
    try { data = JSON.parse(raw) } catch { data = raw }
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    return { ok: false, status: 0, data: { mensagem: String(e) } }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { cpf } = await req.json().catch(() => ({})) as { cpf?: string }
  if (!cpf) return NextResponse.json({ erro: 'CPF obrigatório' }, { status: 400 })

  const cpfLimpo = cpf.replace(/\D/g, '')
  if (cpfLimpo.length !== 11) {
    return NextResponse.json({ erro: 'CPF inválido' }, { status: 400 })
  }

  try {
    const token = await getToken()
    const base  = baseUrl()

    const [rValidate, rLocal, rGlobal] = await Promise.allSettled([
      // GET ValidateBiometry — token sem prefixo (igual outros endpoints Partner)
      safeFetch(`${base}/Shared/Partner/api/ValidateBiometry/${cpfLimpo}`, {
        method: 'GET',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      }),
      // POST PSBio Local — docs mostram "Cpf" (maiúsculo) na tabela de atributos
      safeFetch(`${base}/Shared/Partner/api/psbio/consulta/biometria/local`, {
        method: 'POST',
        headers: { 'Authorization': `bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Cpf: cpfLimpo }),
      }),
      // POST PSBio Global
      safeFetch(`${base}/Shared/Partner/api/psbio/consulta/biometria/global`, {
        method: 'POST',
        headers: { 'Authorization': `bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Cpf: cpfLimpo }),
      }),
    ])

    const vRes = rValidate.status === 'fulfilled' ? rValidate.value : { ok: false, status: 0, data: null }
    const lRes = rLocal.status   === 'fulfilled' ? rLocal.value   : { ok: false, status: 0, data: null }
    const gRes = rGlobal.status  === 'fulfilled' ? rGlobal.value  : { ok: false, status: 0, data: null }

    // ValidateBiometry retorna boolean puro (true/false)
    const validacao = vRes.ok ? vRes.data === true : null

    // PSBio retorna { "encontrado": true/false }
    const ld = lRes.data as Record<string, unknown> | null
    const gd = gRes.data as Record<string, unknown> | null

    return NextResponse.json({
      validacao,
      local:  lRes.ok ? Boolean(ld?.encontrado) : null,
      global: gRes.ok ? Boolean(gd?.encontrado) : null,
      erros: {
        validacao: vRes.ok ? null : String((vRes.data as Record<string, unknown>)?.message ?? (vRes.data as Record<string, unknown>)?.mensagem ?? 'Erro na consulta'),
        local:     lRes.ok ? null : String(ld?.mensagem ?? ld?.message ?? JSON.stringify(lRes.data) ?? 'Erro na consulta'),
        global:    gRes.ok ? null : String(gd?.mensagem ?? gd?.message ?? JSON.stringify(gRes.data) ?? 'Erro na consulta'),
      },
      _debug: {
        localStatus: lRes.status, localRaw: lRes.data,
        globalStatus: gRes.status, globalRaw: gRes.data,
      },
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}