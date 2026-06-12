import { describe, it, expect } from 'vitest'
import { mergeDadosResponsavelPF, mergeDadosClientePorCPF, type DadosResponsavelPF, type DadosClientePorCPF } from './merge-dados-pf'

// Regressão para o bug de vazamento de dados entre consultas de CPF no
// step "Responsável" (Nova Venda) — ver docs/regras-negocio/consulta-cpf.md
// e docs/regras-negocio/isolamento-de-formularios.md.

const ESTADO_INICIAL: DadosResponsavelPF = {
  validado: false,
  nomeResponsavel: '',
  nome: '',
  clienteId: '',
  email: '',
  ddd: '',
  telefone: '',
  pisNis: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  municipio: '',
  estado: '',
}

describe('mergeDadosResponsavelPF', () => {
  it('cenário 1: consulta do CPF da Ana (com cadastro local) preenche todos os dados dela', () => {
    const resultado = mergeDadosResponsavelPF(ESTADO_INICIAL, {
      nomeRfb: 'ANA KAROLINA ALVES SANTOS',
      clienteDb: {
        id: 'cliente-ana-id',
        nome: 'Ana Karolina Alves Santos',
        email: 'anakarolinaalvessantos@gmail.com',
        celular: '11963447697',
        ddd: '11',
        pisNis: '12345678901',
        cep: '08690205',
        logradouro: 'Rua José Ferreira Neves',
        numero: '277',
        bairro: 'Cidade Miguel Badra',
        cidade: 'Suzano',
        estado: 'SP',
      },
    })

    expect(resultado.nome).toBe('ANA KAROLINA ALVES SANTOS')
    expect(resultado.nomeResponsavel).toBe('ANA KAROLINA ALVES SANTOS')
    expect(resultado.clienteId).toBe('cliente-ana-id')
    expect(resultado.email).toBe('anakarolinaalvessantos@gmail.com')
    expect(resultado.ddd).toBe('11')
    expect(resultado.telefone).toBe('963447697')
    expect(resultado.cep).toBe('08690-205')
    expect(resultado.logradouro).toBe('Rua José Ferreira Neves')
    expect(resultado.numero).toBe('277')
    expect(resultado.bairro).toBe('Cidade Miguel Badra')
    expect(resultado.municipio).toBe('Suzano')
    expect(resultado.estado).toBe('SP')

    return resultado
  })

  it('cenário 2: consulta do CPF do Antonello (sem cadastro local) não pode manter dados da Ana', () => {
    // Estado da tela após o cenário 1 (Ana já consultada e exibida na tela)
    const estadoComDadosDaAna: DadosResponsavelPF = {
      validado: true,
      nomeResponsavel: 'ANA KAROLINA ALVES SANTOS',
      nome: 'ANA KAROLINA ALVES SANTOS',
      clienteId: 'cliente-ana-id',
      email: 'anakarolinaalvessantos@gmail.com',
      ddd: '11',
      telefone: '963447697',
      pisNis: '12345678901',
      cep: '08690-205',
      logradouro: 'Rua José Ferreira Neves',
      numero: '277',
      bairro: 'Cidade Miguel Badra',
      municipio: 'Suzano',
      estado: 'SP',
    }

    const resultado = mergeDadosResponsavelPF(estadoComDadosDaAna, {
      nomeRfb: 'ANTONELLO PASCHOAL PEREIRA',
      clienteDb: undefined, // Antonello não tem cadastro local
    })

    // O nome do Antonello deve ser carregado corretamente, vindo da Receita
    expect(resultado.nome).toBe('ANTONELLO PASCHOAL PEREIRA')
    expect(resultado.nomeResponsavel).toBe('ANTONELLO PASCHOAL PEREIRA')

    // Nenhum dado da Ana pode permanecer na tela
    expect(resultado.clienteId).toBe('')
    expect(resultado.email).toBe('')
    expect(resultado.email).not.toBe('anakarolinaalvessantos@gmail.com')

    expect(resultado.ddd).toBe('')
    expect(resultado.telefone).toBe('')
    expect(resultado.telefone).not.toBe('963447697')

    expect(resultado.cep).toBe('')
    expect(resultado.cep).not.toBe('08690-205')

    expect(resultado.logradouro).toBe('')
    expect(resultado.logradouro).not.toBe('Rua José Ferreira Neves')

    expect(resultado.numero).toBe('')

    expect(resultado.bairro).toBe('')
    expect(resultado.bairro).not.toBe('Cidade Miguel Badra')

    expect(resultado.municipio).toBe('')
    expect(resultado.municipio).not.toBe('Suzano')

    expect(resultado.estado).toBe('')
    expect(resultado.estado).not.toBe('SP')

    expect(resultado.pisNis).toBe('')
  })
})

