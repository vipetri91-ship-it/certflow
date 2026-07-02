import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaParceiro = z.object({
  tipoPessoa: z.enum(['PF', 'PJ']),
  nome: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  tipo: z.string().min(1),
  segmento: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipoConta: z.string().optional(),
  chavePix: z.string().optional(),
  observacoes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ativo = searchParams.get('ativo') !== 'false'

  const parceiros = await prisma.parceiro.findMany({
    where: { ativo },
    include: {
      _count: { select: { clientes: true, pedidos: true } },
      comissoes: { include: { modelo: { select: { nome: true } } } },
    },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(parceiros)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schemaParceiro.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { email, cpf, cnpj, ...rest } = parsed.data

  if (cpf) {
    const existe = await prisma.parceiro.findUnique({ where: { cpf } })
    if (existe) return NextResponse.json({ erro: 'CPF já cadastrado' }, { status: 409 })
  }
  if (cnpj) {
    const existe = await prisma.parceiro.findUnique({ where: { cnpj } })
    if (existe) return NextResponse.json({ erro: 'CNPJ já cadastrado' }, { status: 409 })
  }

  const parceiro = await prisma.parceiro.create({
    data: { ...rest, email: email || undefined, cpf: cpf || undefined, cnpj: cnpj || undefined },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Parceiro',
    entidadeId: parceiro.id,
    dados: { nome: parceiro.nome, tipo: parceiro.tipo },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(parceiro, { status: 201 })
}