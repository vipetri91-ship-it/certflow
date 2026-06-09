-- Atualizar enum StatusPedido
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'GERADO';
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'VERIFICADO';
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'EMITIDO';

-- Adicionar novos campos ao Pedido
ALTER TABLE "pedidos"
  ADD COLUMN IF NOT EXISTS "agr" TEXT,
  ADD COLUMN IF NOT EXISTS "tipoAtendimento" TEXT,
  ADD COLUMN IF NOT EXISTS "numeroCompra" TEXT,
  ADD COLUMN IF NOT EXISTS "voucher" TEXT,
  ADD COLUMN IF NOT EXISTS "verificadoEm" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emitidoEm" TIMESTAMP(3);

-- Atualizar status existentes para novo enum
UPDATE "pedidos" SET status = 'GERADO' WHERE status = 'PENDENTE';
UPDATE "pedidos" SET status = 'EMITIDO' WHERE status = 'CONCLUIDO';
UPDATE "pedidos" SET status = 'GERADO' WHERE status = 'EM_ANDAMENTO';

SELECT 'Migração concluída!' as resultado;
