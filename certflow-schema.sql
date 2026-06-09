-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "TipoCertificado" AS ENUM ('A1', 'A3');

-- CreateEnum
CREATE TYPE "SuporteCertificado" AS ENUM ('TOKEN', 'CARTAO', 'NUVEM', 'ARQUIVO');

-- CreateEnum
CREATE TYPE "StatusCertificado" AS ENUM ('ATIVO', 'VENCIDO', 'CANCELADO', 'RENOVADO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEBER', 'PAGAR');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GERENTE', 'OPERADOR', 'FINANCEIRO', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "StatusEmail" AS ENUM ('PENDENTE', 'ENVIADO', 'ERRO');

-- CreateEnum
CREATE TYPE "TipoEmailAutomatico" AS ENUM ('VENCIMENTO_60', 'VENCIMENTO_30', 'VENCIMENTO_15', 'VENCIMENTO_7', 'POS_EMISSAO', 'NUTRICAO_3M', 'NUTRICAO_6M', 'NUTRICAO_9M');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "rg" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "razaoSocial" TEXT,
    "nomeFantasia" TEXT,
    "responsavel" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parceiroId" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parceiros" (
    "id" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "razaoSocial" TEXT,
    "tipo" TEXT NOT NULL,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "tipoConta" TEXT,
    "chavePix" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parceiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "parceiroId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valorFixo" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_certificado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "tipoCertificado" "TipoCertificado" NOT NULL,
    "suporte" "SuporteCertificado" NOT NULL,
    "validadeMeses" INTEGER NOT NULL DEFAULT 12,
    "preco" DECIMAL(10,2) NOT NULL,
    "codigoSafeweb" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "numeroSerie" TEXT,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusCertificado" NOT NULL DEFAULT 'ATIVO',
    "safewebId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "parceiroId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorFinal" DECIMAL(10,2) NOT NULL,
    "formaPagamento" TEXT,
    "boletoUrl" TEXT,
    "boletoCodigo" TEXT,
    "boletoVencimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnit" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "StatusLancamento" NOT NULL DEFAULT 'PENDENTE',
    "categoriaId" TEXT,
    "pedidoId" TEXT,
    "comprovante" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates_email" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEmailAutomatico" NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "certificadoId" TEXT,
    "tipo" "TipoEmailAutomatico" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "status" "StatusEmail" NOT NULL DEFAULT 'PENDENTE',
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "agendadoPara" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dados" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_token_key" ON "sessoes"("token");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "parceiros_cpf_key" ON "parceiros"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "parceiros_cnpj_key" ON "parceiros"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "comissoes_parceiroId_modeloId_key" ON "comissoes"("parceiroId", "modeloId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_key" ON "pedidos"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "templates_email_tipo_key" ON "templates_email"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "modelos_certificado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "modelos_certificado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "modelos_certificado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_certificadoId_fkey" FOREIGN KEY ("certificadoId") REFERENCES "certificados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
