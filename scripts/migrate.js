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
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "contabilidade" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "codigoCobranca" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "atendimentoExterno" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "valorDeslocamento" DECIMAL(10,2)`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "unidadeAtendimento" TEXT`,
    `ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "pisNis" TEXT`,
    `ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "ddd" TEXT`,
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT`,
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "nomeAgrDs" TEXT`,
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "unidade" TEXT`,
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "comissao" DECIMAL(5,2)`,
    `CREATE TABLE IF NOT EXISTS "historico_contatos" (
      "id" TEXT NOT NULL,
      "clienteId" TEXT NOT NULL,
      "certificadoId" TEXT,
      "observacao" TEXT NOT NULL,
      "dataContato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "proximoContato" TIMESTAMP(3),
      "usuarioId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "historico_contatos_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "historico_contatos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    // Garante que tabelas internas não tenham RLS bloqueando o Prisma
    `ALTER TABLE "configuracoes" DISABLE ROW LEVEL SECURITY`,
    // Novos campos do módulo financeiro
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "parceiroId" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "notaFiscal" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "boleto" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "referencia" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "tipoConta" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "centroCusto" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "formaPagamento" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "banco" TEXT`,
    // Integração Banco Inter
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "interCobrancaId" TEXT`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "pixCopiaECola" TEXT`,
  ]

  for (const q of queries) {
    try { await client.query(q); console.log('OK:', q.slice(0, 60)) }
    catch (e) { console.log('Skip:', e.message.slice(0, 80)) }
  }

  await client.end()
  console.log('Migração concluída!')
}

migrate().catch(e => { console.error('Erro na migração:', e.message); process.exit(0) })