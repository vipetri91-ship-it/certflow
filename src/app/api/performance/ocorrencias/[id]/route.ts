import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { registrarAuditoria } from '@/lib/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const ocorrencia = await prisma.ocorrenciaQualidade.findUnique({ where: { id } })
  if (!ocorrencia) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 })

  await prisma.ocorrenciaQualidade.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'DELETE',
    entidade: 'OcorrenciaQualidade',
    entidadeId: id,
    dados: { tipo: ocorrencia.tipo },
  })

  return NextResponse.json({ ok: true })
}
