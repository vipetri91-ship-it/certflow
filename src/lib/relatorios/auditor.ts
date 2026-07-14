import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export interface RelatorioAuditor {
  inicio: Date
  fim: Date
  execucoesLeve: number
  execucoesProfunda: number
  totalAchados: number
  totalCorrecoesAutomaticas: number
  pendentesDecisao: number
}

export async function buscarRelatorioAuditor(inicio: Date, fim: Date): Promise<RelatorioAuditor> {
  const registros = await prisma.auditoriaRobo.findMany({
    where: { createdAt: { gte: inicio, lte: fim } },
    select: { tipo: true, status: true, achados: true, correcoes: true },
  })

  let totalAchados = 0
  let totalCorrecoesAutomaticas = 0
  let pendentesDecisao = 0

  for (const r of registros) {
    const achados = Array.isArray(r.achados) ? r.achados.length : 0
    const correcoes = Array.isArray(r.correcoes) ? r.correcoes.length : 0
    totalAchados += achados
    totalCorrecoesAutomaticas += correcoes
    if (r.status === 'ACHADOS_SEM_CORRECAO' || r.status === 'BLOQUEADO_AGUARDANDO_APROVACAO') pendentesDecisao++
  }

  return {
    inicio, fim,
    execucoesLeve: registros.filter(r => r.tipo === 'LEVE').length,
    execucoesProfunda: registros.filter(r => r.tipo === 'PROFUNDA').length,
    totalAchados, totalCorrecoesAutomaticas, pendentesDecisao,
  }
}

export function formatarRelatorioAuditor(r: RelatorioAuditor): string {
  const periodo = `${format(r.inicio, 'dd/MM')} a ${format(r.fim, 'dd/MM')}`
  return (
    `🕵️ Setor Auditor — relatório de ${periodo}\n\n` +
    `🔎 Verificações leves rodadas: ${r.execucoesLeve} (a cada 20 min)\n` +
    `🔬 Auditorias profundas rodadas: ${r.execucoesProfunda} (1x por dia)\n\n` +
    `⚠️ Total de achados no período: ${r.totalAchados}\n` +
    `✅ Corrigidos sozinho pelo robô: ${r.totalCorrecoesAutomaticas}\n` +
    `🟡 Ainda aguardando sua decisão: ${r.pendentesDecisao}\n\n` +
    (r.totalAchados === 0
      ? 'Nenhum problema encontrado no período. Tudo rodando limpo.'
      : r.pendentesDecisao > 0
      ? 'Dá uma olhada nos itens pendentes quando puder — o robô não teve segurança pra corrigir sozinho.'
      : 'Tudo que apareceu já foi resolvido automaticamente.')
  )
}
