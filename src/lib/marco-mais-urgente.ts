export interface Marco<T extends string | number> {
  limite: number
  tipo: T
}

/**
 * Dado uma lista de marcos ordenada do mais urgente para o menos urgente,
 * retorna o primeiro cujo limite já foi atingido e que ainda não foi
 * enviado. Garante que, ao detectar um cliente já "atrasado" (ex.: import
 * de dados antigos), só o marco mais urgente aplicável seja disparado —
 * nunca todos de uma vez, e nunca um marco menos urgente se um mais
 * urgente já se aplica.
 */
export function marcoMaisUrgenteAplicavel<T extends string | number>(
  marcos: Marco<T>[],
  limiteFoiAlcancado: (limite: number) => boolean,
  jaEnviados: ReadonlySet<T>
): T | null {
  for (const marco of marcos) {
    if (limiteFoiAlcancado(marco.limite) && !jaEnviados.has(marco.tipo)) {
      return marco.tipo
    }
  }
  return null
}
