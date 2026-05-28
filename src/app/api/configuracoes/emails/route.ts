import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const templates = await prisma.templateEmail.findMany({ orderBy: { tipo: 'asc' } })
  return NextResponse.json(templates)
}
