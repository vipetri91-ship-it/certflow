import { describe, it, expect } from 'vitest'
import { camposAlterados } from './audit'

// ONDA 3 / P1.3 — audit log de Cliente/Parceiro passa a gravar apenas os
// nomes dos campos alterados, nunca os valores (CPF, endereço, senha etc.).

describe('camposAlterados', () => {
  it('retorna apenas os campos cujo valor mudou', () => {
    const antes = { nome: 'Empresa A', cep: '01001-000', email: 'a@a.com' }
    const depois = { nome: 'Empresa B', cep: '01001-000', email: 'a@a.com' }

    expect(camposAlterados(antes, depois, ['nome', 'cep', 'email'])).toEqual(['nome'])
  })

  it('retorna lista vazia quando nada mudou nos campos verificados', () => {
    const antes = { nome: 'Empresa A', cep: '01001-000' }
    const depois = { nome: 'Empresa A', cep: '01001-000' }

    expect(camposAlterados(antes, depois, ['nome', 'cep'])).toEqual([])
  })

  it('compara datas pelo valor (Date) e não pela referência', () => {
    const antes = { dataNascimento: new Date('1990-01-01T00:00:00.000Z') }
    const depois = { dataNascimento: new Date('1990-01-01T00:00:00.000Z') }

    expect(camposAlterados(antes, depois, ['dataNascimento'])).toEqual([])
  })

  it('detecta mudança de null para valor preenchido', () => {
    const antes = { complemento: null }
    const depois = { complemento: 'Sala 2' }

    expect(camposAlterados(antes, depois, ['complemento'])).toEqual(['complemento'])
  })

  it('não considera campos fora da lista informada', () => {
    const antes = { nome: 'A', cpf: '11111111111' }
    const depois = { nome: 'A', cpf: '22222222222' }

    expect(camposAlterados(antes, depois, ['nome'])).toEqual([])
  })
})
