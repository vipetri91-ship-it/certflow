import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaUpdate = z.object({
  status: z.enum(['NOVA', 'EM_ANALISE', 'IMPLEMENTADA']),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const melhoria = await prisma.melhoriaContinua.update({
    where: { id },
    data: { status: parsed.data.status },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'MelhoriaContinua',
    entidadeId: id,
    dados: { status: parsed.data.status },
  })

  return NextResponse.json(melhoria)
}
