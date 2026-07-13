import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { UserPlus, Users, Pencil } from 'lucide-react'
import { formatarCPF, formatarCNPJ } from '@/lib/utils'
import { BotaoExcluirParceiro } from './botao-excluir'

export default async function ParceirosPage() {
  const parceiros = await prisma.parceiro.findMany({
    where: { ativo: true },
    include: {
      _count: { select: { clientes: true, pedidos: true } },
    },
    orderBy: { nome: 'asc' },
  })

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
    <div className="flex flex-col h-full">
      <Header titulo="Parceiros Indicadores" />

      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {parceiros.length} parceiro{parceiros.length !== 1 ? 's' : ''} · {gruposOrdenados.length} grupo{gruposOrdenados.length !== 1 ? 's' : ''}
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
          <div className="py-12 text-center text-gray-400">Nenhum parceiro cadastrado</div>
        )}
      </div>

      {/* Kanban — scroll horizontal */}
      <div className="flex-1 overflow-x-auto px-4 lg:px-6 pb-6">
        <div className="flex gap-4 min-w-max">
          {gruposOrdenados.map(([grupo, lista]) => (
            <div key={grupo} className="flex flex-col w-64 shrink-0">
              {/* Cabeçalho da coluna */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs font-semibold text-gray-600 truncate">{grupo}</span>
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                  {lista.length}
                </span>
              </div>

              {/* Cards da coluna */}
              <div className="flex flex-col gap-2">
                {lista.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 hover:shadow-md transition"
                  >
                    {/* Nome + ações */}
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                        {p.nomeFantasia && (
                          <p className="text-xs text-gray-400 truncate">{p.nomeFantasia}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Link
                          href={`/parceiros/${p.id}/editar`}
                          title="Editar"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <BotaoExcluirParceiro id={p.id} nome={p.nome} />
                      </div>
                    </div>

                    {/* CPF/CNPJ */}
                    <p className="font-mono text-xs text-gray-400 mb-2">
                      {p.tipoPessoa === 'PF'
                        ? p.cpf ? formatarCPF(p.cpf) : '—'
                        : p.cnpj ? formatarCNPJ(p.cnpj) : '—'}
                    </p>

                    {/* Stats + link */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>{p._count.clientes} clientes</span>
                        <span>{p._count.pedidos} pedidos</span>
                      </div>
                      <Link
                        href={`/parceiros/${p.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Ver
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
