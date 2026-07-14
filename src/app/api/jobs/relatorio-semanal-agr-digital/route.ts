import { NextRequest, NextResponse } from 'next/server'
import { enviarTelegram } from '@/lib/telegram'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { buscarRelatorioAgrDigital, formatarRelatorioAgrDigital } from '@/lib/relatorios/agr-digital'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

// Dispara toda segunda de manhã (ver scripts/cron-worker.js), cobrindo a
// semana anterior completa (segunda a domingo).
export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const semanaPassada = subWeeks(new Date(), 1)
  const inicio = startOfWeek(semanaPassada, { weekStartsOn: 1 })
  const fim = endOfWeek(semanaPassada, { weekStartsOn: 1 })

  const relatorio = await buscarRelatorioAgrDigital(inicio, fim)
  const texto = formatarRelatorioAgrDigital(relatorio)

  const envio = await enviarTelegram(texto)

  await registrarHeartbeat('relatorio-semanal-agr-digital')
  return NextResponse.json({ ok: envio.ok, relatorio, erro: envio.erro })
}
