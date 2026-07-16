// Robô de agendamento que substitui os crons da Vercel (vercel.json), desligados
// desde a migração para o Railway em 16/06/2026 — o Railway não lê esse arquivo.
// Roda como um serviço Railway separado, sempre ligado, e só chama as rotas
// /api/jobs/* já existentes (mesma autenticação por x-job-token / AUTH_SECRET).
//
// Fora deste worker, de propósito: /api/jobs/social-media exige sessão de
// usuário ADMIN (cookie), não token de robô — precisa de ajuste separado
// antes de poder ser agendado aqui (ver changelog de 25/06/2026).
const cron = require('node-cron')

const BASE_URL = process.env.JOB_BASE_URL || 'https://www.vazcertflow.com.br'
const TOKEN = process.env.AUTH_SECRET

if (!TOKEN) {
  console.error('[cron-worker] AUTH_SECRET não definida — encerrando.')
  process.exit(1)
}

async function dispararJob(nome, metodo) {
  const inicio = Date.now()
  try {
    const res = await fetch(`${BASE_URL}/api/jobs/${nome}`, {
      method: metodo,
      headers: { 'x-job-token': TOKEN },
    })
    const corpo = await res.text()
    console.log(`[cron-worker] ${nome} -> HTTP ${res.status} (${Date.now() - inicio}ms): ${corpo.slice(0, 500)}`)
  } catch (e) {
    console.error(`[cron-worker] ${nome} falhou: ${e.message}`)
  }
}

const jobs = [
  { nome: 'relatorio-diario', cronExpr: '0 21 * * *', metodo: 'POST' }, // 18h BRT diário
  { nome: 'processar-emails', cronExpr: '0 11 * * *', metodo: 'POST' }, // 8h BRT diário
  { nome: 'processar-whatsapp', cronExpr: '0 11 * * *', metodo: 'POST' }, // 8h BRT diário
  { nome: 'relatorio-atividade', cronExpr: '0 11 1 * *', metodo: 'GET' }, // 8h BRT, dia 1 do mês
  // Robô de auditoria interna (26/06/2026, a pedido do Vinicius) — verificação
  // leve a cada 20 min, auditoria profunda 1x/dia bem antes dos jobs de e-mail/
  // WhatsApp (8h BRT), pra não competir por recursos no mesmo horário.
  { nome: 'robo-verificacao-leve', cronExpr: '*/20 * * * *', metodo: 'POST' },
  { nome: 'robo-auditoria-profunda', cronExpr: '0 8 * * *', metodo: 'POST' }, // 5h BRT diário
  { nome: 'aniversario-parceiros', cronExpr: '0 12 * * *', metodo: 'POST' }, // 9h BRT diário
  // "Secretária" (a pedido do Vinicius, 14/07/2026) — Fase 1: briefing diário
  // proativo no Telegram + relatório semanal do setor AGR Digital (e-mail/WhatsApp).
  { nome: 'secretaria-diaria', cronExpr: '5 21 * * *', metodo: 'POST' }, // 18h05 BRT diário
  { nome: 'relatorio-semanal-agr-digital', cronExpr: '0 11 * * 1', metodo: 'POST' }, // 8h BRT segunda-feira
  // "Setores" (14/07/2026) — Auditor com relatório próprio + expansão do AGR
  // Digital com mais pontos de contato automático com o cliente.
  { nome: 'relatorio-semanal-auditor', cronExpr: '15 11 * * 1', metodo: 'POST' }, // 8h15 BRT segunda-feira
  { nome: 'lembrete-agendamento', cronExpr: '30 11 * * *', metodo: 'POST' }, // 8h30 BRT diário
  { nome: 'aniversario-clientes', cronExpr: '10 12 * * *', metodo: 'POST' }, // 9h10 BRT diário
  { nome: 'reativacao-clientes', cronExpr: '0 13 * * *', metodo: 'POST' }, // 10h BRT diário
  { nome: 'pesquisa-nps', cronExpr: '15 13 * * *', metodo: 'POST' }, // 10h15 BRT diário
  // Módulo de Performance/ICF (15/07/2026, a pedido do Vinicius) — roda no
  // fim do dia, depois que a produção do dia já foi lançada, pra fotografar
  // o indicador do mês e gerar as sugestões de IA que aparecem no dashboard.
  { nome: 'calcular-indicador-diario', cronExpr: '50 2 * * *', metodo: 'POST' }, // 23h50 BRT diário
  // Robô Financeiro (16/07/2026, a pedido do Vinicius) — cobrança de
  // vencidos com aprovação por Telegram. Roda de manhã, junto com os outros
  // robôs financeiros/de e-mail.
  { nome: 'robo-cobranca-financeira', cronExpr: '20 12 * * *', metodo: 'POST' }, // 9h20 BRT diário
]

for (const job of jobs) {
  cron.schedule(job.cronExpr, () => dispararJob(job.nome, job.metodo), { timezone: 'Etc/UTC' })
  console.log(`[cron-worker] agendado: ${job.nome} (${job.cronExpr} UTC, método ${job.metodo})`)
}

console.log(`[cron-worker] worker iniciado. Base URL: ${BASE_URL}`)
