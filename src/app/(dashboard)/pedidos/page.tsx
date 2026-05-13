import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatarMoeda, formatarData } from '@/lib/utils'

export default async function PedidosPage() {
  const pedidos = await prisma.pedido.findMany({
    include: {
      cliente: { select: { nome: true } },
      usuario: { select: { nome: true } },
      itens: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const statusBadge: Record<string, string> = {
    PENDENTE: 'bg-yellow-100 text-yellow-700',
    EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
    CONCLUIDO: 'bg-green-100 text-green-700',
    CANCELADO: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <Header titulo="Pedidos de Venda" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</p>
          <Link
            href="/pedidos/novo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nº Pedido</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Itens</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Nenhum pedido encontrado
                    </td>
                  </tr>
                )}
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.cliente.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.itens.length}</td>
                    <td className="px-4 py-3 text-gray-600">{formatarData(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatarMoeda(Number(p.valorFinal))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status]}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/pedidos/${p.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}