// Regressão para o vazamento de dados na busca de CPF do step
// "Identificação" (buscarClientePorCPF, ONDA 2 - itens #1 e #2).
describe('mergeDadosClientePorCPF', () => {
  const ESTADO_COM_DADOS_DA_ANA: DadosClientePorCPF = {
    clienteId: 'cliente-ana-id',
    validado: true,
    nomeResponsavel: 'ANA KAROLINA ALVES SANTOS',
    nome: 'ANA KAROLINA ALVES SANTOS',
    dataNascimento: '1990-01-01',
    dataNasc: '1990-01-01',
    email: 'anakarolinaalvessantos@gmail.com',
    ddd: '11',
    telefone: '963447697',
    pisNis: '12345678901',
    cep: '08690-205',
    logradouro: 'Rua José Ferreira Neves',
    numero: '277',
    bairro: 'Cidade Miguel Badra',
    municipio: 'Suzano',
    estado: 'SP',
  }

  it('PF: CPF encontrado preenche todos os dados do cliente', () => {
    const resultado = mergeDadosClientePorCPF(
      { tipoPessoa: 'PF', clienteId: '', validado: false },
      {
        id: 'cliente-bruno-id',
        tipoPessoa: 'PF',
        cpf: '12345678901',
        nome: 'BRUNO SOUZA',
        dataNascimento: '1985-05-20T00:00:00.000Z',
        email: 'bruno@email.com',
        celular: '11987654321',
        ddd: '11',
        pisNis: '98765432100',
        cep: '01001000',
        logradouro: 'Praça da Sé',
        numero: '1',
        bairro: 'Sé',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      '12345678901',
    )

    expect(resultado.clienteId).toBe('cliente-bruno-id')
    expect(resultado.validado).toBe(true)
    expect(resultado.nome).toBe('BRUNO SOUZA')
    expect(resultado.nomeResponsavel).toBe('BRUNO SOUZA')
    expect(resultado.dataNascimento).toBe('1985-05-20')
    expect(resultado.dataNasc).toBe('1985-05-20')
    expect(resultado.email).toBe('bruno@email.com')
    expect(resultado.ddd).toBe('11')
    expect(resultado.telefone).toBe('987654321')
    expect(resultado.pisNis).toBe('98765432100')
    expect(resultado.cep).toBe('01001-000')
    expect(resultado.logradouro).toBe('Praça da Sé')
    expect(resultado.numero).toBe('1')
    expect(resultado.bairro).toBe('Sé')
    expect(resultado.municipio).toBe('São Paulo')
    expect(resultado.estado).toBe('SP')
  })

  it('PF: CPF não encontrado limpa todos os dados da consulta anterior (Ana)', () => {
    const resultado = mergeDadosClientePorCPF(
      { tipoPessoa: 'PF', clienteId: ESTADO_COM_DADOS_DA_ANA.clienteId, validado: ESTADO_COM_DADOS_DA_ANA.validado },
      null,
      '99999999999',
    )

    expect(resultado.clienteId).toBe('')
    expect(resultado.validado).toBe(false)
    expect(resultado.nome).toBe('')
    expect(resultado.nomeResponsavel).toBe('')
    expect(resultado.dataNascimento).toBe('')
    expect(resultado.dataNasc).toBe('')
    expect(resultado.email).toBe('')
    expect(resultado.email).not.toBe('anakarolinaalvessantos@gmail.com')
    expect(resultado.ddd).toBe('')
    expect(resultado.telefone).toBe('')
    expect(resultado.pisNis).toBe('')
    expect(resultado.cep).toBe('')
    expect(resultado.logradouro).toBe('')
    expect(resultado.logradouro).not.toBe('Rua José Ferreira Neves')
    expect(resultado.numero).toBe('')
    expect(resultado.bairro).toBe('')
    expect(resultado.municipio).toBe('')
    expect(resultado.municipio).not.toBe('Suzano')
    expect(resultado.estado).toBe('')
  })

  it('PF: cliente retornado pela API com CPF diferente do buscado é tratado como não encontrado', () => {
    const resultado = mergeDadosClientePorCPF(
      { tipoPessoa: 'PF', clienteId: ESTADO_COM_DADOS_DA_ANA.clienteId, validado: ESTADO_COM_DADOS_DA_ANA.validado },
      { id: 'outro-cliente', cpf: '11111111111', nome: 'OUTRO CLIENTE', email: 'outro@email.com' },
      '99999999999',
    )

    expect(resultado.clienteId).toBe('')
    expect(resultado.validado).toBe(false)
    expect(resultado.nome).toBe('')
    expect(resultado.email).toBe('')
  })

  it('PJ: CPF do responsável não encontrado limpa dados do responsável, mas não toca clienteId/validado da empresa', () => {
    const resultado = mergeDadosClientePorCPF(
      { tipoPessoa: 'PJ', clienteId: 'cliente-empresa-id', validado: true },
      null,
      '99999999999',
    )

    // clienteId/validado pertencem à empresa (validarCNPJ) e não devem mudar aqui
    expect(resultado.clienteId).toBe('cliente-empresa-id')
    expect(resultado.validado).toBe(true)

    // dados do responsável (pessoa física) são limpos
    expect(resultado.nome).toBe('')
    expect(resultado.nomeResponsavel).toBe('')
    expect(resultado.email).toBe('')
    expect(resultado.cep).toBe('')
  })

  it('PF: campos nulos no cliente encontrado ficam vazios, sem herdar dados da consulta anterior (Ana)', () => {
    const resultado = mergeDadosClientePorCPF(
      { tipoPessoa: 'PF', clienteId: ESTADO_COM_DADOS_DA_ANA.clienteId, validado: ESTADO_COM_DADOS_DA_ANA.validado },
      {
        id: 'cliente-carlos-id',
        cpf: '22222222222',
        nome: 'CARLOS PEREIRA',
        email: null,
        pisNis: null,
        cep: null,
      },
      '22222222222',
    )

    expect(resultado.nome).toBe('CARLOS PEREIRA')
    expect(resultado.clienteId).toBe('cliente-carlos-id')
    expect(resultado.email).toBe('')
    expect(resultado.email).not.toBe('anakarolinaalvessantos@gmail.com')
    expect(resultado.pisNis).toBe('')
    expect(resultado.cep).toBe('')
    expect(resultado.cep).not.toBe('08690-205')
  })
})
