import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ erro: 'Apenas administradores podem excluir certificados' }, { status: 403 })

  const { id } = await ctx.params
  const cert = await prisma.certificado.findUnique({ where: { id } })
  if (!cert) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  await prisma.certificado.delete({ where: { id } })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'DELETE',
    entidade: 'Certificado',
    entidadeId: id,
    ip: _req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()

  const cert = await prisma.certificado.findUnique({ where: { id } })
  if (!cert) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const { status, observacao, modeloId, dataEmissao, dataVencimento, numeroSerie, valorFinal } = body

  const statusValidos = ['ATIVO', 'VENCIDO', 'CANCELADO', 'RENOVADO', 'NAO_RENOVADO']
  if (status && !statusValidos.includes(status)) {
    return NextResponse.json({ erro: 'Status inválido' }, { status: 422 })
  }

  const dadosAtualizacao: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(modeloId ? { modeloId } : {}),
    ...(dataEmissao ? { dataEmissao: new Date(dataEmissao) } : {}),
    ...(dataVencimento ? { dataVencimento: new Date(dataVencimento) } : {}),
    ...(numeroSerie !== undefined ? { numeroSerie: numeroSerie || null } : {}),
    ...(valorFinal !== undefined ? { valorManual: valorFinal === null ? null : Number(valorFinal) } : {}),
  }

  // Marcar como não renovado grava o motivo no próprio certificado — é o
  // que alimenta o tooltip na tela de cliente e a aba "Não Renovados" em
  // /renovacoes (ambos leem Certificado.status/motivoNaoRenovacao).
  if (status === 'NAO_RENOVADO') {
    dadosAtualizacao.motivoNaoRenovacao = observacao?.trim() || 'Marcado como Não Renovado.'
    dadosAtualizacao.naoRenovadoEm = new Date()
    dadosAtualizacao.naoRenovadoPorId = session.user.id
  }

  const atualizado = await prisma.certificado.update({
    where: { id },
    data: dadosAtualizacao,
  })

  // Registra nota no histórico se fornecida
  if (observacao?.trim()) {
    await prisma.historicoContato.create({
      data: {
        clienteId:     cert.clienteId,
        certificadoId: id,
        usuarioId:     session.user.id,
        observacao:    observacao.trim(),
      },
    })
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Certificado',
    entidadeId: id,
    dados: { antes: cert, depois: atualizado },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
