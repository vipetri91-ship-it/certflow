import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const apenasPublicadas = searchParams.get('publicadas') === 'true'
  const categoria = searchParams.get('categoria')

  const where: Record<string, unknown> = {}
  if (apenasPublicadas) where.publicada = true
  if (categoria) where.categoria = categoria

  const noticias = await prisma.noticia.findMany({
    where,
    orderBy: [{ fixada: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(noticias)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { titulo, resumo, conteudo, categoria, publicada, fixada } = body

  if (!titulo?.trim() || !conteudo?.trim())
    return NextResponse.json({ erro: 'Título e conteúdo são obrigatórios' }, { status: 422 })

  const noticia = await prisma.noticia.create({
    data: {
      titulo: titulo.trim(),
      resumo: resumo?.trim() || null,
      conteudo: conteudo.trim(),
      categoria: categoria || 'Avisos',
      publicada: !!publicada,
      fixada: !!fixada,
      autorNome: session.user?.name || null,
    },
  })

  return NextResponse.json(noticia, { status: 201 })
}