import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { UserPlus, Percent, Users } from 'lucide-react'
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

  // Agrupa por segmento (ramo de atuação), ordenando os grupos alfabeticamente
  // Parceiros sem segmento ficam em "Sem segmento"
  const grupos = parceiros.reduce<Record<string, typeof parceiros>>((acc, p) => {
    const grupo = p.segmento || 'Sem segmento'
    if (!acc[grupo]) acc[grupo] = []
    acc[grupo].push(p)
    return acc
  }, {})
  const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => {
    if (a === 'Sem segmento') return 1
    if (b === 'Sem segmento') return -1
    return a.localeCompare(b, 'pt-BR')
  })

  return (
    <div>
      <Header titulo="Parceiros Indicadores" />
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} ativo{parceiros.length !== 1 ? 's' : ''}
            {' '}em {gruposOrdenados.length} grupo{gruposOrdenados.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/parceiros/novo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <UserPlus className="w-4 h-4" />
            Novo Parceiro
          </Link>
        </div>

        {parceiros.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            Nenhum parceiro cadastrado
          </div>
        )}

        {gruposOrdenados.map(([grupo, lista]) => (
          <div key={grupo}>
            {/* Cabeçalho do grupo */}
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-500 shrink-0" />
              <h2 className="text-sm font-semibold text-gray-700">{grupo}</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {lista.length}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Cards do grupo */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lista.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.nome}</h3>
                      {p.nomeFantasia && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.nomeFantasia}</p>
                      )}
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

                  {p.tipoParceria && p.comissoes.filter(c => Number(c.percentual) > 0).length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
                        <Percent className="w-3 h-3" />
                        Comissões
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {p.comissoes.filter(c => Number(c.percentual) > 0).map((c) => (
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
        ))}
      </div>
    </div>
  )
}