// Orçamento diário + interruptor de emergência do Robô Financeiro — mesmo
// padrão já usado pelo Robô Diagnosticador (src/lib/robo/diagnostico/cache.ts),
// reaproveitando a tabela Configuracao (chave/valor), com chaves próprias
// pra não misturar os dois orçamentos.
import { prisma } from '../prisma'

const PREFIXO_ORCAMENTO = 'robo:cobranca:gasto-diario:'
const LIMITE_DIARIO_PADRAO = 50

function chaveOrcamentoHoje(): string {
  const hoje = new Date().toISOString().slice(0, 10) // AAAA-MM-DD
  return `${PREFIXO_ORCAMENTO}${hoje}`
}

// Retorna true se ainda há orçamento pra um rascunho novo hoje, e já
// incrementa o contador (evita condição de corrida entre checar e gastar).
export async function reservarOrcamentoDiario(): Promise<boolean> {
  const chave = chaveOrcamentoHoje()
  const registro = await prisma.configuracao.findUnique({ where: { chave } })
  const usado = registro?.valor ? Number(registro.valor) || 0 : 0

  if (usado >= LIMITE_DIARIO_PADRAO) return false

  await prisma.configuracao.upsert({
    where: { chave },
    update: { valor: String(usado + 1) },
    create: { chave, valor: '1' },
  })
  return true
}

// Flag de emergência — 'false' desliga a geração de rascunhos novos sem
// precisar de deploy (não afeta reforços de lembrete já pendentes).
export async function cobrancaRoboAtivo(): Promise<boolean> {
  const registro = await prisma.configuracao.findUnique({ where: { chave: 'robo:cobranca:ativo' } })
  return registro?.valor !== 'false'
}
