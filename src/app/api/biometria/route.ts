export const preferredRegion = 'gru1'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getToken } from '@/lib/safeweb'

function getCfg() {
  const homolog = process.env.SAFEWEB_HOMOLOGACAO === 'true'
  return {
    baseUrl: homolog
      ? (process.env.SAFEWEB_BASE_URL_HOMOLOG ?? 'https://h-pss.safewebpss.com.br/Service/Microservice')
      : (process.env.SAFEWEB_BASE_URL ?? 'https://pss.safewebpss.com.br/Service/Microservice'),
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
    const { baseUrl } = getCfg()

    // TODO: substituir pelo endpoint correto quando confirmado
    const endpoint = `${baseUrl}/Shared/PSBio/api/ConsultarBiometria/${cpfLimpo}`

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    const raw = await res.text()
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(raw) } catch { data = { _raw: raw } }

    if (!res.ok) {
      return NextResponse.json({ erro: data.Message ?? data.mensagem ?? `Erro ${res.status}` }, { status: 502 })
    }

    // Normaliza resposta Safeweb — pode vir em vários formatos
    const local  = Boolean(data.LocalRegistrado  ?? data.localRegistrado  ?? data.local  ?? false)
    const global = Boolean(data.GlobalRegistrado ?? data.globalRegistrado ?? data.global ?? false)

    return NextResponse.json({ local, global, raw: data })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}