import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const cert = await prisma.certificado.findUnique({
    where: { id },
    include: { cliente: { select: { nome: true } }, modelo: { select: { nome: true } } },
  })

  if (!cert) return NextResponse.json({ erro: 'Certificado não encontrado' }, { status: 404 })
  if (cert.status === 'RENOVADO') return NextResponse.json({ erro: 'Já renovado' }, { status: 400 })

  await prisma.certificado.update({
    where: { id },
    data: { status: 'RENOVADO' },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Certificado',
    entidadeId: id,
    dados: { acao: 'renovado', cliente: cert.cliente.nome, modelo: cert.modelo.nome },
  })

  return NextResponse.json({ ok: true })
}
