import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const leads = await prisma.sSTLead.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const lead = await prisma.sSTLead.create({
    data: {
      nome:            body.nome?.trim(),
      empresa:         body.empresa?.trim() || null,
      cnpj:            body.cnpj?.trim() || null,
      telefone:        body.telefone?.trim() || null,
      email:           body.email?.trim() || null,
      funcionarios:    body.funcionarios ? Number(body.funcionarios) : null,
      laudos:          body.laudos || null,
      valorEstimado:   body.valorEstimado ? Number(body.valorEstimado) : null,
      parcelas:        body.parcelas ? Number(body.parcelas) : null,
      origem:          body.origem || null,
      etapa:           body.etapa || 'PROSPECCAO',
      observacoes:     body.observacoes?.trim() || null,
      responsavelNome: body.responsavelNome?.trim() || null,
    },
  })

  return NextResponse.json(lead, { status: 201 })
}
