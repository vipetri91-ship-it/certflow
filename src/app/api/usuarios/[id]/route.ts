import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schemaUpdate = z.object({
  nome:     z.string().min(2).optional(),
  username: z.string().min(3).regex(/^[a-z0-9._-]+$/).optional(),
  email:    z.string().email().optional().nullable(),
  senha:    z.string().min(8).optional(),
  role:     z.enum(['ADMIN', 'GERENTE', 'OPERADOR', 'FINANCEIRO', 'VISUALIZADOR']).optional(),
  ativo:    z.boolean().optional(),
  whatsapp: z.string().optional(),
  nomeAgrDs: z.string().optional(),
  unidade:  z.string().optional(),
  comissao: z.number().min(0).max(100).optional(),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'usuarios:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await ctx.params
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, username: true, email: true, role: true, ativo: true,
              whatsapp: true, nomeAgrDs: true, unidade: true, comissao: true, createdAt: true, updatedAt: true },
  })

  if (!usuario) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(usuario)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'usuarios:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const antigo = await prisma.usuario.findUnique({ where: { id } })
  if (!antigo) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  if (parsed.data.username && parsed.data.username !== antigo.username) {
    const existe = await prisma.usuario.findUnique({ where: { username: parsed.data.username } })
    if (existe) return NextResponse.json({ erro: 'Username já em uso' }, { status: 409 })
  }

  if (parsed.data.email && parsed.data.email !== antigo.email) {
    const existe = await prisma.usuario.findUnique({ where: { email: parsed.data.email } })
    if (existe) return NextResponse.json({ erro: 'E-mail já em uso' }, { status: 409 })
  }

  const { senha, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (senha) data.senha = await bcrypt.hash(senha, 12)

  const usuario = await prisma.usuario.update({
    where: { id },
    data,
    select: { id: true, nome: true, username: true, email: true, role: true, ativo: true, createdAt: true },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Usuario',
    entidadeId: id,
    dados: { nome: usuario.nome, role: usuario.role },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(usuario)
}