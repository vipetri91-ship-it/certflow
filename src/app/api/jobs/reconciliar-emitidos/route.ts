import { NextRequest, NextResponse } from 'next/server'
import { reconciliarEmitidos } from '@/lib/reconciliar-emitidos'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token') ?? req.nextUrl.searchParams.get('token')
  return token === process.env.AUTH_SECRET
}

export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const resultado = await reconciliarEmitidos()
  return NextResponse.json(resultado)
}

// GET para facilitar disparo manual no browser (admin)
export async function GET(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const resultado = await reconciliarEmitidos()
  return NextResponse.json(resultado)
}