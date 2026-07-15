// Vocabulário compartilhado entre os robôs de checagem (verificacao-leve,
// auditoria-profunda) e o diagnosticador de IA (src/lib/robo/diagnostico/).
// Sem dependência do Anthropic SDK aqui de propósito — os robôs de checagem
// continuam podendo rodar sem nenhum acoplamento com IA.

export type CategoriaAchado =
  | 'JOB_ATRASADO'
  | 'EMAIL_ERRO_CONFIGURACAO'
  | 'EMAIL_ERRO_TRANSIENTE'
  | 'EMAIL_ERRO_PERMANENTE'
  | 'FINANCEIRO_RECONCILIACAO'
  | 'SAFEWEB_CATALOGO'
  | 'SEGURANCA_TOKEN'
  | 'PEDIDO_TRAVADO'

export interface AchadoRobo {
  texto: string
  categoria: CategoriaAchado
  // Chave estável (sem contagem/horário embutido) que identifica o mesmo
  // "tipo de incidente" entre execuções — usada pra cache/dedup do
  // diagnóstico de IA. Ex: "email-config:VENCIMENTO_7", "job-atrasado:processar-emails".
  chaveDedup: string
  // false para achados já autoexplicados pela própria regra determinística
  // (ex: hard bounce — "endereço errado, corrija o cadastro" já é a causa e
  // a solução; investigar com IA seria desperdício de tokens sem ganho).
  investigavel: boolean
}

export function achado(
  texto: string,
  categoria: CategoriaAchado,
  chaveDedup: string,
  opts?: { investigavel?: boolean }
): AchadoRobo {
  return { texto, categoria, chaveDedup, investigavel: opts?.investigavel ?? true }
}
