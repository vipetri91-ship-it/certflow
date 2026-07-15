import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { registrarAuditoria } from '@/lib/audit'
import { listarMetas, definirMeta } from '@/lib/performance/metas'
import { z } from 'zod'

const schemaMeta = z.object({
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2020).max(2100),
  metaProducao: z.number().int().min(1),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const metas = await listarMetas()
  return NextResponse.json(metas)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schemaMeta.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { mes, ano, metaProducao } = parsed.data
  const meta = await definirMeta(mes, ano, metaProducao)

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'MetaPerformance',
    entidadeId: meta.id,
    dados: { mes, ano, metaProducao },
  })

  return NextResponse.json(meta, { status: 201 })
}
