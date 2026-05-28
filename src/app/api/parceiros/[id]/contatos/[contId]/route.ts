import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; contId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { contId } = await ctx.params
  await prisma.contatoParceiro.delete({ where: { id: contId } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
