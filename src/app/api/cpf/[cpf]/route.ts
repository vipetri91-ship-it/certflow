import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ReceitaWS CPF endpoint: GET /v1/cpf/{cpf}/{DDMMYYYY}
// Requer RECEITAWS_TOKEN no .env

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ cpf: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { cpf } = await ctx.params
  const cpfNums = cpf.replace(/\D/g, '')
  if (cpfNums.length !== 11) {
    return NextResponse.json({ erro: 'CPF inválido' }, { status: 400 })
  }

  // data de nascimento via query: ?nascimento=1996-05-14 (YYYY-MM-DD)
  const nascimentoIso = req.nextUrl.searchParams.get('nascimento') ?? ''
  const nascimentoFmt = nascimentoIso
    ? nascimentoIso.split('-').reverse().join('') // YYYY-MM-DD → DDMMYYYY
    : ''

  const token = process.env.RECEITAWS_TOKEN

  // Busca no nosso banco primeiro
  const clienteDb = await prisma.cliente.findUnique({
    where: { cpf: cpfNums },
    select: { id: true, nome: true, email: true, ddd: true, celular: true, dataNascimento: true, pisNis: true, cep: true, logradouro: true, numero: true, bairro: true, cidade: true, estado: true },
  })

  // Se não tiver token configurado, retorna só o que temos no banco
  if (!token) {
    return NextResponse.json({
      fonte: 'banco',
      nome: clienteDb?.nome ?? null,
      situacao: null,
      clienteExistente: clienteDb ?? null,
    })
  }

  // Consulta ReceitaWS
  if (!nascimentoFmt) {
    return NextResponse.json({ erro: 'Data de nascimento obrigatória para consultar CPF na RFB' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://www.receitaws.com.br/v1/cpf/${cpfNums}/${nascimentoFmt}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      },
    )

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data.status === 'ERROR' || data.message) {
      // Falhou na RFB mas temos dados no banco — retorna o banco como fallback
      if (clienteDb) {
        return NextResponse.json({
          fonte: 'banco',
          nome: clienteDb.nome,
          situacao: null,
          clienteExistente: clienteDb,
        })
      }
      return NextResponse.json(
        { erro: data.message ?? data.mensagem ?? 'CPF não encontrado na Receita Federal' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      fonte: 'rfb',
      nome: data.nome ?? null,
      situacao: data.situacao ?? null,
      dataNascimento: data.data_nascimento ?? null,
      clienteExistente: clienteDb ?? null,
    })
  } catch {
    // Timeout ou erro de rede — fallback para o banco
    if (clienteDb) {
      return NextResponse.json({ fonte: 'banco', nome: clienteDb.nome, situacao: null, clienteExistente: clienteDb })
    }
    return NextResponse.json({ erro: 'Erro ao consultar a Receita Federal' }, { status: 502 })
  }
}
