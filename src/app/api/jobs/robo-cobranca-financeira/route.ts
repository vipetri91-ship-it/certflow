import { NextRequest, NextResponse } from 'next/server'
import { executarCobrancaVencidos } from '@/lib/financeiro/cobranca-vencidos'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const inicio = Date.now()
  const resultado = await executarCobrancaVencidos()
  const duracaoMs = Date.now() - inicio

  await registrarHeartbeat('robo-cobranca-financeira')

  return NextResponse.json({ ok: true, resultado, duracaoMs })
}
