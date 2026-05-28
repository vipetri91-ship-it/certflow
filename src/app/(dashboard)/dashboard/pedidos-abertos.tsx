import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ClipboardList, ArrowRight } from 'lucide-react'

const STATUS_COR: Record<string, string> = {
  GERADO:    'bg-blue-100 text-blue-700',
  VERIFICADO: 'bg-yellow-100 text-yellow-700',
}
const STATUS_LABEL: Record<string, string> = {
  GERADO:    'Aguardando',
  VERIFICADO: 'Verificado',
}

function diasAtras(d: Date): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  return `${diff}d atrás`
}

export async function PedidosAbertos() {
  const pedidos = await prisma.pedido.findMany({
    where:   { status: { in: ['GERADO', 'VERIFICADO'] } },
    include: {
      cliente: { select: { nome: true, razaoSocial: true } },
      itens:   { take: 1, include: { modelo: { select: { nome: true } } } },
    },
    orderBy: { createdAt: 'asc' },
    take: 6,
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pedidos em Aberto</p>
          {pedidos.length > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pedidos.length}
            </span>
          )}
        </div>
        <Link href="/pedidos/monitoramento"
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
          Nenhum pedido aguardando emissão
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-slate-700">
          {pedidos.map(p => {
            const nomeCliente = p.cliente.razaoSocial ?? p.cliente.nome
            const modelo      = p.itens[0]?.modelo?.nome ?? '—'
            return (
              <Link key={p.id} href="/pedidos/monitoramento"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{nomeCliente}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{modelo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 dark:text-slate-500">{diasAtras(p.createdAt)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
