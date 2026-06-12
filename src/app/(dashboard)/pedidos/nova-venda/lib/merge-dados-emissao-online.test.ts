import { describe, it, expect } from 'vitest'
import { mergeDadosEmissaoOnline, type DadosCertificadoExtraidos } from './merge-dados-emissao-online'

// Regressão para o vazamento de dados entre validações sucessivas no fluxo
// "Emissão Online A3" (validar()) — ONDA 2, item #10.

describe('mergeDadosEmissaoOnline', () => {
  it('certificado com nome, CPF e e-mail completos preenche os 3 campos', () => {
    const resultado = mergeDadosEmissaoOnline({
      nome: 'ANA KAROLINA ALVES SANTOS',
      cpf: '12345678901',
      cnpj: '',
      email: 'ana@email.com',
    })

    expect(resultado.nome).toBe('ANA KAROLINA ALVES SANTOS')
    expect(resultado.documento).toBe('123.456.789-01')
    expect(resultado.email).toBe('ana@email.com')
  })

  it('certificado PJ (CNPJ) formata o documento corretamente', () => {
    const resultado = mergeDadosEmissaoOnline({
      nome: 'EMPRESA B LTDA',
      cpf: '',
      cnpj: '11222333000144',
      email: 'contato@empresab.com',
    })

    expect(resultado.documento).toBe('11.222.333/0001-44')
  })

  it('certificado sem e-mail (cliente B) não herda o e-mail do cliente A validado antes', () => {
    const resultado = mergeDadosEmissaoOnline({
      nome: 'BRUNO SOUZA',
      cpf: '22222222222',
      cnpj: '',
      email: '',
    })

    expect(resultado.email).toBe('')
    expect(resultado.email).not.toBe('ana@email.com')
  })

  it('certificado sem CPF/CNPJ (cliente B) não herda o documento do cliente A validado antes', () => {
    const resultado = mergeDadosEmissaoOnline({
      nome: 'BRUNO SOUZA',
      cpf: '',
      cnpj: '',
      email: 'bruno@email.com',
    })

    expect(resultado.documento).toBe('')
    expect(resultado.documento).not.toBe('123.456.789-01')
  })

  it('certificado sem nome retorna nome vazio (comportamento atual preservado)', () => {
    const resultado = mergeDadosEmissaoOnline({
      nome: '',
      cpf: '33333333333',
      cnpj: '',
      email: 'carlos@email.com',
    })

    expect(resultado.nome).toBe('')
  })
})
