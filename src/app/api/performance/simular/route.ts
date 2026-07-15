import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { calcularPontuacaoProducao, classificarProducao } from '@/lib/performance/producao'
import { calcularPontuacaoQualidade, classificarQualidade } from '@/lib/performance/qualidade-shared'
import { calcularPercentualRenovacao, classificarRenovacao } from '@/lib/performance/renovacao'
import { calcularICF, classificarICF } from '@/lib/performance/icf'
import { z } from 'zod'

const schemaSimulacao = z.object({
  producaoResultado: z.number().min(0).max(10000),
  qualidadeErroPequeno: z.number().int().min(0).max(500).default(0),
  qualidadeRetrabalho: z.number().int().min(0).max(500).default(0),
  qualidadeErroGrave: z.number().int().min(0).max(500).default(0),
  qualidadeRevogacao: z.boolean().default(false),
  renovacaoTaxaContato: z.number().min(0).max(100),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schemaSimulacao.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { producaoResultado, qualidadeErroPequeno, qualidadeRetrabalho, qualidadeErroGrave, qualidadeRevogacao, renovacaoTaxaContato } = parsed.data

  const ocorrenciasSimuladas = [
    ...Array(qualidadeErroPequeno).fill({ tipo: 'ERRO_PEQUENO' as const }),
    ...Array(qualidadeRetrabalho).fill({ tipo: 'RETRABALHO' as const }),
    ...Array(qualidadeErroGrave).fill({ tipo: 'ERRO_GRAVE' as const }),
    ...(qualidadeRevogacao ? [{ tipo: 'REVOGACAO' as const }] : []),
  ]

  const pontuacaoProducao = calcularPontuacaoProducao(producaoResultado)
  const pontuacaoQualidade = calcularPontuacaoQualidade(ocorrenciasSimuladas)
  const percentualRenovacao = calcularPercentualRenovacao({
    clientesVencendo30: 0, clientesContactados: 0, clientesPendentes: 0,
    taxaContato: renovacaoTaxaContato, taxaConversao: renovacaoTaxaContato,
  })

  const icf = calcularICF(pontuacaoProducao, pontuacaoQualidade, percentualRenovacao)

  return NextResponse.json({
    producao: { pontuacao: pontuacaoProducao, status: classificarProducao(pontuacaoProducao) },
    qualidade: { pontuacao: pontuacaoQualidade, status: classificarQualidade(pontuacaoQualidade) },
    renovacao: { percentual: percentualRenovacao, status: classificarRenovacao(percentualRenovacao) },
    icf,
    classificacao: classificarICF(icf),
  })
}
