import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { enviarTelegram } from '@/lib/telegram'
import { calcularIndicadorCompleto } from '@/lib/performance/calcular'
import { gerarSugestoesIA } from '@/lib/performance/sugestoes-ia'

function autenticado(req: NextRequest): boolean {
  return req.headers.get('x-job-token') === process.env.AUTH_SECRET
}

// Queda de mais de 5 pontos no ICF entre uma execução e a próxima do robô
// dispara alerta automático — regra explícita do Vinicius (seção 5.1 do
// pedido do módulo de Performance).
const LIMITE_QUEDA_ALERTA = 5

export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const indicador = await calcularIndicadorCompleto()
  const { mes, ano, producao, qualidade, renovacao, icf } = indicador

  const anterior = await prisma.indicadorMensal.findUnique({ where: { mes_ano: { mes, ano } } })

  await prisma.indicadorMensal.upsert({
    where: { mes_ano: { mes, ano } },
    update: {
      producaoResultado: producao.resultado,
      producaoMeta: producao.meta,
      producaoPercentual: producao.percentual,
      qualidadePontuacao: qualidade.pontuacao,
      qualidadeOcorrencias: qualidade.ocorrencias,
      renovacaoTaxaContato: renovacao.taxaContato,
      renovacaoTaxaConversao: renovacao.taxaConversao,
      renovacaoPercentual: renovacao.percentual,
      icf,
      calculadoEm: new Date(),
    },
    create: {
      mes, ano,
      producaoResultado: producao.resultado,
      producaoMeta: producao.meta,
      producaoPercentual: producao.percentual,
      qualidadePontuacao: qualidade.pontuacao,
      qualidadeOcorrencias: qualidade.ocorrencias,
      renovacaoTaxaContato: renovacao.taxaContato,
      renovacaoTaxaConversao: renovacao.taxaConversao,
      renovacaoPercentual: renovacao.percentual,
      icf,
    },
  })

  let alertaEnviado = false
  if (anterior && anterior.icf - icf > LIMITE_QUEDA_ALERTA) {
    const resultado = await enviarTelegram(
      `Alerta CertFlow: o Índice CertFlow (ICF) caiu ${(anterior.icf - icf).toFixed(1)} pontos desde a última verificação (de ${anterior.icf} para ${icf}). Vale dar uma olhada no painel de Performance para entender o que mudou.`
    )
    alertaEnviado = resultado.ok
  }

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  await prisma.sugestaoIA.deleteMany({ where: { data: { gte: inicioHoje } } })

  const sugestoes = await gerarSugestoesIA(indicador)
  if (sugestoes.length > 0) {
    await prisma.sugestaoIA.createMany({
      data: sugestoes.map(texto => ({ texto })),
    })
  }

  await registrarHeartbeat('calcular-indicador-diario')

  return NextResponse.json({
    ok: true,
    icf,
    alertaEnviado,
    sugestoesGeradas: sugestoes.length,
    executadoEm: new Date().toISOString(),
  })
}
