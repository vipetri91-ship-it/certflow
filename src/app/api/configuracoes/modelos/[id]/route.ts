import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome:            z.string().min(2).optional(),
  preco:           z.number().nonnegative().optional(),
  validadeMeses:   z.number().int().positive().optional(),
  ativo:           z.boolean().optional(),
  codigoSafeweb:   z.string().optional().nullable(),
  tipoPessoa:      z.enum(['PF', 'PJ']).optional(),
  tipoCertificado: z.enum(['A1', 'A3']).optional(),
  suporte:         z.enum(['ARQUIVO', 'CARTAO', 'TOKEN', 'NUVEM']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })
  }

  const modelo = await prisma.modeloCertificado.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(modelo)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  await prisma.modeloCertificado.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
