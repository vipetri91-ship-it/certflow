import { describe, it, expect } from 'vitest'
import { BuscaCancelavel } from './busca-cancelavel'

// ONDA 3 / P1.2: cobertura para o utilitário de cancelamento de buscas
// assíncronas (CPF/CNPJ). Garante que uma resposta tardia (fora de ordem)
// é descartada e não sobrescreve o resultado da busca mais recente.

describe('BuscaCancelavel', () => {
  it('descarta o resultado de uma busca anterior que responde depois da mais recente', async () => {
    const busca = new BuscaCancelavel()

    // Busca A (lenta) é iniciada primeiro, mas só resolve depois da busca B.
    const promiseA = busca.executar<string>(async (signal) => {
      await new Promise(r => setTimeout(r, 20))
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      return 'resultado-A'
    })

    // Busca B (rápida) é iniciada em seguida — deve cancelar A.
    const promiseB = busca.executar<string>(async () => {
      await new Promise(r => setTimeout(r, 5))
      return 'resultado-B'
    })

    const [resultadoA, resultadoB] = await Promise.all([promiseA, promiseB])

    expect(resultadoA.cancelada).toBe(true)
    expect(resultadoA.dados).toBeUndefined()

    expect(resultadoB.cancelada).toBe(false)
    expect(resultadoB.dados).toBe('resultado-B')
  })

  it('não cancela uma busca caso nenhuma outra busca seja iniciada depois', async () => {
    const busca = new BuscaCancelavel()

    const resultado = await busca.executar<string>(async () => 'unico-resultado')

    expect(resultado.cancelada).toBe(false)
    expect(resultado.dados).toBe('unico-resultado')
  })

  it('repassa erros que não são de cancelamento', async () => {
    const busca = new BuscaCancelavel()

    const resultado = await busca.executar<string>(async () => {
      throw new Error('falha de rede')
    })

    expect(resultado.cancelada).toBe(false)
    expect(resultado.erro).toBeInstanceOf(Error)
    expect((resultado.erro as Error).message).toBe('falha de rede')
  })

  it('cancelar() marca a busca em andamento como cancelada', async () => {
    const busca = new BuscaCancelavel()

    const promise = busca.executar<string>(async (signal) => {
      await new Promise(r => setTimeout(r, 10))
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      return 'nao-deveria-chegar-aqui'
    })

    busca.cancelar()

    const resultado = await promise
    expect(resultado.cancelada).toBe(true)
  })
})
