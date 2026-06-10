import { describe, it, expect } from 'vitest'
import { mergeDadosResponsavelPF, type DadosResponsavelPF } from './merge-dados-pf'

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
