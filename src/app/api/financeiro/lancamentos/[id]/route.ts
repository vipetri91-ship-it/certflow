import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaEdicao = z.object({
  descricao:     z.string().min(2).optional(),
  valor:         z.number().positive().optional(),
  dataVencimento: z.string().optional(),
  dataPagamento:  z.string().optional().nullable(),
  status:        z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']).optional(),
  categoriaId:   z.string().optional().nullable(),
  parceiroId:    z.string().optional().nullable(),
  comprovante:   z.string().optional().nullable(),
  notaFiscal:    z.string().optional().nullable(),
  boleto:        z.string().optional().nullable(),
  observacoes:   z.string().optional().nullable(),
  referencia:    z.string().optional().nullable(),
  tipoConta:     z.string().optional().nullable(),
  centroCusto:   z.string().optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
  banco:         z.string().optional().nullable(),
})

// FINANCEIRO só pode editar campos relacionados ao recebimento
const CAMPOS_FINANCEIRO = new Set(['valor', 'formaPagamento', 'dataPagamento', 'status', 'comprovante'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const role = session.user.role
  const rolesPermitidos = ['ADMIN', 'GERENTE', 'FINANCEIRO']
  if (!rolesPermitidos.includes(role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const lancamento = await prisma.lancamento.findUnique({ where: { id } })
  if (!lancamento) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })

  // FINANCEIRO: só pode editar campos de recebimento em lançamentos RECEBER
  if (role === 'FINANCEIRO') {
    if (lancamento.tipo !== 'RECEBER') {
      return NextResponse.json({ erro: 'Sem permissão para editar este lançamento' }, { status: 403 })
    }
  }

  const body   = await req.json()
  const parsed = schemaEdicao.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  // Filtrar campos permitidos para FINANCEIRO
  let dados: Record<string, unknown> = { ...parsed.data }
  if (role === 'FINANCEIRO') {
    dados = Object.fromEntries(
      Object.entries(dados).filter(([k]) => CAMPOS_FINANCEIRO.has(k))
    )
  }

  if (dados.dataVencimento) dados.dataVencimento = new Date(dados.dataVencimento as string)
  if (dados.dataPagamento)  dados.dataPagamento  = new Date(dados.dataPagamento as string)
  if (dados.dataPagamento === null) dados.dataPagamento = null

  const atualizado = await prisma.lancamento.update({ where: { id }, data: dados })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao:      'UPDATE',
    entidade:  'Lancamento',
    entidadeId: id,
    dados:     { campos: Object.keys(dados) },
  })

  return NextResponse.json(atualizado)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const lancamento = await prisma.lancamento.findUnique({ where: { id } })
  if (!lancamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  await prisma.lancamento.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao:      'DELETE',
    entidade:  'Lancamento',
    entidadeId: id,
    dados:     { descricao: lancamento.descricao },
  })

  return NextResponse.json({ ok: true })
}
