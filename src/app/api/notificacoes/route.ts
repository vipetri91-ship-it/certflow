import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mes  = Number(searchParams.get('mes')  ?? new Date().getMonth() + 1)
  const ano  = Number(searchParams.get('ano')  ?? new Date().getFullYear())
  const busca = searchParams.get('busca') ?? ''

  const inicio = new Date(ano, mes - 1, 1)
  const fim    = new Date(ano, mes, 0, 23, 59, 59, 999)

  const registros = await prisma.historicoContato.findMany({
    where: {
      dataContato: { gte: inicio, lte: fim },
      ...(busca ? {
        OR: [
          { observacao:    { contains: busca, mode: 'insensitive' } },
          { cliente: { nome: { contains: busca, mode: 'insensitive' } } },
          { cliente: { razaoSocial: { contains: busca, mode: 'insensitive' } } },
          { usuario: { nome: { contains: busca, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    include: {
      cliente:  { select: { id: true, nome: true, razaoSocial: true, cpf: true, cnpj: true } },
      usuario:  { select: { nome: true } },
    },
    orderBy: { dataContato: 'desc' },
    take: 200,
  })

  return NextResponse.json(registros)
}
