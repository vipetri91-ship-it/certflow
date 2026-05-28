import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const lead = await prisma.sSTLead.update({
    where: { id },
    data: {
      ...(body.nome            !== undefined && { nome:            body.nome.trim() }),
      ...(body.empresa         !== undefined && { empresa:         body.empresa?.trim() || null }),
      ...(body.cnpj            !== undefined && { cnpj:            body.cnpj?.trim() || null }),
      ...(body.telefone        !== undefined && { telefone:        body.telefone?.trim() || null }),
      ...(body.email           !== undefined && { email:           body.email?.trim() || null }),
      ...(body.funcionarios    !== undefined && { funcionarios:    body.funcionarios ? Number(body.funcionarios) : null }),
      ...(body.laudos          !== undefined && { laudos:          body.laudos || null }),
      ...(body.valorEstimado   !== undefined && { valorEstimado:   body.valorEstimado ? Number(body.valorEstimado) : null }),
      ...(body.parcelas        !== undefined && { parcelas:        body.parcelas ? Number(body.parcelas) : null }),
      ...(body.origem          !== undefined && { origem:          body.origem || null }),
      ...(body.etapa           !== undefined && { etapa:           body.etapa }),
      ...(body.observacoes     !== undefined && { observacoes:     body.observacoes?.trim() || null }),
      ...(body.responsavelNome !== undefined && { responsavelNome: body.responsavelNome?.trim() || null }),
      updatedAt: new Date(),
    },
  })

  return NextResponse.json(lead)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await prisma.sSTLead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
