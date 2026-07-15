import { prisma } from '@/lib/prisma'

export interface ClassificacaoICF {
  emoji: string
  label: string
  cor: 'verde' | 'azul' | 'amarelo' | 'laranja' | 'vermelho'
}

// Pesos fixos definidos pelo Vinicius: Produção 40% + Qualidade 40% + Renovação 20%.
export const PESO_PRODUCAO = 0.4
export const PESO_QUALIDADE = 0.4
export const PESO_RENOVACAO = 0.2

export function calcularICF(producaoPct: number, qualidadePct: number, renovacaoPct: number): number {
  const nota = producaoPct * PESO_PRODUCAO + qualidadePct * PESO_QUALIDADE + renovacaoPct * PESO_RENOVACAO
  return Math.round(nota * 10) / 10
}

export function classificarICF(icf: number): ClassificacaoICF {
  if (icf >= 95) return { emoji: '🟢', label: 'Operação Excelente', cor: 'verde' }
  if (icf >= 90) return { emoji: '🟢', label: 'Operação Muito Boa', cor: 'verde' }
  if (icf >= 80) return { emoji: '🔵', label: 'Operação Estável', cor: 'azul' }
  if (icf >= 70) return { emoji: '🟡', label: 'Atenção', cor: 'amarelo' }
  if (icf >= 60) return { emoji: '🟠', label: 'Estado de Alerta', cor: 'laranja' }
  return { emoji: '🔴', label: 'Ação Imediata', cor: 'vermelho' }
}

export interface TendenciaICF {
  icfMesAnterior: number | null
  evolucao: number | null
  media3Meses: number | null
  media6Meses: number | null
  melhorHistorico: { mes: number; ano: number; icf: number } | null
  piorHistorico: { mes: number; ano: number; icf: number } | null
}

export async function buscarTendenciaICF(mes: number, ano: number, icfAtual: number): Promise<TendenciaICF> {
  const dataMesAnterior = new Date(ano, mes - 2, 1) // mes é 1-indexado
  const mesAnterior = dataMesAnterior.getMonth() + 1
  const anoAnterior = dataMesAnterior.getFullYear()

  const [anterior, ultimos3, ultimos6, historico] = await Promise.all([
    prisma.indicadorMensal.findUnique({ where: { mes_ano: { mes: mesAnterior, ano: anoAnterior } } }),
    prisma.indicadorMensal.findMany({ orderBy: [{ ano: 'desc' }, { mes: 'desc' }], take: 3 }),
    prisma.indicadorMensal.findMany({ orderBy: [{ ano: 'desc' }, { mes: 'desc' }], take: 6 }),
    prisma.indicadorMensal.findMany({ orderBy: { icf: 'desc' }, select: { mes: true, ano: true, icf: true } }),
  ])

  const media = (lista: { icf: number }[]) => lista.length ? lista.reduce((s, i) => s + i.icf, 0) / lista.length : null

  return {
    icfMesAnterior: anterior?.icf ?? null,
    evolucao: anterior ? Math.round((icfAtual - anterior.icf) * 10) / 10 : null,
    media3Meses: media(ultimos3),
    media6Meses: media(ultimos6),
    melhorHistorico: historico[0] ?? null,
    piorHistorico: historico[historico.length - 1] ?? null,
  }
}
