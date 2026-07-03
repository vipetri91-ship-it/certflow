/**
 * Script pontual — recupera pedido que teve status regressado EMITIDO→VERIFICADO
 * pelo bug do webhook (Confirmação de Cadastro chegando depois da emissão).
 *
 * Uso: npx ts-node -e "require('./scripts/fix-pedido-emitido.ts')"
 * Ou via Railway: railway run npx tsx scripts/fix-pedido-emitido.ts
 */

import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const numeroPedido = 'PED-202607-39860'

  const pedido = await prisma.pedido.findFirst({
    where: { numero: numeroPedido },
    include: {
      certificados: true,
      lancamentos:  true,
      cliente:      { select: { nome: true } },
    },
  })

  if (!pedido) {
    console.error(`Pedido ${numeroPedido} não encontrado`)
    return
  }

  console.log(`Pedido: ${pedido.numero}`)
  console.log(`Cliente: ${pedido.cliente.nome}`)
  console.log(`Status atual: ${pedido.status}`)
  console.log(`Certificados: ${pedido.certificados.length}`)
  console.log(`Lançamentos: ${pedido.lancamentos.length}`)

  if (pedido.status === 'EMITIDO') {
    console.log('Pedido já está EMITIDO — nenhuma ação necessária.')
    return
  }

  if (pedido.certificados.length === 0) {
    console.error('ATENÇÃO: pedido sem certificado — não é seguro marcar EMITIDO sem ele. Verifique manualmente.')
    return
  }

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      status:    'EMITIDO',
      emitidoEm: pedido.certificados[0].dataEmissao,
    } as any,
  })

  console.log(`✅ Pedido ${numeroPedido} corrigido para EMITIDO`)
}

main().catch(console.error).finally(() => prisma.$disconnect())