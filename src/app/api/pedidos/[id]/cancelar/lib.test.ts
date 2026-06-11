import { describe, it, expect } from 'vitest'
import {
  podeCancelarPedido,
  validarStatusParaCancelamento,
  interpretarResultadoSafeweb,
} from './lib'

describe('podeCancelarPedido', () => {
  it('ADMIN sempre pode cancelar', () => {
    expect(podeCancelarPedido('ADMIN', false)).toBe(true)
    expect(podeCancelarPedido('ADMIN', true)).toBe(true)
  })

  it('GERENTE com monitor.cancelar=true pode cancelar', () => {
    expect(podeCancelarPedido('GERENTE', true)).toBe(true)
  })

  it('GERENTE com monitor.cancelar=false não pode cancelar', () => {
    expect(podeCancelarPedido('GERENTE', false)).toBe(false)
  })

  it('OPERADOR, FINANCEIRO e VISUALIZADOR nunca podem cancelar, mesmo com permissão concedida', () => {
    expect(podeCancelarPedido('OPERADOR', true)).toBe(false)
    expect(podeCancelarPedido('FINANCEIRO', true)).toBe(false)
    expect(podeCancelarPedido('VISUALIZADOR', true)).toBe(false)
  })
})

describe('validarStatusParaCancelamento', () => {
  it('permite cancelar pedido GERADO', () => {
    expect(validarStatusParaCancelamento('GERADO')).toEqual({ ok: true })
  })

  it('permite cancelar pedido VERIFICADO', () => {
    expect(validarStatusParaCancelamento('VERIFICADO')).toEqual({ ok: true })
  })

  it('bloqueia cancelamento de pedido EMITIDO com 400', () => {
    expect(validarStatusParaCancelamento('EMITIDO')).toEqual({
      ok: false,
      status: 400,
      erro: 'Não é possível cancelar um pedido já emitido',
    })
  })

  it('bloqueia cancelamento duplo (pedido já CANCELADO) com 409', () => {
    expect(validarStatusParaCancelamento('CANCELADO')).toEqual({
      ok: false,
      status: 409,
      erro: 'Pedido já está cancelado',
    })
  })
})

describe('interpretarResultadoSafeweb', () => {
  it('cancelamento com sucesso prossegue normalmente', () => {
    expect(interpretarResultadoSafeweb({ ok: true })).toEqual({
      prosseguir: true,
      resultado: { ok: true },
    })
  })

  it('protocolo não encontrado é tratado como sucesso operacional', () => {
    expect(interpretarResultadoSafeweb({ ok: false, erro: 'Protocolo não encontrado' })).toEqual({
      prosseguir: true,
      resultado: { ok: false, erro: 'Protocolo não encontrado', tratadoComo: 'protocolo_ja_inexistente' },
    })
  })

  it('protocolo nao encontrado (sem acento) também é tratado como sucesso operacional', () => {
    expect(interpretarResultadoSafeweb({ ok: false, erro: 'Erro: protocolo nao encontrado na base' })).toEqual({
      prosseguir: true,
      resultado: { ok: false, erro: 'Erro: protocolo nao encontrado na base', tratadoComo: 'protocolo_ja_inexistente' },
    })
  })

  it('recusa de negócio interrompe o cancelamento', () => {
    expect(interpretarResultadoSafeweb({ ok: false, erro: 'Cancelamento recusado' })).toEqual({
      prosseguir: false,
      erro: 'Cancelamento recusado',
    })
  })

  it('falha de rede/timeout interrompe o cancelamento', () => {
    expect(interpretarResultadoSafeweb({ ok: false, erro: 'Timeout ao conectar com a Safeweb' })).toEqual({
      prosseguir: false,
      erro: 'Timeout ao conectar com a Safeweb',
    })
  })
})
