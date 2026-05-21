import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface QSAMember {
  nome_socio:          string
  cnpj_cpf_do_socio:   string
  qualificacao_socio:  string
}

interface CNPJResponse {
  razao_social:       string
  nome_fantasia?:     string
  situacao_cadastral: string
  qsa?:               QSAMember[]
}

// Receita Federal mascara primeiro 3 e último 2 dígitos do CPF: ***027.448-**
// Compara os 6 dígitos do meio com o CPF informado
function cpfMatchesMasked(cpfInput: string, masked: string): boolean {
  const clean = cpfInput.replace(/\D/g, '')
  if (clean.length !== 11) return false
  const visivel = clean.slice(3, 9) // dígitos 4 a 9
  const maskedVisible = masked.replace(/[.*\-\s]/g, '').replace(/\*/g, '')
  return maskedVisible.trim() === visivel
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { cnpj, cpf } = await req.json()
  const cnpjNum = cnpj?.replace(/\D/g, '')
  const cpfNum  = cpf?.replace(/\D/g, '')

  if (!cnpjNum || cnpjNum.length !== 14) return NextResponse.json({ erro: 'CNPJ inválido' }, { status: 422 })
  if (!cpfNum  || cpfNum.length  !== 11) return NextResponse.json({ erro: 'CPF inválido'  }, { status: 422 })

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNum}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) return NextResponse.json({ erro: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })

    const data: CNPJResponse = await res.json()

    if (data.situacao_cadastral !== 'ATIVA') {
      return NextResponse.json({
        erro: `Empresa com situação "${data.situacao_cadastral}" na Receita Federal`,
        empresa: data.razao_social,
        permitido: false,
      })
    }

    if (!data.qsa?.length) {
      return NextResponse.json({
        erro: 'Nenhum sócio/administrador encontrado para este CNPJ',
        empresa: data.razao_social,
        permitido: false,
      })
    }

    const match = data.qsa.find(m =>
      m.cnpj_cpf_do_socio && cpfMatchesMasked(cpfNum, m.cnpj_cpf_do_socio)
    )

    if (!match) {
      return NextResponse.json({
        erro: 'CPF não corresponde a nenhum responsável desta empresa',
        empresa: data.razao_social,
        permitido: false,
      })
    }

    return NextResponse.json({
      nome:     match.nome_socio,
      empresa:  data.razao_social,
      cargo:    match.qualificacao_socio,
      permitido: true,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao consultar Receita Federal' }, { status: 500 })
  }
}