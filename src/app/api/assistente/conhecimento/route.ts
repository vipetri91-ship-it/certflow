import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CHAVE = 'assistente_conhecimento'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const config = await prisma.configuracao.findUnique({ where: { chave: CHAVE } })
  return NextResponse.json({ conhecimento: config?.valor || '' })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { conhecimento } = await req.json()
  if (typeof conhecimento !== 'string') {
    return NextResponse.json({ erro: 'Conteúdo inválido' }, { status: 422 })
  }

  await prisma.configuracao.upsert({
    where:  { chave: CHAVE },
    update: { valor: conhecimento },
    create: { chave: CHAVE, valor: conhecimento },
  })

  return NextResponse.json({ ok: true })
}
