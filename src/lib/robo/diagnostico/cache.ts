// Cache/dedup de diagnóstico + orçamento diário de investigações novas.
// Reaproveita o padrão Configuracao (chave/valor) já usado em heartbeat.ts e
// contarFalhaConfiguracaoRecente (verificacao-leve.ts) — sem tabela nova.

import { prisma } from '../../prisma'
import type { CategoriaAchado } from '../tipos'

const PREFIXO_DIAGNOSTICO = 'robo:diagnostico:'
const PREFIXO_ORCAMENTO = 'robo:diagnostico:gasto-diario:'

const TTL_MS: Partial<Record<CategoriaAchado, number>> = {
  JOB_ATRASADO: 12 * 60 * 60 * 1000,
  EMAIL_ERRO_CONFIGURACAO: 24 * 60 * 60 * 1000,
  EMAIL_ERRO_TRANSIENTE: 24 * 60 * 60 * 1000,
  SAFEWEB_CATALOGO: 24 * 60 * 60 * 1000,
  FINANCEIRO_RECONCILIACAO: 24 * 60 * 60 * 1000,
  SEGURANCA_TOKEN: 6 * 60 * 60 * 1000,
  PEDIDO_TRAVADO: 24 * 60 * 60 * 1000,
}
const TTL_PADRAO_MS = 24 * 60 * 60 * 1000

const LIMITE_DIARIO_PADRAO = 50

interface DiagnosticoCache {
  texto: string
  categoria: CategoriaAchado
  geradoEm: number
}

export async function buscarDiagnosticoCache(chaveDedup: string, categoria: CategoriaAchado): Promise<{ texto: string } | null> {
  const registro = await prisma.configuracao.findUnique({ where: { chave: `${PREFIXO_DIAGNOSTICO}${chaveDedup}` } })
  if (!registro?.valor) return null

  let dados: DiagnosticoCache
  try { dados = JSON.parse(registro.valor) } catch { return null }

  const ttl = TTL_MS[categoria] ?? TTL_PADRAO_MS
  if (Date.now() - dados.geradoEm > ttl) return null

  return { texto: dados.texto }
}

export async function salvarDiagnosticoCache(chaveDedup: string, categoria: CategoriaAchado, texto: string): Promise<void> {
  const chave = `${PREFIXO_DIAGNOSTICO}${chaveDedup}`
  const valor = JSON.stringify({ texto, categoria, geradoEm: Date.now() } satisfies DiagnosticoCache)
  await prisma.configuracao.upsert({
    where: { chave },
    update: { valor },
    create: { chave, valor },
  })
}

function chaveOrcamentoHoje(): string {
  const hoje = new Date().toISOString().slice(0, 10) // AAAA-MM-DD
  return `${PREFIXO_ORCAMENTO}${hoje}`
}

// Retorna true se ainda há orçamento pra uma nova investigação hoje, e já
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

// Flag de emergência — 'false' desliga a feature inteira sem novo deploy.
export async function diagnosticoAtivo(): Promise<boolean> {
  const registro = await prisma.configuracao.findUnique({ where: { chave: 'robo:diagnostico:ativo' } })
  return registro?.valor !== 'false'
}
