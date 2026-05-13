// Script de migração executado automaticamente no build do Vercel
const { Client } = require('pg')

async function migrate() {
  const connectionString = process.env.DATABASE_URL?.replace(/^﻿/, '')
  if (!connectionString) { console.log('DATABASE_URL não definida, pulando migração'); return }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Conectado ao banco. Executando migrações...')

  const queries = [
    `ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'GERADO'`,
    `ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'VERIFICADO'`,
    `ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'EMITIDO'`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "agr" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "tipoAtendimento" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "numeroCompra" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "voucher" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "verificadoEm" TIMESTAMP(3)`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "emitidoEm" TIMESTAMP(3)`,
  ]

  for (const q of queries) {
    try { await client.query(q); console.log('OK:', q.slice(0, 60)) }
    catch (e) { console.log('Skip:', e.message.slice(0, 80)) }
  }

  await client.end()
  console.log('Migração concluída!')
}

migrate().catch(e => { console.error('Erro na migração:', e.message); process.exit(0) })