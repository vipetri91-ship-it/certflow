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
    `CREATE TABLE IF NOT EXISTS "sessao_atividade" (
      "id"            TEXT NOT NULL,
      "usuarioId"     TEXT NOT NULL,
      "data"          TIMESTAMP(3) NOT NULL,
      "minutosAtivos" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "sessao_atividade_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "sessao_atividade_usuarioId_data_key" UNIQUE ("usuarioId", "data"),
      CONSTRAINT "sessao_atividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE
    )`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "safewebProtocolo" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "hopeUrlDocumentos" TEXT`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "popupNotificacaoVisto" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "safewebSerieA3" TEXT`,
    // Login por username — adiciona campo e faz backfill a partir do email existente
    `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "username" TEXT`,
    `UPDATE "usuarios" SET username = email WHERE username IS NULL`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_username_key') THEN ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_username_key" UNIQUE ("username"); END IF; END $$`,
    `ALTER TABLE "usuarios" ALTER COLUMN "email" DROP NOT NULL`,
    // Remove domínio do email nas usernames que ainda têm '@' (ex: joao@exemplo.com → joao)
    `UPDATE "usuarios" SET username = SPLIT_PART(username, '@', 1) WHERE username LIKE '%@%'`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "whatsappVencimentoAtivo" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "emailVencimentoAtivo" BOOLEAN NOT NULL DEFAULT true`,
    // Cancelamento Integrado — Frente B
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "canceladoEm" TIMESTAMP(3)`,
    `ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "safewebCancelamentoPendente" BOOLEAN NOT NULL DEFAULT false`,
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

    // ─── Frente D — Histórico Inteligente de Certificados (Fase 2, schema only) ──

    // Novos status de Certificado
    `ALTER TYPE "StatusCertificado" ADD VALUE IF NOT EXISTS 'NAO_RENOVADO'`,
    `ALTER TYPE "StatusCertificado" ADD VALUE IF NOT EXISTS 'REVOGADO'`,

    // Novos enums para Renovação Manual
    `DO $$ BEGIN
       CREATE TYPE "StatusRenovacaoManual" AS ENUM ('PROSPECT','CONVERTIDA','DESCARTADA');
     EXCEPTION WHEN duplicate_object THEN null;
     END $$`,
    `DO $$ BEGIN
       CREATE TYPE "OrigemRenovacaoManual" AS ENUM ('MANUAL','IMPORTADO','CERTIFICADO');
     EXCEPTION WHEN duplicate_object THEN null;
     END $$`,

    // Certificado — renovação encadeada
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "certificadoAnteriorId" TEXT`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificados_certificadoAnteriorId_key') THEN
         ALTER TABLE "certificados" ADD CONSTRAINT "certificados_certificadoAnteriorId_key" UNIQUE ("certificadoAnteriorId");
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificados_certificadoAnteriorId_fkey') THEN
         ALTER TABLE "certificados" ADD CONSTRAINT "certificados_certificadoAnteriorId_fkey"
           FOREIGN KEY ("certificadoAnteriorId") REFERENCES "certificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
       END IF;
     END $$`,

    // Certificado — Não Renovou
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "motivoNaoRenovacao" TEXT`,
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "naoRenovadoEm" TIMESTAMP(3)`,
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "naoRenovadoPorId" TEXT`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificados_naoRenovadoPorId_fkey') THEN
         ALTER TABLE "certificados" ADD CONSTRAINT "certificados_naoRenovadoPorId_fkey"
           FOREIGN KEY ("naoRenovadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
       END IF;
     END $$`,

    // Certificado — Revogação
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "motivoRevogacao" TEXT`,
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "revogadoEm" TIMESTAMP(3)`,
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "revogadoPorId" TEXT`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificados_revogadoPorId_fkey') THEN
         ALTER TABLE "certificados" ADD CONSTRAINT "certificados_revogadoPorId_fkey"
           FOREIGN KEY ("revogadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
       END IF;
     END $$`,

    // Índice de apoio ao matching de renovação (cliente + modelo + status)
    `CREATE INDEX IF NOT EXISTS "certificados_cliente_modelo_status_idx" ON "certificados" ("clienteId", "modeloId", "status")`,

    // Lancamento — bonificação
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "bonificado" BOOLEAN NOT NULL DEFAULT false`,

    // Tabela de Renovações Manuais (Controle de Vencimentos — origem fora da V&G)
    `CREATE TABLE IF NOT EXISTS "renovacoes_manuais" (
      "id" TEXT NOT NULL,
      "clienteId" TEXT,
      "nome" TEXT NOT NULL,
      "cpfCnpj" TEXT,
      "telefone" TEXT,
      "email" TEXT,
      "tipoPessoa" "TipoPessoa",
      "modeloDescricao" TEXT,
      "dataVencimento" TIMESTAMP(3) NOT NULL,
      "observacoes" TEXT,
      "origem" "OrigemRenovacaoManual" NOT NULL DEFAULT 'MANUAL',
      "status" "StatusRenovacaoManual" NOT NULL DEFAULT 'PROSPECT',
      "certificadoConvertidoId" TEXT,
      "convertidoEm" TIMESTAMP(3),
      "encerradoEm" TIMESTAMP(3),
      "criadoPorId" TEXT,
      "responsavelId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "renovacoes_manuais_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "renovacoes_manuais_certificadoConvertidoId_key" UNIQUE ("certificadoConvertidoId"),
      CONSTRAINT "renovacoes_manuais_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL,
      CONSTRAINT "renovacoes_manuais_certificadoConvertidoId_fkey" FOREIGN KEY ("certificadoConvertidoId") REFERENCES "certificados"("id") ON DELETE SET NULL,
      CONSTRAINT "renovacoes_manuais_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL,
      CONSTRAINT "renovacoes_manuais_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS "renovacoes_manuais_cpfcnpj_status_idx" ON "renovacoes_manuais" ("cpfCnpj", "status")`,
    `CREATE INDEX IF NOT EXISTS "renovacoes_manuais_status_idx" ON "renovacoes_manuais" ("status")`,
    `ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "entregueEm" TIMESTAMP(3)`,
    `ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "abertoEm" TIMESTAMP(3)`,
    `ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "clicadoEm" TIMESTAMP(3)`,
    `ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "motivoFalha" TEXT`,
    `ALTER TABLE "certificados" ADD COLUMN IF NOT EXISTS "valorManual" DECIMAL(10,2)`,
    `DO $$ BEGIN
      CREATE TYPE "StatusPendenciaProjeto" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO');
     EXCEPTION WHEN duplicate_object THEN null; END $$`,
    `CREATE TABLE IF NOT EXISTS "pendencias_projeto" (
      "id" TEXT NOT NULL,
      "titulo" TEXT NOT NULL,
      "descricao" TEXT,
      "status" "StatusPendenciaProjeto" NOT NULL DEFAULT 'PENDENTE',
      "origem" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "concluidoEm" TIMESTAMP(3),
      CONSTRAINT "pendencias_projeto_pkey" PRIMARY KEY ("id")
    )`,
    `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "interCodigoSolicitacao" TEXT`,
    `ALTER TYPE "TipoEmailAutomatico" ADD VALUE IF NOT EXISTS 'COBRANCA_FINANCEIRA'`,
    `CREATE TABLE IF NOT EXISTS "comissoes_fechamento" (
      "id" TEXT NOT NULL,
      "parceiroId" TEXT NOT NULL,
      "mes" INTEGER NOT NULL,
      "ano" INTEGER NOT NULL,
      "valorTotal" DECIMAL(10,2) NOT NULL,
      "qtdPedidos" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDENTE',
      "lancamentoId" TEXT,
      "pagoEm" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "comissoes_fechamento_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "comissoes_fechamento_lancamentoId_key" UNIQUE ("lancamentoId"),
      CONSTRAINT "comissoes_fechamento_parceiroId_mes_ano_key" UNIQUE ("parceiroId", "mes", "ano"),
      CONSTRAINT "comissoes_fechamento_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id"),
      CONSTRAINT "comissoes_fechamento_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamentos"("id")
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