import { prisma } from '@/lib/prisma'

export { PONTOS_POR_TIPO, LABEL_TIPO_OCORRENCIA, calcularPontuacaoQualidade, classificarQualidade } from './qualidade-shared'

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
