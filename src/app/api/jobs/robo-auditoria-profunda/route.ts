import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarTelegram } from '@/lib/telegram'
import { executarAuditoriaProfunda } from '@/lib/robo/auditoria-profunda'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { diagnosticarAchados } from '@/lib/robo/diagnostico'

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

  const diagnosticos = achados.length > 0 ? await diagnosticarAchados(achados) : new Map()

  await prisma.auditoriaRobo.create({
    data: {
      tipo: 'PROFUNDA',
      status,
      achados: achados.map(a => a.texto),
      correcoes,
      diagnosticos: achados
        .filter(a => diagnosticos.get(a.chaveDedup)?.texto)
        .map(a => ({
          chaveDedup: a.chaveDedup,
          categoria: a.categoria,
          texto: diagnosticos.get(a.chaveDedup)!.texto,
          deCache: diagnosticos.get(a.chaveDedup)!.deCache,
        })),
      duracaoMs,
    },
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
      linhas.push(...achados.map((a) => {
        const diag = diagnosticos.get(a.chaveDedup)?.texto
        return diag ? `⚠️ ${a.texto}\n   🔎 ${diag}` : `⚠️ ${a.texto}`
      }))
    }
  }

  await enviarTelegram(linhas.join('\n'))

  return NextResponse.json({ ok: true, status, achados, correcoes, duracaoMs })
}
