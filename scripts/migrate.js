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
    // Grupos de clientes
    `ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "grupo" TEXT`,
    // Integração Safeweb — status do último evento recebido via webhook
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "safewebStatus" TEXT`,
    // Módulo Parceiros — campos extras
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "nomeFantasia" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "nivel" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "tipoParceria" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "renovacoes" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "responsavelId" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "contadorResponsavel" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "pessoaContato" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "emailAlternativo" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "telefone2" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "informacoesEnvio" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "tipoComissao" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "diaPagamento" INTEGER`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "loginParceiro" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "senhaParceiro" TEXT`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "statusPainel" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "permissoesPainel" JSONB`,
    // Unique em loginParceiro (ignora se já existir)
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parceiros_loginParceiro_key') THEN ALTER TABLE "parceiros" ADD CONSTRAINT "parceiros_loginParceiro_key" UNIQUE ("loginParceiro"); END IF; END $$`,
    // Tabela de contatos do parceiro
    `CREATE TABLE IF NOT EXISTS "contatos_parceiro" (
      "id" TEXT NOT NULL,
      "parceiroId" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "cpf" TEXT,
      "cargo" TEXT,
      "dataNascimento" TIMESTAMP(3),
      "telefone" TEXT,
      "email" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "contatos_parceiro_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "contatos_parceiro_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    // Comissões — novos campos
    `ALTER TABLE "comissoes" ALTER COLUMN "percentual" DROP NOT NULL`,
    `ALTER TABLE "comissoes" ADD COLUMN IF NOT EXISTS "valorCusto" DECIMAL(10,2)`,
    `ALTER TABLE "comissoes" ADD COLUMN IF NOT EXISTS "valorCliente" DECIMAL(10,2)`,
    // Notícias / Comunicados
    `CREATE TABLE IF NOT EXISTS "noticias" (
      "id" TEXT NOT NULL,
      "titulo" TEXT NOT NULL,
      "resumo" TEXT,
      "conteudo" TEXT NOT NULL,
      "categoria" TEXT NOT NULL DEFAULT 'Avisos',
      "publicada" BOOLEAN NOT NULL DEFAULT false,
      "fixada" BOOLEAN NOT NULL DEFAULT false,
      "autorNome" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "noticias_pkey" PRIMARY KEY ("id")
    )`,
    // SST — Segurança e Saúde no Trabalho
    `CREATE TABLE IF NOT EXISTS "sst_historico" (
      "id" TEXT NOT NULL,
      "leadId" TEXT NOT NULL,
      "texto" TEXT NOT NULL,
      "autorNome" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "sst_historico_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "sst_leads" (
      "id" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "empresa" TEXT,
      "cnpj" TEXT,
      "telefone" TEXT,
      "email" TEXT,
      "funcionarios" INTEGER,
      "laudos" TEXT,
      "valorEstimado" DECIMAL(10,2),
      "parcelas" INTEGER,
      "origem" TEXT,
      "etapa" TEXT NOT NULL DEFAULT 'PROSPECCAO',
      "observacoes" TEXT,
      "responsavelNome" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "sst_leads_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "orcamentos" (
      "id"           TEXT NOT NULL,
      "destinatario" TEXT NOT NULL,
      "itens"        JSONB NOT NULL DEFAULT '[]',
      "formas"       TEXT[] NOT NULL DEFAULT '{}',
      "total"        DECIMAL(10,2) NOT NULL DEFAULT 0,
      "geradoPor"    TEXT,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "orcamentos_geradoPor_fkey" FOREIGN KEY ("geradoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "posts_social" (
      "id"        TEXT NOT NULL,
      "categoria" TEXT NOT NULL,
      "semana"    INTEGER NOT NULL DEFAULT 1,
      "diaSemana" TEXT NOT NULL,
      "headline"  TEXT NOT NULL,
      "legenda"   TEXT NOT NULL,
      "hashtags"  TEXT NOT NULL DEFAULT '',
      "status"    TEXT NOT NULL DEFAULT 'PENDENTE',
      "criadoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "posts_social_pkey" PRIMARY KEY ("id")
    )`,
  ]

  for (const q of queries) {
    try { await client.query(q); console.log('OK:', q.slice(0, 60)) }
    catch (e) { console.log('Skip:', e.message.slice(0, 80)) }
  }

  await client.end()
  console.log('Migração concluída!')
}

migrate().catch(e => { console.error('Erro na migração:', e.message); process.exit(0) })