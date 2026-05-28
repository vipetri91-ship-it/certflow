import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { z } from 'zod'

const schemaUpdate = z.object({
  assunto: z.string().min(1).optional(),
  corpo: z.string().min(1).optional(),
  ativo: z.boolean().optional(),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tipo: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { tipo } = await ctx.params
  const template = await prisma.templateEmail.findUnique({ where: { tipo: tipo as any } })
  if (!template) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ tipo: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'configuracoes:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { tipo } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })
  }

  const template = await prisma.templateEmail.upsert({
    where: { tipo: tipo as any },
    update: parsed.data,
    create: {
      tipo: tipo as any,
      assunto: parsed.data.assunto ?? '',
      corpo: parsed.data.corpo ?? '',
      ativo: parsed.data.ativo ?? false,
    },
  })

  return NextResponse.json(template)
}
