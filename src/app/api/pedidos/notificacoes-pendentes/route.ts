import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { deriveAgr } from '@/lib/utils'

// Pedidos do AGR logado que acabaram de ser emitidos (via webhook ou manualmente)
// e ainda não tiveram o popup de notificação visto — usado para reabrir
// automaticamente o popup "Certificado Emitido!" quando o AGR volta ao sistema.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const meuAgr = deriveAgr(session.user.name ?? session.user.email ?? '')

  const pedido = await prisma.pedido.findFirst({
    where: { agr: meuAgr, status: 'EMITIDO', popupNotificacaoVisto: false },
    orderBy: { emitidoEm: 'asc' },
    select: { id: true },
  })

  return NextResponse.json({ pedidoId: pedido?.id ?? null })
}