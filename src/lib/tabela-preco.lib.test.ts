import { describe, it, expect } from 'vitest'
import { resolverValorCusto, type ItemTabelaPreco } from './tabela-preco.lib'

describe('resolverValorCusto', () => {
  const itensTabela: ItemTabelaPreco[] = [
    { modeloId: 'modelo-a', valorCusto: 100 },
    { modeloId: 'modelo-b', valorCusto: 200 },
  ]

  it('usa o valor da tabela quando o modelo está nela', () => {
    expect(resolverValorCusto('modelo-a', itensTabela, 999)).toBe(100)
  })

  it('usa o valor manual quando o modelo não está na tabela (gap, ex.: Cartão+Leitora nas tabelas 4/5)', () => {
    expect(resolverValorCusto('modelo-c', itensTabela, 999)).toBe(999)
  })

  it('usa o valor manual quando não há tabela vinculada (parceiro sem tabela)', () => {
    expect(resolverValorCusto('modelo-a', null, 999)).toBe(999)
  })

  it('retorna null/undefined quando não há tabela nem valor manual', () => {
    expect(resolverValorCusto('modelo-a', null, null)).toBeNull()
    expect(resolverValorCusto('modelo-a', undefined, undefined)).toBeUndefined()
  })
})
