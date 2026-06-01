import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const posts = await prisma.postSocial.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 30,
  })

  return NextResponse.json({ posts })
}
