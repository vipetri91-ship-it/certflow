import { describe, it, expect } from 'vitest'
import { mergeDadosEmpresaPorCnpjSst, type DadosEmpresaSst } from './merge-dados-cnpj'

// Regressão para o bug de vazamento de dados entre consultas de CNPJ no
// modal de lead do módulo SST (buscarCnpj) — ONDA 3 / P1.2, mesmo padrão de
// clientes/novo/lib/merge-dados-cnpj.test.ts (ONDA 2).

const ESTADO_VAZIO: DadosEmpresaSst = { empresa: '' }
const ESTADO_COM_EMPRESA_A: DadosEmpresaSst = { empresa: 'EMPRESA A LTDA' }

describe('mergeDadosEmpresaPorCnpjSst', () => {
  it('CNPJ encontrado preenche o campo empresa', () => {
    const resultado = mergeDadosEmpresaPorCnpjSst(ESTADO_VAZIO, { razaoSocial: 'EMPRESA B LTDA' })
    expect(resultado.empresa).toBe('EMPRESA B LTDA')
  })

  it('CNPJ encontrado mas sem razaoSocial mantém o valor anterior da tela', () => {
    const resultado = mergeDadosEmpresaPorCnpjSst(ESTADO_COM_EMPRESA_A, { razaoSocial: null })
    expect(resultado.empresa).toBe('EMPRESA A LTDA')
  })

  it('CNPJ não encontrado (data null) limpa o campo empresa da consulta anterior', () => {
    const resultado = mergeDadosEmpresaPorCnpjSst(ESTADO_COM_EMPRESA_A, null)
    expect(resultado.empresa).toBe('')
    expect(resultado.empresa).not.toBe('EMPRESA A LTDA')
  })

  it('erro de rede (data undefined) limpa o campo empresa da consulta anterior', () => {
    const resultado = mergeDadosEmpresaPorCnpjSst(ESTADO_COM_EMPRESA_A, undefined)
    expect(resultado.empresa).toBe('')
  })
})
