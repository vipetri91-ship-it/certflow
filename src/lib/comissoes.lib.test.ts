import { describe, it, expect } from 'vitest'
import { calcularComissaoPedido } from './comissoes.lib'

describe('calcularComissaoPedido', () => {
  it('calcula a diferença entre valor de venda e valor de custo', () => {
    expect(calcularComissaoPedido({ valorCusto: 144, valorCliente: 215 })).toBe(71)
  })

  it('retorna null quando valorCusto está ausente', () => {
    expect(calcularComissaoPedido({ valorCusto: null, valorCliente: 215 })).toBeNull()
  })

  it('retorna null quando valorCliente está ausente', () => {
    expect(calcularComissaoPedido({ valorCusto: 144, valorCliente: null })).toBeNull()
  })

  it('retorna null quando não há configuração de comissão', () => {
    expect(calcularComissaoPedido(null)).toBeNull()
    expect(calcularComissaoPedido(undefined)).toBeNull()
  })

  it('aceita valores Decimal do Prisma (com toString/Number)', () => {
    expect(calcularComissaoPedido({ valorCusto: '144.00', valorCliente: '215.00' })).toBe(71)
  })

  it('permite comissão zero quando custo e venda são iguais', () => {
    expect(calcularComissaoPedido({ valorCusto: 100, valorCliente: 100 })).toBe(0)
  })
})
