import pkg from '../src/generated/prisma/index.js'
const { PrismaClient } = pkg

const prisma = new PrismaClient()

const hoje   = new Date('2026-06-09T03:00:00Z')
const amanha = new Date('2026-06-10T03:00:00Z')

const pedidos = await prisma.pedido.findMany({
  where: { createdAt: { gte: hoje, lt: amanha } },
  include: {
    cliente: { select: { nome: true } },
    usuario: { select: { nome: true, username: true } },
    itens:   { include: { modelo: { select: { nome: true } } } },
  },
  orderBy: { createdAt: 'asc' },
})

console.log(`\nPedidos 09/06/2026 (${pedidos.length} total):\n`)
pedidos.forEach(p => {
  const modelo = p.itens[0]?.modelo?.nome ?? '—'
  const hora   = p.createdAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const agr    = p.agr ?? '—'
  const user   = `${p.usuario.nome} (${p.usuario.username ?? p.usuario.nome})`
  console.log(`  ID: ${p.id}`)
  console.log(`  Número: ${p.numero} | Cliente: ${p.cliente.nome} | Modelo: ${modelo}`)
  console.log(`  Status: ${p.status} | AGR: ${agr} | Criado por: ${user} | Hora: ${hora}`)
  console.log(`  ---`)
})

await prisma.$disconnect()
