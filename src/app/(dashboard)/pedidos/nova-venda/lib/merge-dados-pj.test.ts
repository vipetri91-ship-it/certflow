import { describe, it, expect } from 'vitest'
import { mergeDadosEmpresaPorCNPJ, limparDadosValidacaoPJ, type DadosEmpresaPorCNPJ, type DadosValidacaoPJ } from './merge-dados-pj'

// Regressão para o bug de vazamento de dados entre consultas de CNPJ no
// step "Identificação" (Nova Venda) — ONDA 2, itens #3 e #4. Ver
// docs/regras-negocio/isolamento-de-formularios.md.

const ESTADO_VAZIO: DadosEmpresaPorCNPJ = {
  clienteId: '',
  nomeEmpresa: '',
  razaoSocial: '',
  fantasia: '',
  nomeResponsavel: '',
  nome: '',
  cpfResponsavel: '',
  dataNascimento: '',
  email: '',
  ddd: '',
  telefone: '',
  emailEmpresa: '',
  dddEmpresa: '',
  telEmpresa: '',
  cepEmpresa: '',
  logradouroEmpresa: '',
  numeroEmpresa: '',
  bairroEmpresa: '',
  municipioEmpresa: '',
  estadoEmpresa: '',
}

const ESTADO_COM_DADOS_DA_EMPRESA_A: DadosEmpresaPorCNPJ = {
  clienteId: 'cliente-empresa-a-id',
  nomeEmpresa: 'EMPRESA A LTDA',
  razaoSocial: 'EMPRESA A LTDA',
  fantasia: 'Empresa A',
  nomeResponsavel: 'JOAO DA EMPRESA A',
  nome: 'JOAO DA EMPRESA A',
  cpfResponsavel: '111.111.111-11',
  dataNascimento: '1980-01-01',
  email: 'contato@empresaa.com',
  ddd: '11',
  telefone: '911111111',
  emailEmpresa: 'contato@empresaa.com',
  dddEmpresa: '11',
  telEmpresa: '922222222',
  cepEmpresa: '01001-000',
  logradouroEmpresa: 'Praça da Sé',
  numeroEmpresa: '1',
  bairroEmpresa: 'Sé',
  municipioEmpresa: 'São Paulo',
  estadoEmpresa: 'SP',
}

