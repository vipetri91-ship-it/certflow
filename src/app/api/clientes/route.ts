import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaCliente = z.object({
  tipoPessoa: z.enum(['PF', 'PJ']),
  nome: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  responsavel: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  observacoes: z.string().optional(),
  parceiroId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const tipo = searchParams.get('tipo')
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)

  const where = {
    ativo: true,
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { cpf: { contains: q } },
            { cnpj: { contains: q } },
          ],
        }
      : {}),
    ...(tipo ? { tipoPessoa: tipo as 'PF' | 'PJ' } : {}),
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { parceiro: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cliente.count({ where }),
  ])

  return NextResponse.json({ clientes, total, page, totalPaginas: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schemaCliente.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { dataNascimento, ...rest } = parsed.data

  const cliente = await prisma.cliente.create({
    data: {
      ...rest,
      email: rest.email || null,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Cliente',
    entidadeId: cliente.id,
    dados: { nome: cliente.nome },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(cliente, { status: 201 })
}