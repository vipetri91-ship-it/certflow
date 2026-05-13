import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schemaUsuario = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  role: z.enum(['ADMIN', 'GERENTE', 'OPERADOR', 'FINANCEIRO', 'VISUALIZADOR']),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  if (!hasPermission(session.user.role, 'usuarios:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(usuarios)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  if (!hasPermission(session.user.role, 'usuarios:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schemaUsuario.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const existe = await prisma.usuario.findUnique({ where: { email: parsed.data.email } })
  if (existe) {
    return NextResponse.json({ erro: 'E-mail já cadastrado' }, { status: 409 })
  }

  const senhaHash = await bcrypt.hash(parsed.data.senha, 12)

  const usuario = await prisma.usuario.create({
    data: { ...parsed.data, senha: senhaHash },
    select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Usuario',
    entidadeId: usuario.id,
    dados: { nome: usuario.nome, role: usuario.role },
  })

  return NextResponse.json(usuario, { status: 201 })
}