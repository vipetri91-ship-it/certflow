import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { id: true, nome: true, email: true, role: true, avatar: true, createdAt: true },
  })

  if (!usuario) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(usuario)
}

const schema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(8).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { senha, avatar, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (senha) data.senha = await bcrypt.hash(senha, 12)
  if (avatar !== undefined) data.avatar = avatar || null

  const usuario = await prisma.usuario.update({
    where: { id: session.user.id },
    data,
    select: { id: true, nome: true, email: true, role: true, avatar: true },
  })

  return NextResponse.json(usuario)
}