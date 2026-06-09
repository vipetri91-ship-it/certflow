const { Client } = require('pg')
require('dotenv').config({ path: '.env.production.local' })

async function main() {
  const connectionString = process.env.DATABASE_URL?.replace(/^﻿/, '')
  if (!connectionString) { console.error('DATABASE_URL não definida'); process.exit(1) }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const { rows } = await client.query(`
    SELECT p.id, p.numero, p.status, p."valorFinal", p."createdAt",
           c.nome AS cliente
    FROM pedidos p
    JOIN clientes c ON c.id = p."clienteId"
    WHERE p."createdAt" >= '2026-06-08 03:00:00'
      AND p."createdAt" <  '2026-06-09 03:00:00'
    ORDER BY p."createdAt" ASC
  `)

  console.log(`\nPedidos de 08/06/2026 (${rows.length} total):\n`)
  rows.forEach(r => {
    const hora = new Date(r.createdAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    console.log(`  ${r.numero}  |  ${r.cliente}  |  R$ ${r.valorFinal}  |  ${r.status}  |  ${hora}  |  id: ${r.id}`)
  })

  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
