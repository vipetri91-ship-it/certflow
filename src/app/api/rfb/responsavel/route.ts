import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface QSANorm {
  nome_socio:         string
  cnpj_cpf_do_socio:  string
  qualificacao_socio: string
}

interface CNPJNorm {
  razaoSocial: string
  situacao:    string
  qsa:         QSANorm[]
}

// Receita Federal mascara primeiro 3 e último 2 dígitos: ***027.448-**
// Compara os 6 dígitos centrais com o CPF informado
function cpfMatchesMasked(cpfInput: string, masked: string): boolean {
  const clean = cpfInput.replace(/\D/g, '')
  if (clean.length !== 11) return false
  const visivel     = clean.slice(3, 9)          // 6 dígitos centrais do CPF
  const maskedDigits = masked.replace(/\D/g, '') // só os dígitos visíveis (remove *, ., -)
  return maskedDigits === visivel
}

async function buscarBrasilAPI(cnpj: string): Promise<CNPJNorm | null> {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const d = await r.json()
    return {
      razaoSocial: d.razao_social ?? '',
      situacao:    (d.situacao_cadastral ?? '').toUpperCase(),
      qsa: (d.qsa ?? []).map((m: Record<string, unknown>) => ({
        nome_socio:         (m.nome_socio as string) ?? '',
        cnpj_cpf_do_socio:  (m.cnpj_cpf_do_socio as string) ?? '',
        qualificacao_socio: typeof m.qualificacao_socio === 'object'
          ? ((m.qualificacao_socio as Record<string, unknown>)?.descricao as string ?? '')
          : (m.qualificacao_socio as string) ?? '',
      })),
    }
  } catch { return null }
}

async function buscarCNPJws(cnpj: string): Promise<CNPJNorm | null> {
  try {
    const r = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const d = await r.json()
    return {
      razaoSocial: (d.razao_social ?? '') as string,
      situacao:    ((d.estabelecimento?.situacao_cadastral ?? 'ATIVA') as string).toUpperCase(),
      qsa: ((d.socios ?? []) as Record<string, unknown>[]).map(s => ({
        nome_socio:         (s.nome as string) ?? '',
        cnpj_cpf_do_socio:  ((s.cpf_cnpj_socio ?? s.cpf) as string) ?? '',   // campo correto cnpj.ws
        qualificacao_socio: ((s.qualificacao_socio as Record<string,unknown>)?.descricao as string)?.trim() ?? '',
      })),
    }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { cnpj, cpf } = await req.json()
  const cnpjNum = cnpj?.replace(/\D/g, '')
  const cpfNum  = cpf?.replace(/\D/g, '')

  if (!cnpjNum || cnpjNum.length !== 14) return NextResponse.json({ erro: 'CNPJ inválido' }, { status: 422 })
  if (!cpfNum  || cpfNum.length  !== 11) return NextResponse.json({ erro: 'CPF inválido'  }, { status: 422 })

  // Tenta BrasilAPI primeiro, depois CNPJ.ws
  const dados = (await buscarBrasilAPI(cnpjNum)) ?? (await buscarCNPJws(cnpjNum))

  if (!dados) {
    return NextResponse.json({ erro: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
  }

  if (dados.situacao && !dados.situacao.includes('ATIVA') && !dados.situacao.includes('ATIVA')) {
    return NextResponse.json({
      erro: `Empresa com situação "${dados.situacao}" na Receita Federal`,
      empresa: dados.razaoSocial,
      permitido: false,
    })
  }

  if (!dados.qsa.length) {
    return NextResponse.json({
      erro: 'Nenhum sócio/administrador encontrado para este CNPJ',
      empresa: dados.razaoSocial,
      permitido: false,
    })
  }

  const match = dados.qsa.find(m => m.cnpj_cpf_do_socio && cpfMatchesMasked(cpfNum, m.cnpj_cpf_do_socio))

  if (!match) {
    return NextResponse.json({
      erro: 'CPF não corresponde a nenhum responsável desta empresa',
      empresa: dados.razaoSocial,
      permitido: false,
    })
  }

  return NextResponse.json({
    nome:      match.nome_socio,
    empresa:   dados.razaoSocial,
    cargo:     match.qualificacao_socio,
    permitido: true,
  })
}