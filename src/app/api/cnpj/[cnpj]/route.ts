import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await ctx.params
  const nums = cnpj.replace(/\D/g, '')

  if (nums.length !== 14) {
    return NextResponse.json({ erro: 'CNPJ inválido' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${nums}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'CertFlow/1.0' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ erro: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
    }

    const data = await res.json()

    // Verifica se o cliente já existe no CertFlow
    const clienteExistente = await prisma.cliente.findUnique({
      where: { cnpj: nums },
      select: { id: true, nome: true, email: true, celular: true, ddd: true, cep: true, logradouro: true, numero: true, complemento: true, bairro: true, cidade: true, estado: true, responsavel: true, pisNis: true },
    })

    // Formata telefone: BrasilAPI devolve "1132341234" → "(11) 3234-1234" ou "(11) 93234-1234"
    const telRaw = (data.ddd_telefone_1 ?? '').replace(/\D/g, '')
    let telefone = ''
    if (telRaw.length === 11) {
      telefone = `(${telRaw.slice(0,2)}) ${telRaw.slice(2,7)}-${telRaw.slice(7)}`
    } else if (telRaw.length === 10) {
      telefone = `(${telRaw.slice(0,2)}) ${telRaw.slice(2,6)}-${telRaw.slice(6)}`
    }

    return NextResponse.json({
      cnpj: data.cnpj,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia,
      situacaoCadastral: data.descricao_situacao_cadastral,
      email: data.email || null,
      telefone: telefone || null,
      cep: data.cep?.replace(/\D/g, ''),
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      qsa: (data.qsa ?? []).map((s: Record<string, string>) => ({
        nome: s.nome_socio,
        cpfMascarado: s.cnpj_cpf_do_socio,
        qualificacao: s.qualificacao_socio,
      })),
      clienteExistente,
    })
  } catch (e) {
    console.error('Erro BrasilAPI CNPJ:', e)
    return NextResponse.json({ erro: 'Erro ao consultar Receita Federal' }, { status: 500 })
  }
}
