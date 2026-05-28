import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome:            z.string().min(2),
  tipoPessoa:      z.enum(['PF', 'PJ']),
  tipoCertificado: z.enum(['A1', 'A3']),
  suporte:         z.enum(['ARQUIVO', 'CARTAO', 'TOKEN', 'NUVEM']),
  validadeMeses:   z.number().int().positive(),
  preco:           z.number().nonnegative(),
  codigoSafeweb:   z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const modelos = await prisma.modeloCertificado.findMany({
    orderBy: [{ tipoPessoa: 'asc' }, { suporte: 'asc' }, { validadeMeses: 'asc' }],
  })

  return NextResponse.json({ modelos })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const modelo = await prisma.modeloCertificado.create({
    data: { ...parsed.data, ativo: true },
  })

  return NextResponse.json(modelo, { status: 201 })
}
