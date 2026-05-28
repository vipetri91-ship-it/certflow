import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()

  if (!body.nome?.trim()) {
    return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })
  }

  const contato = await prisma.contatoParceiro.create({
    data: {
      parceiroId:     id,
      nome:           body.nome.trim(),
      cpf:            body.cpf       || null,
      cargo:          body.cargo     || null,
      dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null,
      telefone:       body.telefone  || null,
      email:          body.email     || null,
    },
  })
  return NextResponse.json(contato, { status: 201 })
}
