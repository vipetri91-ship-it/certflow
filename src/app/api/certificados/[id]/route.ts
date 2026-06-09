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

  const { status, observacao } = body

  const statusValidos = ['ATIVO', 'VENCIDO', 'CANCELADO', 'RENOVADO']
  if (status && !statusValidos.includes(status)) {
    return NextResponse.json({ erro: 'Status inválido' }, { status: 422 })
  }

  const atualizado = await prisma.certificado.update({
    where: { id },
    data: { ...(status ? { status } : {}) },
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
