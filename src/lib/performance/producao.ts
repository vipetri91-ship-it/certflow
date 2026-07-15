import { prisma } from '@/lib/prisma'

export type StatusIndicador = 'excelente' | 'atencao' | 'abaixo'

// Régua de pontuação definida pelo Vinicius: até 249 certificados = 0%,
// 250-299 = 70%, 300-349 = 90%, 350 ou mais = 100%.
export function calcularPontuacaoProducao(resultado: number): number {
  if (resultado >= 350) return 100
  if (resultado >= 300) return 90
  if (resultado >= 250) return 70
  return 0
}

export function classificarProducao(pontuacao: number): StatusIndicador {
  if (pontuacao >= 90) return 'excelente'
  if (pontuacao >= 70) return 'atencao'
  return 'abaixo'
}

// Conta certificados emitidos dentro do período (por Pedido.emitidoEm, não
// createdAt) — decisão deliberada: "produção do mês" mede o que foi de fato
// emitido naquele mês, diferente do widget de "vendas" do dashboard atual,
// que conta pedidos CRIADOS no mês (independente de quando emitiram). Mesmo
// filtro canônico de "conta pra métricas" usado no resto do projeto:
// status != CANCELADO e ignorarMetricasVendas: false.
export async function buscarProducaoMes(inicio: Date, fim: Date): Promise<number> {
  return prisma.pedido.count({
    where: {
      emitidoEm: { gte: inicio, lte: fim },
      status: { not: 'CANCELADO' },
      ignorarMetricasVendas: false,
    },
  })
}

export function calcularMediaDiariaNecessaria(resultadoAtual: number, meta: number, diasRestantes: number): number {
  const faltam = Math.max(0, meta - resultadoAtual)
  if (diasRestantes <= 0) return faltam
  return faltam / diasRestantes
}

export function calcularPrevisaoFechamento(resultadoAtual: number, diaAtual: number, diasNoMes: number): number {
  if (diaAtual <= 0) return resultadoAtual
  const mediaDiariaAtual = resultadoAtual / diaAtual
  return Math.round(mediaDiariaAtual * diasNoMes)
}
