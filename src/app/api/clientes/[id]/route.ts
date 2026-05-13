import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaUpdate = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  celular: z.string().optional(),
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
  parceiroId: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      parceiro: { select: { id: true, nome: true } },
      certificados: {
        include: { modelo: true },
        orderBy: { dataVencimento: 'desc' },
      },
      pedidos: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!cliente) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  return NextResponse.json(cliente)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { dataNascimento, ...rest } = parsed.data

  const antigo = await prisma.cliente.findUnique({ where: { id } })
  if (!antigo) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      ...rest,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Cliente',
    entidadeId: id,
    dados: { antes: antigo, depois: cliente },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(cliente)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  await prisma.cliente.update({ where: { id }, data: { ativo: false } })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'DELETE',
    entidade: 'Cliente',
    entidadeId: id,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}