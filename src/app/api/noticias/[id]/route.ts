import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const noticia = await prisma.noticia.findUnique({ where: { id } })
  if (!noticia) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 })
  return NextResponse.json(noticia)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const noticia = await prisma.noticia.update({
    where: { id },
    data: {
      ...(body.titulo    !== undefined && { titulo:    body.titulo.trim() }),
      ...(body.resumo    !== undefined && { resumo:    body.resumo?.trim() || null }),
      ...(body.conteudo  !== undefined && { conteudo:  body.conteudo.trim() }),
      ...(body.categoria !== undefined && { categoria: body.categoria }),
      ...(body.publicada !== undefined && { publicada: body.publicada }),
      ...(body.fixada    !== undefined && { fixada:    body.fixada }),
    },
  })

  return NextResponse.json(noticia)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await prisma.noticia.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}