import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { destinatario, itens, formas, total } = await req.json()

  const orcamento = await prisma.orcamento.create({
    data: {
      destinatario: destinatario || 'Não informado',
      itens,
      formas,
      total,
      geradoPor: session.user.id,
    },
  })

  await registrarAuditoria({
    usuarioId:  session.user.id,
    acao:       'CREATE',
    entidade:   'Orcamento',
    entidadeId: orcamento.id,
    dados: {
      destinatario,
      total,
      itens: itens.map((i: { certificado: string; quantidade: number; valorUnit: number }) =>
        `${i.quantidade}x ${i.certificado} — R$ ${Number(i.quantidade * i.valorUnit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ).join(', '),
    },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ id: orcamento.id }, { status: 201 })
}