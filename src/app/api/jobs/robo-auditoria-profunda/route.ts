import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarTelegram } from '@/lib/telegram'
import { executarAuditoriaProfunda } from '@/lib/robo/auditoria-profunda'
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
  const { achados, correcoes } = await executarAuditoriaProfunda()
  const duracaoMs = Date.now() - inicio

  const status =
    achados.length === 0 ? 'OK' : correcoes.length > 0 ? 'CORRIGIDO_AUTOMATICAMENTE' : 'BLOQUEADO_AGUARDANDO_APROVACAO'

  await prisma.auditoriaRobo.create({
    data: { tipo: 'PROFUNDA', status, achados, correcoes, duracaoMs },
  })
  await registrarHeartbeat('robo-auditoria-profunda')

  const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const linhas = [`🤖 Robô CertFlow — auditoria profunda diária (${dataHoje})`, '']

  if (achados.length === 0 && correcoes.length === 0) {
    linhas.push('Tudo certo. Nenhum problema encontrado hoje.')
  } else {
    if (correcoes.length) {
      linhas.push('Corrigido automaticamente:')
      linhas.push(...correcoes.map((c) => `✅ ${c}`))
      linhas.push('')
    }
    if (achados.length) {
      linhas.push('Encontrado (aguardando você decidir):')
      linhas.push(...achados.map((a) => `⚠️ ${a}`))
    }
  }

  await enviarTelegram(linhas.join('\n'))

  return NextResponse.json({ ok: true, status, achados, correcoes, duracaoMs })
}
