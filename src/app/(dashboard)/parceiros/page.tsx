import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { UserPlus, Percent } from 'lucide-react'
import { formatarCPF, formatarCNPJ } from '@/lib/utils'

export default async function ParceirosPage() {
  const parceiros = await prisma.parceiro.findMany({
    where: { ativo: true },
    include: {
      _count: { select: { clientes: true, pedidos: true } },
      comissoes: { include: { modelo: { select: { nome: true } } } },
    },
    orderBy: { nome: 'asc' },
  })

  return (
    <div>
      <Header titulo="Parceiros Indicadores" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} ativo{parceiros.length !== 1 ? 's' : ''}</p>
          <Link
            href="/parceiros/novo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <UserPlus className="w-4 h-4" />
            Novo Parceiro
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {parceiros.length === 0 && (
            <div className="col-span-3 py-12 text-center text-gray-400">
              Nenhum parceiro cadastrado
            </div>
          )}
          {parceiros.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.nome}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {p.tipo}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{p.tipoPessoa}</span>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>{p.email ?? '—'}</p>
                <p className="font-mono text-xs">
                  {p.tipoPessoa === 'PF'
                    ? p.cpf ? formatarCPF(p.cpf) : '—'
                    : p.cnpj ? formatarCNPJ(p.cnpj) : '—'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{p._count.clientes} clientes indicados</span>
                <span>{p._count.pedidos} pedidos</span>
              </div>

              {p.comissoes.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
                    <Percent className="w-3 h-3" />
                    Comissões
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {p.comissoes.map((c) => (
                      <span key={c.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {c.modelo.nome}: {Number(c.percentual).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/parceiros/${p.id}`}
                  className="flex-1 text-center py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
                >
                  Ver detalhes
                </Link>
                <Link
                  href={`/parceiros/${p.id}/editar`}
                  className="flex-1 text-center py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}