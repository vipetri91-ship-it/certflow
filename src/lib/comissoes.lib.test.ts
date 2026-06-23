import { describe, it, expect } from 'vitest'
import { calcularComissaoPedido, periodoMesAno } from './comissoes.lib'

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

describe('periodoMesAno', () => {
  it('retorna o primeiro dia do mês como início e o primeiro dia do mês seguinte como fim (exclusivo)', () => {
    const { inicio, fim } = periodoMesAno(6, 2026)
    expect(inicio.getFullYear()).toBe(2026)
    expect(inicio.getMonth()).toBe(5) // junho = índice 5
    expect(inicio.getDate()).toBe(1)
    expect(fim.getMonth()).toBe(6) // julho
    expect(fim.getDate()).toBe(1)
  })

  it('vira o ano corretamente em dezembro', () => {
    const { fim } = periodoMesAno(12, 2026)
    expect(fim.getFullYear()).toBe(2027)
    expect(fim.getMonth()).toBe(0)
  })
})
