import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DadosCNPJ {
  cnpj: string
  razaoSocial: string | null
  nomeFantasia: string | null
  situacaoCadastral: string | null
  email: string | null
  telefone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  qsa: { nome: string; cpfMascarado: string; qualificacao: string }[]
}

type ResultadoBusca = { ok: true; dados: DadosCNPJ } | { ok: false; notFound: boolean }

// Formata telefone: "1132341234" → "(11) 3234-1234" ou "(11) 93234-1234"
function formatarTelefone(raw: string | null | undefined): string | null {
  const nums = (raw ?? '').replace(/\D/g, '')
  if (nums.length === 11) return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`
  if (nums.length === 10) return `(${nums.slice(0,2)}) ${nums.slice(2,6)}-${nums.slice(6)}`
  return null
}

async function buscarBrasilAPI(nums: string): Promise<ResultadoBusca> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${nums}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'CertFlow/1.0' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return { ok: false, notFound: res.status === 404 }

  const data = await res.json()
  return {
    ok: true,
    dados: {
      cnpj: data.cnpj,
      razaoSocial: data.razao_social ?? null,
      nomeFantasia: data.nome_fantasia ?? null,
      situacaoCadastral: data.descricao_situacao_cadastral ?? null,
      email: data.email || null,
      telefone: formatarTelefone(data.ddd_telefone_1),
      cep: data.cep?.replace(/\D/g, '') ?? null,
      logradouro: data.logradouro ?? null,
      numero: data.numero ?? null,
      complemento: data.complemento ?? null,
      bairro: data.bairro ?? null,
      municipio: data.municipio ?? null,
      uf: data.uf ?? null,
      qsa: (data.qsa ?? []).map((s: Record<string, string>) => ({
        nome: s.nome_socio,
        cpfMascarado: s.cnpj_cpf_do_socio,
        qualificacao: s.qualificacao_socio,
      })),
    },
  }
}

// Fallback usado quando a BrasilAPI (fonte: minhareceita.org) está indisponível.
// Mesmo formato de CPF mascarado dos sócios ("***571038**"), confirmado em teste manual.
async function buscarCnpjWs(nums: string): Promise<ResultadoBusca> {
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${nums}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return { ok: false, notFound: res.status === 404 }

  const data = await res.json()
  const est = data.estabelecimento ?? {}
  return {
    ok: true,
    dados: {
      cnpj: est.cnpj ?? nums,
      razaoSocial: data.razao_social ?? null,
      nomeFantasia: est.nome_fantasia ?? null,
      situacaoCadastral: est.situacao_cadastral ?? null,
      email: est.email || null,
      telefone: formatarTelefone(est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}` : null),
      cep: est.cep?.replace(/\D/g, '') ?? null,
      logradouro: est.logradouro ?? null,
      numero: est.numero ?? null,
      complemento: est.complemento ?? null,
      bairro: est.bairro ?? null,
      municipio: est.cidade?.nome ?? null,
      uf: est.estado?.sigla ?? null,
      qsa: (data.socios ?? []).map((s: Record<string, unknown>) => ({
        nome: (s.nome as string) ?? '',
        cpfMascarado: (s.cpf_cnpj_socio as string) ?? '',
        qualificacao: (s.qualificacao_socio as Record<string, string> | undefined)?.descricao ?? '',
      })),
    },
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ cnpj: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { cnpj } = await ctx.params
  const nums = cnpj.replace(/\D/g, '')

  if (nums.length !== 14) {
    return NextResponse.json({ erro: 'CNPJ inválido' }, { status: 400 })
  }

  try {
    let resultado = await buscarBrasilAPI(nums).catch((e): ResultadoBusca => {
      console.error('Erro BrasilAPI CNPJ:', e)
      return { ok: false, notFound: false }
    })
    const notFoundBrasilAPI = !resultado.ok && resultado.notFound

    if (!resultado.ok) {
      const fallback = await buscarCnpjWs(nums).catch((e): ResultadoBusca => {
        console.error('Erro CNPJ.ws (fallback):', e)
        return { ok: false, notFound: false }
      })
      resultado = fallback
    }

    if (!resultado.ok) {
      // Só é "não encontrado" de verdade se os dois provedores concordarem — caso
      // contrário é indisponibilidade temporária de um provedor (ex.: minhareceita.org).
      if (notFoundBrasilAPI && resultado.notFound) {
        return NextResponse.json({ erro: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
      }
      return NextResponse.json(
        { erro: 'Serviço de consulta à Receita Federal está temporariamente indisponível. Tente novamente em instantes ou use "Sem Validação".' },
        { status: 503 },
      )
    }

    const data = resultado.dados

    // Verifica se o cliente já existe no CertFlow
    const clienteExistente = await prisma.cliente.findUnique({
      where: { cnpj: nums },
      select: { id: true, nome: true, cpf: true, dataNascimento: true, email: true, celular: true, ddd: true, cep: true, logradouro: true, numero: true, complemento: true, bairro: true, cidade: true, estado: true, responsavel: true, pisNis: true },
    })

    return NextResponse.json({ ...data, clienteExistente })
  } catch (e) {
    console.error('Erro ao consultar CNPJ:', e)
    return NextResponse.json({ erro: 'Erro ao consultar Receita Federal' }, { status: 500 })
  }
}
