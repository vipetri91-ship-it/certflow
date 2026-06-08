export const preferredRegion = 'gru1'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pedidos/buscar-serie-a3?protocolo=XXX
// Retorna safewebSerieA3 de um pedido anterior com esse protocolo (para auto-preencher o campo)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ found: false }, { status: 401 })

  const protocolo = req.nextUrl.searchParams.get('protocolo')?.trim()
  if (!protocolo) return NextResponse.json({ found: false })

  const pedido = await prisma.pedido.findFirst({
    where: {
      OR: [
        { safewebProtocolo: protocolo },
        { numeroCompra: protocolo },
      ],
      NOT: { safewebSerieA3: null },
    },
    select: { safewebSerieA3: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!pedido?.safewebSerieA3) return NextResponse.json({ found: false })
  return NextResponse.json({ found: true, safewebSerieA3: pedido.safewebSerieA3 })
}
