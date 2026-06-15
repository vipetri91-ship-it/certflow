import { describe, it, expect } from 'vitest'
import { mergeDadosEmpresaPorCnpj, type DadosEmpresaCnpj } from './merge-dados-cnpj'

// Regressão para o bug de vazamento de dados entre consultas de CNPJ no
// formulário "Editar Cliente" (buscarCnpj) — ONDA 3 / P1.2, mesmo padrão de
// clientes/novo/lib/merge-dados-cnpj.test.ts (ONDA 2).

const ESTADO_VAZIO: DadosEmpresaCnpj = {
  razaoSocial: '',
  nomeFantasia: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
}

const ESTADO_COM_DADOS_DA_EMPRESA_A: DadosEmpresaCnpj = {
  razaoSocial: 'EMPRESA A LTDA',
  nomeFantasia: 'Empresa A',
  cep: '01001-000',
  logradouro: 'Praça da Sé',
  numero: '1',
  bairro: 'Sé',
  cidade: 'São Paulo',
  estado: 'SP',
}

describe('mergeDadosEmpresaPorCnpj (clientes/[id]/editar)', () => {
  it('CNPJ encontrado preenche os dados da empresa', () => {
    const resultado = mergeDadosEmpresaPorCnpj(ESTADO_VAZIO, {
      razaoSocial: 'EMPRESA B LTDA',
      nomeFantasia: 'Empresa B',
      cep: '02002000',
      logradouro: 'Av. Paulista',
      numero: '100',
      bairro: 'Bela Vista',
      municipio: 'São Paulo',
      uf: 'SP',
    })

    expect(resultado.razaoSocial).toBe('EMPRESA B LTDA')
    expect(resultado.nomeFantasia).toBe('Empresa B')
    expect(resultado.cep).toBe('02002-000')
    expect(resultado.logradouro).toBe('Av. Paulista')
    expect(resultado.numero).toBe('100')
    expect(resultado.bairro).toBe('Bela Vista')
    expect(resultado.cidade).toBe('São Paulo')
    expect(resultado.estado).toBe('SP')
  })

  it('CNPJ encontrado mas com campos nulos mantém o valor anterior da tela (fallback ?? f.campo)', () => {
    const resultado = mergeDadosEmpresaPorCnpj(ESTADO_COM_DADOS_DA_EMPRESA_A, {
      razaoSocial: null,
      nomeFantasia: null,
      cep: null,
      logradouro: null,
      numero: null,
      bairro: null,
      municipio: null,
      uf: null,
    })

    expect(resultado.razaoSocial).toBe('EMPRESA A LTDA')
    expect(resultado.cep).toBe('01001-000')
    expect(resultado.logradouro).toBe('Praça da Sé')
  })

  it('CNPJ não encontrado (data null) limpa todos os dados da empresa A pesquisada antes', () => {
    const resultado = mergeDadosEmpresaPorCnpj(ESTADO_COM_DADOS_DA_EMPRESA_A, null)

    expect(resultado.razaoSocial).toBe('')
    expect(resultado.nomeFantasia).toBe('')
    expect(resultado.cep).toBe('')
    expect(resultado.cep).not.toBe('01001-000')
    expect(resultado.logradouro).toBe('')
    expect(resultado.logradouro).not.toBe('Praça da Sé')
    expect(resultado.numero).toBe('')
    expect(resultado.bairro).toBe('')
    expect(resultado.cidade).toBe('')
    expect(resultado.cidade).not.toBe('São Paulo')
    expect(resultado.estado).toBe('')
  })

  it('erro de rede (data undefined) limpa todos os dados da empresa A pesquisada antes', () => {
    const resultado = mergeDadosEmpresaPorCnpj(ESTADO_COM_DADOS_DA_EMPRESA_A, undefined)

    expect(resultado.razaoSocial).toBe('')
    expect(resultado.cep).toBe('')
    expect(resultado.estado).toBe('')
  })
})
