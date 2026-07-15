import { prisma } from '@/lib/prisma'
import type { TipoOcorrenciaQualidade } from '@/generated/prisma/client'
import type { StatusIndicador } from './producao'

export const PONTOS_POR_TIPO: Record<Exclude<TipoOcorrenciaQualidade, 'REVOGACAO'>, number> = {
  ERRO_PEQUENO: 5,
  RETRABALHO: 10,
  ERRO_GRAVE: 30,
}

export const LABEL_TIPO_OCORRENCIA: Record<TipoOcorrenciaQualidade, string> = {
  ERRO_PEQUENO: 'Erro pequeno',
  RETRABALHO: 'Retrabalho',
  ERRO_GRAVE: 'Erro grave',
  REVOGACAO: 'Revogação',
}

// Qualidade começa em 100 pontos. Revogação zera a pontuação do mês inteiro
// (não é só mais um desconto) — regra explícita do Vinicius.
export function calcularPontuacaoQualidade(ocorrencias: { tipo: TipoOcorrenciaQualidade }[]): number {
  if (ocorrencias.some(o => o.tipo === 'REVOGACAO')) return 0
  const perdidos = ocorrencias.reduce((soma, o) => {
    if (o.tipo === 'REVOGACAO') return soma
    return soma + (PONTOS_POR_TIPO[o.tipo] ?? 0)
  }, 0)
  return Math.max(0, 100 - perdidos)
}

export function classificarQualidade(pontuacao: number): StatusIndicador {
  if (pontuacao >= 90) return 'excelente'
  if (pontuacao >= 70) return 'atencao'
  return 'abaixo'
}

export async function buscarOcorrenciasMes(inicio: Date, fim: Date) {
  return prisma.ocorrenciaQualidade.findMany({
    where: { data: { gte: inicio, lte: fim } },
    select: { id: true, tipo: true, data: true },
    orderBy: { data: 'desc' },
  })
}

// Última ocorrência com contexto completo — só pra tela administrativa
// (nunca exibida na TV/dashboard público, que mostra só números agregados).
export async function buscarUltimaOcorrenciaDetalhada() {
  return prisma.ocorrenciaQualidade.findFirst({
    orderBy: { data: 'desc' },
    include: {
      usuario: { select: { nome: true } },
      registradoPor: { select: { nome: true } },
    },
  })
}
