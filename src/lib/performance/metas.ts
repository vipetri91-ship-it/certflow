import { prisma } from '@/lib/prisma'

// Fonte única da meta mensal de produção — substitui os valores hardcoded
// que existiam espalhados em 4 arquivos do dashboard (300, 300, 350, 10/dia),
// desalinhados entre si (ver Fase 8 do módulo Performance).
export const META_PRODUCAO_PADRAO = 350

export async function buscarMetaVigente(mes: number, ano: number): Promise<number> {
  const registro = await prisma.metaPerformance.findUnique({ where: { mes_ano: { mes, ano } } })
  return registro?.metaProducao ?? META_PRODUCAO_PADRAO
}

export async function definirMeta(mes: number, ano: number, metaProducao: number) {
  return prisma.metaPerformance.upsert({
    where: { mes_ano: { mes, ano } },
    update: { metaProducao },
    create: { mes, ano, metaProducao },
  })
}

export async function listarMetas() {
  return prisma.metaPerformance.findMany({ orderBy: [{ ano: 'desc' }, { mes: 'desc' } ] })
}
