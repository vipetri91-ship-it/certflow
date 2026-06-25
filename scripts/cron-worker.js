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
]

for (const job of jobs) {
  cron.schedule(job.cronExpr, () => dispararJob(job.nome, job.metodo), { timezone: 'Etc/UTC' })
  console.log(`[cron-worker] agendado: ${job.nome} (${job.cronExpr} UTC, método ${job.metodo})`)
}

console.log(`[cron-worker] worker iniciado. Base URL: ${BASE_URL}`)
