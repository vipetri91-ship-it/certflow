import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { status } = await req.json()

  const post = await prisma.postSocial.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json(post)
}
