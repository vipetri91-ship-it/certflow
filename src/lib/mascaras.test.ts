import { describe, it, expect } from 'vitest'
import { mascararCPF, mascararCNPJ, mascararTelefone, mascararCEP } from './mascaras'

describe('mascararCPF', () => {
  it('formata CPF completo', () => {
    expect(mascararCPF('12345678901')).toBe('123.456.789-01')
  })
  it('formata progressivamente (só aplica máscara com os 3 primeiros grupos completos)', () => {
    expect(mascararCPF('123')).toBe('123')
    expect(mascararCPF('123456')).toBe('123456')
    expect(mascararCPF('123456789')).toBe('123.456.789')
  })
  it('ignora caracteres não numéricos já digitados', () => {
    expect(mascararCPF('123.456.789-01')).toBe('123.456.789-01')
  })
  it('limita a 11 dígitos', () => {
    expect(mascararCPF('123456789019999')).toBe('123.456.789-01')
  })
})

describe('mascararCNPJ', () => {
  it('formata CNPJ completo', () => {
    expect(mascararCNPJ('12345678000199')).toBe('12.345.678/0001-99')
  })
  it('formata progressivamente (só aplica máscara com os 3 primeiros grupos completos)', () => {
    expect(mascararCNPJ('12')).toBe('12')
    expect(mascararCNPJ('1234567')).toBe('1234567')
    expect(mascararCNPJ('123456780001')).toBe('12.345.678/0001')
  })
  it('limita a 14 dígitos', () => {
    expect(mascararCNPJ('123456780001999999')).toBe('12.345.678/0001-99')
  })
})

describe('mascararTelefone', () => {
  it('formata telefone fixo (10 dígitos)', () => {
    expect(mascararTelefone('1133334444')).toBe('(11) 3333-4444')
  })
  it('formata celular (11 dígitos)', () => {
    expect(mascararTelefone('11933334444')).toBe('(11) 93333-4444')
  })
  it('formata progressivamente (só aplica máscara com o DDD + 4 dígitos completos)', () => {
    expect(mascararTelefone('11')).toBe('11')
    // hífen final sobra enquanto o último grupo está vazio — comportamento
    // original preservado intencionalmente (não é regressão desta refatoração)
    expect(mascararTelefone('113333')).toBe('(11) 3333-')
  })
})

describe('mascararCEP', () => {
  it('formata CEP completo', () => {
    expect(mascararCEP('12345678')).toBe('12345-678')
  })
  it('formata progressivamente', () => {
    expect(mascararCEP('123')).toBe('123')
    expect(mascararCEP('123456')).toBe('12345-6')
  })
  it('limita a 8 dígitos', () => {
    expect(mascararCEP('123456789999')).toBe('12345-678')
  })
})
