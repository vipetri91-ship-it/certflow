// Regras puras do cancelamento integrado (Frente B) — extraídas do endpoint
// para permitir testes automatizados sem dependência de banco/rede.

export const MOTIVOS_CANCELAMENTO = [
  'CLIENTE_DESISTIU',
  'NAO_COMPARECEU',
  'DADOS_INCORRETOS',
  'EMISSAO_DUPLICADA',
  'PROBLEMA_DOCUMENTAL',
  'TESTE_INTERNO',
  'OUTRO',
] as const

export type MotivoCancelamento = typeof MOTIVOS_CANCELAMENTO[number]

export const MOTIVOS_CANCELAMENTO_LABELS: Record<MotivoCancelamento, string> = {
  CLIENTE_DESISTIU: 'Cliente desistiu',
  NAO_COMPARECEU: 'Cliente não compareceu',
  DADOS_INCORRETOS: 'Dados incorretos',
  EMISSAO_DUPLICADA: 'Emissão duplicada',
  PROBLEMA_DOCUMENTAL: 'Problema documental',
  TESTE_INTERNO: 'Teste interno',
  OUTRO: 'Outro',
}

// ── Permissões ────────────────────────────────────────────────────────────────
// Trava fixa: apenas ADMIN e GERENTE podem cancelar. GERENTE depende ainda da
// permissão granular "monitor.cancelar" (configurável via tela de perfis).

export function podeCancelarPedido(role: string, monitorCancelarGerente: boolean): boolean {
  if (role === 'ADMIN') return true
  if (role === 'GERENTE') return monitorCancelarGerente
  return false
}

// ── Validação de status ──────────────────────────────────────────────────────

export type ValidacaoStatus =
  | { ok: true }
  | { ok: false; status: 400 | 409; erro: string }

export function validarStatusParaCancelamento(status: string): ValidacaoStatus {
  if (status === 'CANCELADO') return { ok: false, status: 409, erro: 'Pedido já está cancelado' }
  if (status === 'EMITIDO') return { ok: false, status: 400, erro: 'Não é possível cancelar um pedido já emitido' }
  return { ok: true }
}

// ── Interpretação do resultado da Safeweb ────────────────────────────────────

export interface ResultadoSafewebCancelamento {
  ok: boolean
  erro?: string
  tratadoComo?: 'sem_protocolo' | 'protocolo_ja_inexistente'
}

export type InterpretacaoSafeweb =
  | { prosseguir: true; resultado: ResultadoSafewebCancelamento }
  | { prosseguir: false; erro: string }

// V1: qualquer recusa/erro que não seja "protocolo não encontrado" interrompe o
// cancelamento (não cancela localmente). O campo `safewebCancelamentoPendente`
// (Pedido) está reservado para uma futura V2 de reprocessamento manual e não é
// utilizado por esta versão.
export function interpretarResultadoSafeweb(resultado: { ok: boolean; erro?: string }): InterpretacaoSafeweb {
  if (resultado.ok) return { prosseguir: true, resultado: { ok: true } }

  const erroNormalizado = (resultado.erro ?? '').toLowerCase()
  if (erroNormalizado.includes('não encontrado') || erroNormalizado.includes('nao encontrado')) {
    return { prosseguir: true, resultado: { ok: false, erro: resultado.erro, tratadoComo: 'protocolo_ja_inexistente' } }
  }

  return { prosseguir: false, erro: resultado.erro ?? 'Erro desconhecido' }
}
