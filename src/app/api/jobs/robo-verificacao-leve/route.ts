import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarTelegram } from '@/lib/telegram'
import { executarVerificacaoLeve } from '@/lib/robo/verificacao-leve'
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
  const { achados, achadosInformativos, correcoes } = await executarVerificacaoLeve()
  const duracaoMs = Date.now() - inicio

  const status = achados.length === 0 ? 'OK' : correcoes.length > 0 ? 'CORRIGIDO_AUTOMATICAMENTE' : 'ACHADOS_SEM_CORRECAO'

  // Investiga a causa raiz de cada achado real (não dos informativos, pra
  // controlar custo) — nunca bloqueia nem quebra o alerta original se falhar.
  const diagnosticos = achados.length > 0 ? await diagnosticarAchados(achados) : new Map()

  // achadosInformativos (pedidos travados) são gravados no banco mas NÃO disparam
  // Telegram — o relatório diário já os lista uma vez por dia, evitando spam.
  await prisma.auditoriaRobo.create({
    data: {
      tipo: 'LEVE',
      status,
      achados: [...achados.map(a => a.texto), ...achadosInformativos.map(a => a.texto)],
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
  await registrarHeartbeat('robo-verificacao-leve')

  if (achados.length > 0) {
    const linhas = [
      '🤖 Robô CertFlow — verificação leve encontrou algo:',
      ...achados.map((a) => {
        const diag = diagnosticos.get(a.chaveDedup)?.texto
        return diag ? `⚠️ ${a.texto}\n   🔎 ${diag}` : `⚠️ ${a.texto}`
      }),
      ...correcoes.map((c) => `✅ Corrigido: ${c}`),
    ]
    await enviarTelegram(linhas.join('\n'))
  }

  return NextResponse.json({ ok: true, status, achados, achadosInformativos, correcoes, duracaoMs })
}
