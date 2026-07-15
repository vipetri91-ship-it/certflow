import type { AchadoRobo } from '../tipos'
import { diagnosticarAchado, type ResultadoDiagnostico } from './agente'

export type { ResultadoDiagnostico } from './agente'

const CONCORRENCIA_MAXIMA = 3

// Diagnostica um lote de achados, deduplicado por chaveDedup (só a primeira
// ocorrência de cada uma é investigada por execução), com paralelismo capado
// e uma camada extra de try/catch — se algo falhar em nível de orquestração
// (ex.: ANTHROPIC_API_KEY ausente lançando na construção do client), o
// alerta original segue funcionando normalmente, só sem diagnóstico.
export async function diagnosticarAchados(achados: AchadoRobo[]): Promise<Map<string, ResultadoDiagnostico>> {
  const resultado = new Map<string, ResultadoDiagnostico>()

  try {
    const unicos = new Map<string, AchadoRobo>()
    for (const a of achados) {
      if (!unicos.has(a.chaveDedup)) unicos.set(a.chaveDedup, a)
    }

    const lista = [...unicos.values()]
    for (let i = 0; i < lista.length; i += CONCORRENCIA_MAXIMA) {
      const lote = lista.slice(i, i + CONCORRENCIA_MAXIMA)
      const resultados = await Promise.allSettled(lote.map(a => diagnosticarAchado(a)))
      resultados.forEach((r, idx) => {
        if (r.status === 'fulfilled') resultado.set(lote[idx].chaveDedup, r.value)
      })
    }
  } catch {
    // Defesa em profundidade — nunca deixar o diagnóstico derrubar o alerta original.
  }

  return resultado
}
