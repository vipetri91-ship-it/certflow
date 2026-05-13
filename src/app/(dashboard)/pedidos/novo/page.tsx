import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { NovoPedidoForm } from './form'

export default async function NovoPedidoPage() {
  const [clientes, modelos, parceiros] = await Promise.all([
    prisma.cliente.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, tipoPessoa: true, cpf: true, cnpj: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.modeloCertificado.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.parceiro.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  return (
    <div>
      <Header titulo="Novo Pedido" />
      <NovoPedidoForm
        clientes={clientes.map(c => ({
          ...c,
          cpf: c.cpf ?? undefined,
          cnpj: c.cnpj ?? undefined,
        }))}
        modelos={modelos.map(m => ({
          ...m,
          descricao: m.descricao ?? undefined,
          codigoSafeweb: m.codigoSafeweb ?? undefined,
          preco: Number(m.preco),
        }))}
        parceiros={parceiros}
      />
    </div>
  )
}