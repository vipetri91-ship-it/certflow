import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  if (ids?.length) {
    await prisma.eventoWebhook.updateMany({ where: { id: { in: ids } }, data: { lido: true } })
  } else {
    await prisma.eventoWebhook.updateMany({ where: { lido: false }, data: { lido: true } })
  }

  return NextResponse.json({ ok: true })
}
