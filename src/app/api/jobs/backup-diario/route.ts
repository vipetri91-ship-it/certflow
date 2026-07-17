import { NextRequest, NextResponse } from 'next/server'
import { executarBackupDiario } from '@/lib/backup'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { enviarTelegram } from '@/lib/telegram'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const resultado = await executarBackupDiario()
  await registrarHeartbeat('backup-diario')

  if (!resultado.ok) {
    await enviarTelegram(`🚨 Backup diário do CertFlow FALHOU: ${resultado.erro}`)
  } else {
    console.log(`[Backup] ${resultado.tabelas} tabelas, ${resultado.totalLinhas} linhas, ${resultado.tamanhoBytes} bytes, ${resultado.removidos} backup(s) antigo(s) removido(s)`)
  }

  return NextResponse.json(resultado)
}
