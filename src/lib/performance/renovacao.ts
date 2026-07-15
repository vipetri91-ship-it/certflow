import { prisma } from '@/lib/prisma'
import type { StatusIndicador } from './producao'

export interface ResultadoRenovacao {
  clientesVencendo30: number
  clientesContactados: number
  clientesPendentes: number
  taxaContato: number      // % dos vencendo em 30 dias que já foram contactados
  taxaConversao: number    // % dos que venceram no mês e já foram renovados
}

// A meta declarada é "100% dos clientes com vencimento em até 30 dias devem
// receber contato" — por isso o percentual que entra no ICF usa a taxa de
// CONTATO, não a de conversão. A taxa de conversão é mostrada como indicador
// complementar no dashboard, mas não é o que define a nota de Renovação.
// (assunção documentada — ajustar se a intenção for outra)
export function calcularPercentualRenovacao(resultado: ResultadoRenovacao): number {
  return resultado.taxaContato
}

export function classificarRenovacao(percentual: number): StatusIndicador {
  if (percentual >= 90) return 'excelente'
  if (percentual >= 70) return 'atencao'
  return 'abaixo'
}

export async function buscarRenovacaoMes(hoje: Date, inicioMes: Date, fimMes: Date): Promise<ResultadoRenovacao> {
  const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

  const vencendo30 = await prisma.certificado.findMany({
    where: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: em30Dias } },
    select: { id: true },
  })
  const idsVencendo = vencendo30.map(c => c.id)

  const contactados = idsVencendo.length
    ? await prisma.historicoContato.findMany({
        where: { certificadoId: { in: idsVencendo } },
        select: { certificadoId: true },
        distinct: ['certificadoId'],
      })
    : []

  const taxaContato = idsVencendo.length > 0 ? (contactados.length / idsVencendo.length) * 100 : 100

  // Taxa de renovação: dos certificados que venceram DENTRO do mês corrente,
  // quantos já têm um certificado novo vinculado (certificadoRenovacao,
  // mesma cadeia usada em src/lib/relatorios/agr-digital.ts).
  const venceramNoMes = await prisma.certificado.findMany({
    where: { dataVencimento: { gte: inicioMes, lte: fimMes } },
    select: { id: true, certificadoRenovacao: { select: { id: true } } },
  })
  const renovados = venceramNoMes.filter(c => c.certificadoRenovacao).length
  const taxaConversao = venceramNoMes.length > 0 ? (renovados / venceramNoMes.length) * 100 : 100

  return {
    clientesVencendo30: idsVencendo.length,
    clientesContactados: contactados.length,
    clientesPendentes: idsVencendo.length - contactados.length,
    taxaContato,
    taxaConversao,
  }
}
