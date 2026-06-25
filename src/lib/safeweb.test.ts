import { describe, it, expect } from 'vitest'
import { encontrarNosprodutos, type FiltrosProduto } from './safeweb'

// Catálogo real (idTipoEmissao=3) capturado direto da API GetListProdutoByAR
// em 25/06/2026, durante a auditoria do incidente de protocolo errado —
// usado como fixture pra travar essa regra pra sempre.
const CATALOGO_VIDEOCONFERENCIA = [
  { idProduto: 41751, Nome: 'e-CPF', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'Sem mídia', ProdutoValidade: '1 Ano', DiasPeriodoUso: null },
  { idProduto: 41764, Nome: 'e-CPF', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'Sem mídia', ProdutoValidade: '2 Anos', DiasPeriodoUso: null },
  { idProduto: 141568, Nome: 'SafeAgro + SafeID e-CPF', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'PSC', ProdutoValidade: '2 Anos', DiasPeriodoUso: 365 },
  { idProduto: 142447, Nome: 'SafeID e-CPF', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'PSC', ProdutoValidade: '2 Anos', DiasPeriodoUso: 365 },
  { idProduto: 142725, Nome: 'SafeID e-CPF', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'PSC', ProdutoValidade: '2 Anos', DiasPeriodoUso: 730 },
  { idProduto: 142448, Nome: 'SafeID e-CPF', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'PSC', ProdutoValidade: '2 Anos', DiasPeriodoUso: 120 },
]

describe('encontrarNosprodutos — incidente de 25/06/2026 (produto Safeweb errado)', () => {
  it('e-CPF A3 NUVEM 4 meses encontra o idProduto correto (142448), não o "Sem mídia" 1 Ano', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 4, suporte: 'NUVEM' }
    const produto = encontrarNosprodutos(CATALOGO_VIDEOCONFERENCIA, 'e-CPF', 'A3', filtros)
    expect(produto?.idProduto).toBe(142448)
  })

  it('e-CPF A3 NUVEM 1 ano encontra o idProduto 142447, não o de 4 meses nem o de 2 anos', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 12, suporte: 'NUVEM' }
    const produto = encontrarNosprodutos(CATALOGO_VIDEOCONFERENCIA, 'e-CPF', 'A3', filtros)
    expect(produto?.idProduto).toBe(142447)
  })

  it('e-CPF A3 NUVEM 2 anos encontra o idProduto 142725', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 24, suporte: 'NUVEM' }
    const produto = encontrarNosprodutos(CATALOGO_VIDEOCONFERENCIA, 'e-CPF', 'A3', filtros)
    expect(produto?.idProduto).toBe(142725)
  })

  it('e-CPF A3 SEM MÍDIA 1 ano (suporte não informado) encontra o idProduto 41751 — nunca um produto PSC', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 12 }
    const produto = encontrarNosprodutos(CATALOGO_VIDEOCONFERENCIA, 'e-CPF', 'A3', filtros)
    expect(produto?.idProduto).toBe(41751)
  })

  it('não existe NUVEM de 6 meses no catálogo — não deve "chutar" um produto parecido', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 6, suporte: 'NUVEM' }
    const produto = encontrarNosprodutos(CATALOGO_VIDEOCONFERENCIA, 'e-CPF', 'A3', filtros)
    expect(produto).toBeUndefined()
  })

  it('nunca escolhe "SafeAgro + SafeID e-CPF" para um modelo normal de Nuvem, mesmo com critérios idênticos', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 12, suporte: 'NUVEM' }
    const produto = encontrarNosprodutos(CATALOGO_VIDEOCONFERENCIA, 'e-CPF', 'A3', filtros)
    expect(produto?.Nome).not.toContain('SafeAgro')
    expect(produto?.idProduto).toBe(142447)
  })
})

// Catálogo real (idTipoEmissao=1, presencial) capturado em 25/06/2026 —
// achado durante a auditoria geral de todos os modelos: cartão simples e
// cartão+leitora têm os mesmos ProdutoTipo/ProdutoModelo/MidiaTipo, só o
// campo `Acessorio` distingue os dois.
const CATALOGO_PRESENCIAL_CARTAO = [
  { idProduto: 41754, Nome: 'e-CPF A3 + cartão', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'Cartão', ProdutoValidade: '2 Anos', Acessorio: null },
  { idProduto: 41737, Nome: 'e-CPF A3 + cartão', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'Cartão', ProdutoValidade: '1 Ano', Acessorio: null },
  { idProduto: 41736, Nome: 'e-CPF A3 + cartão + leitora', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'Cartão', ProdutoValidade: '1 Ano', Acessorio: 'Leitora' },
  { idProduto: 41755, Nome: 'e-CPF A3 + cartão + leitora', ProdutoTipo: 'e-CPF', ProdutoModelo: 'A3', MidiaTipo: 'Cartão', ProdutoValidade: '2 Anos', Acessorio: 'Leitora' },
]

describe('encontrarNosprodutos — Cartão vs Cartão+Leitora (achado na auditoria de 25/06/2026)', () => {
  it('modelo "em Cartão" (sem leitora) nunca pega o produto com leitora', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 12, suporte: 'CARTAO', comLeitora: false }
    const produto = encontrarNosprodutos(CATALOGO_PRESENCIAL_CARTAO, 'e-CPF', 'A3', filtros)
    expect(produto?.idProduto).toBe(41737)
    expect(produto?.Acessorio).toBeNull()
  })

  it('modelo "Cartão + Leitora" sempre pega o produto com Acessorio=Leitora', () => {
    const filtros: FiltrosProduto = { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 12, suporte: 'CARTAO', comLeitora: true }
    const produto = encontrarNosprodutos(CATALOGO_PRESENCIAL_CARTAO, 'e-CPF', 'A3', filtros)
    expect(produto?.idProduto).toBe(41736)
    expect(produto?.Acessorio).toBe('Leitora')
  })

  it('mesma distinção vale para 24 meses', () => {
    const semLeitora = encontrarNosprodutos(CATALOGO_PRESENCIAL_CARTAO, 'e-CPF', 'A3', { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 24, suporte: 'CARTAO', comLeitora: false })
    const comLeitora = encontrarNosprodutos(CATALOGO_PRESENCIAL_CARTAO, 'e-CPF', 'A3', { tipoPessoa: 'PF', tipoCertificado: 'A3', validadeMeses: 24, suporte: 'CARTAO', comLeitora: true })
    expect(semLeitora?.idProduto).toBe(41754)
    expect(comLeitora?.idProduto).toBe(41755)
  })
})
