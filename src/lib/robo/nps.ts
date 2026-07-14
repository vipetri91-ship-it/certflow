// Compartilhado entre src/app/api/jobs/pesquisa-nps/route.ts (envio) e
// src/app/api/digisac/webhook/route.ts (captura da resposta) — evita
// importar de dentro de um route.ts, que o Next.js só espera exportar
// handlers HTTP e configs de rota.
export const MARCA_NPS_ENVIADA = 'Pesquisa NPS enviada'
