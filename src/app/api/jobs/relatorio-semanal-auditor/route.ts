import { NextRequest, NextResponse } from 'next/server'
import { enviarTelegram } from '@/lib/telegram'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { buscarRelatorioAuditor, formatarRelatorioAuditor } from '@/lib/relatorios/auditor'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

// Dispara toda segunda de manhã, cobrindo a semana anterior (segunda a domingo).
export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const semanaPassada = subWeeks(new Date(), 1)
  const inicio = startOfWeek(semanaPassada, { weekStartsOn: 1 })
  const fim = endOfWeek(semanaPassada, { weekStartsOn: 1 })

  const relatorio = await buscarRelatorioAuditor(inicio, fim)
  const texto = formatarRelatorioAuditor(relatorio)
  const envio = await enviarTelegram(texto)

  await registrarHeartbeat('relatorio-semanal-auditor')
  return NextResponse.json({ ok: envio.ok, relatorio, erro: envio.erro })
}
