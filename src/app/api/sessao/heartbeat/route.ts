import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false })

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  await prisma.sessaoAtividade.upsert({
    where:  { usuarioId_data: { usuarioId: session.user.id, data: hoje } },
    create: { usuarioId: session.user.id, data: hoje, minutosAtivos: 1 },
    update: { minutosAtivos: { increment: 1 } },
  })

  return NextResponse.json({ ok: true })
}
