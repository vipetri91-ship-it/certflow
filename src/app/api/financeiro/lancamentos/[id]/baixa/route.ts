import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'

const ROLES_PERMITIDOS = ['ADMIN', 'GERENTE', 'FINANCEIRO', 'OPERADOR_FINANCEIRO']

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

  // Contas a Pagar só pode ser baixada por ADMIN/GERENTE — sem isso, FINANCEIRO
  // e OPERADOR_FINANCEIRO (que só deveriam mexer em Contas a Receber)
  // conseguiriam marcar uma conta a pagar como paga por esta rota, mesmo sem
  // acesso à tela de Contas a Pagar.
  if (lancamento.tipo === 'PAGAR' && !['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão para dar baixa em Contas a Pagar' }, { status: 403 })
  }

  if (lancamento.status === 'PAGO') {
    return NextResponse.json({ erro: 'Lançamento já está pago' }, { status: 422 })
  }

  if (lancamento.status === 'CANCELADO') {
    return NextResponse.json({ erro: 'Não é possível dar baixa em lançamento cancelado' }, { status: 422 })
  }

  // Lê forma de pagamento do body (opcional)
  let formaPagamento: string | undefined
  try {
    const body = await req.json()
    formaPagamento = body.formaPagamento || undefined
  } catch {}

  const atualizado = await prisma.lancamento.update({
    where: { id },
    data: {
      status:         'PAGO',
      dataPagamento:  new Date(),
      ...(formaPagamento ? { formaPagamento } : {}),
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Lancamento',
    entidadeId: id,
    dados: { acao: 'baixa', descricao: lancamento.descricao, valor: String(lancamento.valor) },
  })

  return NextResponse.json(atualizado)
}
