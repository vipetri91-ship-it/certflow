import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PERMISSOES_PADRAO } from '@/lib/permissoes-estrutura'

const ROLES_VALIDOS = ['ADMIN', 'GERENTE', 'OPERADOR', 'FINANCEIRO', 'VISUALIZADOR', 'OPERADOR_FINANCEIRO']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')?.toUpperCase()

  if (!role || !ROLES_VALIDOS.includes(role)) {
    return NextResponse.json({ erro: 'Role inválido' }, { status: 400 })
  }

  const chave = `permissoes_${role}`
  const config = await prisma.configuracao.findUnique({ where: { chave } })

  let permissoes: Record<string, boolean>
  if (config?.valor) {
    try {
      permissoes = JSON.parse(config.valor)
    } catch {
      permissoes = PERMISSOES_PADRAO[role] ?? {}
    }
  } else {
    // Inicializa com os padrões se não existir
    permissoes = PERMISSOES_PADRAO[role] ?? {}
    await prisma.configuracao.upsert({
      where: { chave },
      update: { valor: JSON.stringify(permissoes) },
      create: { chave, valor: JSON.stringify(permissoes) },
    })
  }

  return NextResponse.json({ role, permissoes })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { role, permissoes } = body

  if (!role || !ROLES_VALIDOS.includes(role.toUpperCase())) {
    return NextResponse.json({ erro: 'Role inválido' }, { status: 400 })
  }

  const chave = `permissoes_${role.toUpperCase()}`
  await prisma.configuracao.upsert({
    where: { chave },
    update: { valor: JSON.stringify(permissoes) },
    create: { chave, valor: JSON.stringify(permissoes) },
  })

  return NextResponse.json({ ok: true })
}
