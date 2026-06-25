import { describe, it, expect } from 'vitest'
import { marcoMaisUrgenteAplicavel, type Marco } from './marco-mais-urgente'

type TipoTeste = 'M7' | 'M15' | 'M30' | 'M60'

const marcosAntes: Marco<TipoTeste>[] = [
  { limite: 7, tipo: 'M7' },
  { limite: 15, tipo: 'M15' },
  { limite: 30, tipo: 'M30' },
  { limite: 60, tipo: 'M60' },
]

describe('marcoMaisUrgenteAplicavel', () => {
  it('progressão normal dia a dia: dispara o marco de 60 quando faltam exatos 60 dias', () => {
    const tipo = marcoMaisUrgenteAplicavel(marcosAntes, (limite) => 60 <= limite, new Set())
    expect(tipo).toBe('M60')
  })

  it('não reenvia um marco que já foi enviado', () => {
    const tipo = marcoMaisUrgenteAplicavel(marcosAntes, (limite) => 60 <= limite, new Set(['M60']))
    expect(tipo).toBeNull()
  })

  it('importação atrasada: faltam só 3 dias, deve disparar direto o marco mais urgente (7), pulando 15/30/60', () => {
    const tipo = marcoMaisUrgenteAplicavel(marcosAntes, (limite) => 3 <= limite, new Set())
    expect(tipo).toBe('M7')
  })

  it('cron pulou um dia: estava em 31 dias e caiu pra 28 — ainda cobre o marco de 30 que faltou', () => {
    const tipo = marcoMaisUrgenteAplicavel(marcosAntes, (limite) => 28 <= limite, new Set(['M60']))
    expect(tipo).toBe('M30')
  })

  it('já passou pelo marco mais urgente — não desce de novo pra um marco já enviado', () => {
    const tipo = marcoMaisUrgenteAplicavel(marcosAntes, (limite) => 5 <= limite, new Set(['M60', 'M30', 'M15', 'M7']))
    expect(tipo).toBeNull()
  })

  it('nenhum marco se aplica ainda (faltam mais de 60 dias)', () => {
    const tipo = marcoMaisUrgenteAplicavel(marcosAntes, (limite) => 90 <= limite, new Set())
    expect(tipo).toBeNull()
  })

  it('funciona também para regra "maior ou igual" (pós-vencimento / nutrição)', () => {
    const marcosDepois: Marco<'V7' | 'V1'>[] = [
      { limite: 7, tipo: 'V7' },
      { limite: 1, tipo: 'V1' },
    ]
    // já vencido há 10 dias: marco mais urgente (7) deve disparar, não o de 1
    const tipo = marcoMaisUrgenteAplicavel(marcosDepois, (limite) => 10 >= limite, new Set())
    expect(tipo).toBe('V7')
  })
})
