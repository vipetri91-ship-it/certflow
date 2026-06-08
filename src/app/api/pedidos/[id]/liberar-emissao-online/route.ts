export const preferredRegion = 'gru1'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { liberarEmissaoOnline } from '@/lib/safeweb'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    select: { safewebProtocolo: true, numeroCompra: true, tipoAtendimento: true, status: true },
  })

  if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })
  if (pedido.tipoAtendimento !== 'emissao-online') {
    return NextResponse.json({ erro: 'Pedido não é do tipo emissão online' }, { status: 400 })
  }

  const protocolo = pedido.safewebProtocolo ?? pedido.numeroCompra
  if (!protocolo) return NextResponse.json({ erro: 'Protocolo não encontrado no pedido' }, { status: 400 })

  const resultado = await liberarEmissaoOnline(protocolo)
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro ?? 'Falha na liberação' }, { status: 502 })
  }

  // Avança para VERIFICADO localmente enquanto aguarda o webhook de emissão da Safeweb
  await prisma.pedido.update({
    where: { id },
    data: { status: 'VERIFICADO', verificadoEm: new Date() } as any,
  })

  return NextResponse.json({ ok: true })
}