describe('mergeDadosEmpresaPorCNPJ', () => {
  it('CNPJ encontrado preenche os dados da empresa e do responsável', () => {
    const resultado = mergeDadosEmpresaPorCNPJ(
      ESTADO_VAZIO,
      {
        id: 'cliente-empresa-b-id',
        cnpj: '11222333000144',
        nome: 'EMPRESA B LTDA',
        nomeFantasia: 'Empresa B',
        responsavel: 'MARIA DA EMPRESA B',
        email: 'contato@empresab.com',
        celular: '11987654321',
        ddd: '11',
        cep: '02002000',
        logradouro: 'Av. Paulista',
        numero: '100',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      { cpfFormatado: '222.222.222-22', dataNascimentoIso: '1990-05-10T00:00:00.000Z' },
    )

    expect(resultado.clienteId).toBe('cliente-empresa-b-id')
    expect(resultado.nomeEmpresa).toBe('EMPRESA B LTDA')
    expect(resultado.razaoSocial).toBe('EMPRESA B LTDA')
    expect(resultado.fantasia).toBe('Empresa B')
    expect(resultado.nomeResponsavel).toBe('MARIA DA EMPRESA B')
    expect(resultado.nome).toBe('MARIA DA EMPRESA B')
    expect(resultado.cpfResponsavel).toBe('222.222.222-22')
    expect(resultado.dataNascimento).toBe('1990-05-10')
    expect(resultado.email).toBe('contato@empresab.com')
    expect(resultado.ddd).toBe('11')
    expect(resultado.telefone).toBe('987654321')
    expect(resultado.emailEmpresa).toBe('contato@empresab.com')
    expect(resultado.cepEmpresa).toBe('02002-000')
    expect(resultado.logradouroEmpresa).toBe('Av. Paulista')
    expect(resultado.numeroEmpresa).toBe('100')
    expect(resultado.bairroEmpresa).toBe('Bela Vista')
    expect(resultado.municipioEmpresa).toBe('São Paulo')
    expect(resultado.estadoEmpresa).toBe('SP')
  })

  it('CNPJ encontrado mas com campos nulos mantém o valor anterior da tela (fallback ?? d.campo)', () => {
    const resultado = mergeDadosEmpresaPorCNPJ(
      ESTADO_COM_DADOS_DA_EMPRESA_A,
      {
        id: 'cliente-empresa-c-id',
        cnpj: '11222333000144',
        nome: null,
        nomeFantasia: null,
        responsavel: null,
        email: null,
        cep: null,
        logradouro: null,
      },
      { cpfFormatado: null, dataNascimentoIso: null },
    )

    // clienteId sempre é atualizado para o cliente encontrado
    expect(resultado.clienteId).toBe('cliente-empresa-c-id')
    // campos nulos do cliente encontrado mantêm o valor anterior (regra de negócio inalterada)
    expect(resultado.nomeEmpresa).toBe('EMPRESA A LTDA')
    expect(resultado.cpfResponsavel).toBe('111.111.111-11')
    expect(resultado.dataNascimento).toBe('1980-01-01')
    expect(resultado.cepEmpresa).toBe('01001-000')
  })

  it('CNPJ não encontrado (cliente null) limpa todos os dados da empresa A pesquisada antes', () => {
    const resultado = mergeDadosEmpresaPorCNPJ(
      ESTADO_COM_DADOS_DA_EMPRESA_A,
      null,
      { cpfFormatado: null, dataNascimentoIso: null },
    )

    expect(resultado.clienteId).toBe('')
    expect(resultado.nomeEmpresa).toBe('')
    expect(resultado.razaoSocial).toBe('')
    expect(resultado.fantasia).toBe('')
    expect(resultado.nomeResponsavel).toBe('')
    expect(resultado.nome).toBe('')
    expect(resultado.cpfResponsavel).toBe('')
    expect(resultado.cpfResponsavel).not.toBe('111.111.111-11')
    expect(resultado.dataNascimento).toBe('')
    expect(resultado.dataNascimento).not.toBe('1980-01-01')
    expect(resultado.email).toBe('')
    expect(resultado.ddd).toBe('')
    expect(resultado.telefone).toBe('')
    expect(resultado.emailEmpresa).toBe('')
    expect(resultado.dddEmpresa).toBe('')
    expect(resultado.telEmpresa).toBe('')
    expect(resultado.cepEmpresa).toBe('')
    expect(resultado.cepEmpresa).not.toBe('01001-000')
    expect(resultado.logradouroEmpresa).toBe('')
    expect(resultado.logradouroEmpresa).not.toBe('Praça da Sé')
    expect(resultado.numeroEmpresa).toBe('')
    expect(resultado.bairroEmpresa).toBe('')
    expect(resultado.municipioEmpresa).toBe('')
    expect(resultado.municipioEmpresa).not.toBe('São Paulo')
    expect(resultado.estadoEmpresa).toBe('')
  })
})

describe('limparDadosValidacaoPJ', () => {
  const ESTADO_VALIDACAO_COM_DADOS_DA_EMPRESA_A: DadosValidacaoPJ = {
    nomeEmpresa: 'EMPRESA A LTDA',
    razaoSocial: 'EMPRESA A LTDA',
    fantasia: 'Empresa A',
    nomeResponsavel: 'JOAO DA EMPRESA A',
    clienteId: 'cliente-empresa-a-id',
    nome: 'JOAO DA EMPRESA A',
    cpfResponsavel: '111.111.111-11',
    dataNascimento: '1980-01-01',
    email: 'contato@empresaa.com',
    ddd: '11',
    telefone: '911111111',
    cepEmpresa: '01001-000',
    logradouroEmpresa: 'Praça da Sé',
    numeroEmpresa: '1',
    bairroEmpresa: 'Sé',
    municipioEmpresa: 'São Paulo',
    estadoEmpresa: 'SP',
    validado: true,
  }

  it('retorna todos os campos de validação vazios/false, independente do estado anterior', () => {
    const resultado: DadosValidacaoPJ = {
      ...ESTADO_VALIDACAO_COM_DADOS_DA_EMPRESA_A,
      ...limparDadosValidacaoPJ(),
    }

    expect(resultado.nomeEmpresa).toBe('')
    expect(resultado.razaoSocial).toBe('')
    expect(resultado.fantasia).toBe('')
    expect(resultado.nomeResponsavel).toBe('')
    expect(resultado.clienteId).toBe('')
    expect(resultado.nome).toBe('')
    expect(resultado.cpfResponsavel).toBe('')
    expect(resultado.cpfResponsavel).not.toBe('111.111.111-11')
    expect(resultado.dataNascimento).toBe('')
    expect(resultado.dataNascimento).not.toBe('1980-01-01')
    expect(resultado.email).toBe('')
    expect(resultado.ddd).toBe('')
    expect(resultado.telefone).toBe('')
    expect(resultado.cepEmpresa).toBe('')
    expect(resultado.logradouroEmpresa).toBe('')
    expect(resultado.numeroEmpresa).toBe('')
    expect(resultado.bairroEmpresa).toBe('')
    expect(resultado.municipioEmpresa).toBe('')
    expect(resultado.estadoEmpresa).toBe('')
    expect(resultado.validado).toBe(false)
  })
})
