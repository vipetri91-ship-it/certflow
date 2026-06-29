import { prisma } from '../prisma'

const PREFIXO_CHAVE = 'robo:ultima-execucao:'

export async function registrarHeartbeat(job: string, quando: Date = new Date()): Promise<void> {
  const chave = `${PREFIXO_CHAVE}${job}`
  await prisma.configuracao.upsert({
    where: { chave },
    update: { valor: quando.toISOString() },
    create: { chave, valor: quando.toISOString() },
  })
}

export async function buscarUltimaExecucao(job: string): Promise<Date | null> {
  const chave = `${PREFIXO_CHAVE}${job}`
  const registro = await prisma.configuracao.findUnique({ where: { chave } })
  if (!registro) return null
  const data = new Date(registro.valor)
  return Number.isNaN(data.getTime()) ? null : data
}

/**
 * Um job está atrasado se já passou mais tempo do que o intervalo esperado
 * + uma margem de tolerância desde a última execução registrada — ou se
 * nunca rodou. Função pura, sem efeitos colaterais, pra ser testável.
 */
export function estaAtrasado(
  ultimaExecucao: Date | null,
  agora: Date,
  intervaloEsperadoMin: number,
  toleranciaMin: number
): boolean {
  if (!ultimaExecucao) return true
  const minutosDesdeUltima = (agora.getTime() - ultimaExecucao.getTime()) / 60_000
  return minutosDesdeUltima > intervaloEsperadoMin + toleranciaMin
}
