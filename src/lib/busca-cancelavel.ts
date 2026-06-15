// Utilitário compartilhado para buscas assíncronas disparadas por digitação
// (CPF/CNPJ) que precisam cancelar a busca anterior quando uma nova busca
// é iniciada antes da resposta voltar — evita que uma resposta tardia
// (fora de ordem) sobrescreva dados de uma busca mais recente.
//
// ONDA 3 / P1.2: extraído do padrão já validado em
// `pedidos/nova-venda/wizard.tsx` (buscarClientePorCPF, ONDA 2) e
// replicado para as demais buscas de CNPJ do sistema.

export interface ResultadoBuscaCancelavel<T> {
  /** `true` quando esta busca foi cancelada por uma busca mais recente — o resultado deve ser ignorado. */
  cancelada: boolean
  dados?: T
  erro?: unknown
}

export class BuscaCancelavel {
  private controller: AbortController | null = null

  /**
   * Executa `fn`, cancelando automaticamente qualquer execução anterior
   * ainda pendente desta mesma instância. Se a execução for cancelada
   * (por uma chamada mais nova) ou abortada via `AbortError`, retorna
   * `{ cancelada: true }` e o chamador deve descartar o resultado.
   */
  async executar<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<ResultadoBuscaCancelavel<T>> {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller

    try {
      const dados = await fn(controller.signal)
      if (controller.signal.aborted) return { cancelada: true }
      return { cancelada: false, dados }
    } catch (erro) {
      if (controller.signal.aborted || (erro as Error)?.name === 'AbortError') {
        return { cancelada: true }
      }
      return { cancelada: false, erro }
    }
  }

  /** Cancela a execução pendente, se houver (ex.: ao desmontar o componente). */
  cancelar() {
    this.controller?.abort()
  }
}
