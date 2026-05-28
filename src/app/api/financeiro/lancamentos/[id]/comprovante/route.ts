import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  comprovante: z.string().url('URL inválida'),
})

const ROLES_PERMITIDOS = ['ADMIN', 'GERENTE', 'FINANCEIRO']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  if (!ROLES_PERMITIDOS.includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params

  const lancamento = await prisma.lancamento.findUnique({ where: { id } })
  if (!lancamento) {
    return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
  }

  if (lancamento.tipo !== 'PAGAR') {
    return NextResponse.json(
      { erro: 'Comprovante só pode ser anexado em Contas a Pagar' },
      { status: 422 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erro: 'Dados inválidos', detalhes: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const atualizado = await prisma.lancamento.update({
    where: { id },
    data: { comprovante: parsed.data.comprovante },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Lancamento',
    entidadeId: id,
    dados: { campo: 'comprovante', descricao: lancamento.descricao },
  })

  return NextResponse.json(atualizado)
}
