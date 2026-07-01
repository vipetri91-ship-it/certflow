import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ total: 0 })

  const total = await prisma.eventoWebhook.count({ where: { lido: false } })
  return NextResponse.json({ total })
}
