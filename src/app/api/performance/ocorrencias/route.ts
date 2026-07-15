import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaOcorrencia = z.object({
  tipo: z.enum(['ERRO_PEQUENO', 'RETRABALHO', 'ERRO_GRAVE', 'REVOGACAO']),
  descricao: z.string().min(3, 'Descreva o que aconteceu'),
  observacao: z.string().optional(),
  usuarioId: z.string().optional(),
  data: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const mes = Number(searchParams.get('mes')) || new Date().getMonth() + 1
  const ano = Number(searchParams.get('ano')) || new Date().getFullYear()
  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 1)

  const ocorrencias = await prisma.ocorrenciaQualidade.findMany({
    where: { data: { gte: inicio, lt: fim } },
    orderBy: { data: 'desc' },
    include: {
      usuario: { select: { nome: true } },
      registradoPor: { select: { nome: true } },
    },
  })

  return NextResponse.json(ocorrencias)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schemaOcorrencia.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { tipo, descricao, observacao, usuarioId, data } = parsed.data

  const ocorrencia = await prisma.ocorrenciaQualidade.create({
    data: {
      tipo,
      descricao,
      observacao: observacao || undefined,
      usuarioId: usuarioId || undefined,
      registradoPorId: session.user.id,
      data: data ? new Date(data) : undefined,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'OcorrenciaQualidade',
    entidadeId: ocorrencia.id,
    dados: { tipo, usuarioId },
  })

  return NextResponse.json(ocorrencia, { status: 201 })
}
