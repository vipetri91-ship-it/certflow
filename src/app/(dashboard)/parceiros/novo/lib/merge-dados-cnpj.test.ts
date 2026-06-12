import { describe, it, expect } from 'vitest'
import { mergeDadosParceiroPorCnpj, type DadosParceiroCnpj } from './merge-dados-cnpj'

// Regressão para o bug de vazamento de dados entre consultas de CNPJ no
// formulário "Novo Parceiro" (buscarCnpj) — ONDA 2, item #9.

const ESTADO_VAZIO: DadosParceiroCnpj = {
  razaoSocial: '',
  email: '',
  telefone: '',
}

const ESTADO_COM_DADOS_DA_EMPRESA_A: DadosParceiroCnpj = {
  razaoSocial: 'EMPRESA A LTDA',
  email: 'contato@empresaa.com',
  telefone: '(11) 91111-1111',
}

describe('mergeDadosParceiroPorCnpj', () => {
  it('CNPJ encontrado preenche os dados do parceiro', () => {
    const resultado = mergeDadosParceiroPorCnpj(ESTADO_VAZIO, {
      razaoSocial: 'EMPRESA B LTDA',
      email: 'contato@empresab.com',
      telefone: '(11) 92222-2222',
    })

    expect(resultado.razaoSocial).toBe('EMPRESA B LTDA')
    expect(resultado.email).toBe('contato@empresab.com')
    expect(resultado.telefone).toBe('(11) 92222-2222')
  })

  it('CNPJ encontrado mas com campos nulos mantém o valor anterior da tela (fallback ?? f.campo)', () => {
    const resultado = mergeDadosParceiroPorCnpj(ESTADO_COM_DADOS_DA_EMPRESA_A, {
      razaoSocial: null,
      email: null,
      telefone: null,
    })

    expect(resultado.razaoSocial).toBe('EMPRESA A LTDA')
    expect(resultado.email).toBe('contato@empresaa.com')
    expect(resultado.telefone).toBe('(11) 91111-1111')
  })

  it('CNPJ não encontrado (data null) limpa todos os dados da empresa A pesquisada antes', () => {
    const resultado = mergeDadosParceiroPorCnpj(ESTADO_COM_DADOS_DA_EMPRESA_A, null)

    expect(resultado.razaoSocial).toBe('')
    expect(resultado.email).toBe('')
    expect(resultado.email).not.toBe('contato@empresaa.com')
    expect(resultado.telefone).toBe('')
    expect(resultado.telefone).not.toBe('(11) 91111-1111')
  })

  it('erro de rede (data undefined) limpa todos os dados da empresa A pesquisada antes', () => {
    const resultado = mergeDadosParceiroPorCnpj(ESTADO_COM_DADOS_DA_EMPRESA_A, undefined)

    expect(resultado.razaoSocial).toBe('')
    expect(resultado.email).toBe('')
    expect(resultado.telefone).toBe('')
  })
})
