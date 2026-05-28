'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
} from 'lucide-react'
import { formatarCPF, formatarCNPJ, formatarTelefone } from '@/lib/utils'

interface ClienteRow {
  id: string
  tipoPessoa: 'PF' | 'PJ'
  nome: string
  razaoSocial?: string | null
  nomeFantasia?: string | null
  email?: string
  celular?: string
  cpf?: string
  cnpj?: string
  grupo?: string | null
  parceiro?: { nome: string }
  _count: { certificados: number }
}

interface Props {
  clientes: ClienteRow[]
  total: number
  pagina: number
  porPagina: number
}

export function ClientesTabela({ clientes, total, pagina, porPagina }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [busca, setBusca] = useState(searchParams.get('q') ?? '')
  const [tipo,  setTipo]  = useState(searchParams.get('tipo')  ?? '')
  const [grupo, setGrupo] = useState(searchParams.get('grupo') ?? '')
  const [, startTransition] = useTransition()

  function navegar(novoParams: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(novoParams).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    params.set('page', '1')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function aplicarBusca(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    navegar({ q: busca, tipo, grupo })
  }

  const totalPaginas = Math.ceil(total / porPagina)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <form
        onSubmit={aplicarBusca}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, CPF, CNPJ ou e-mail..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="w-36">
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos</option>
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
        </div>

        <div className="w-44">
          <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
          <input
            type="text"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            placeholder="Nome do grupo..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition"
        >
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contato</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Grupo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Parceiro</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Certs.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          cliente.tipoPessoa === 'PJ'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {cliente.tipoPessoa === 'PJ' ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {cliente.tipoPessoa === 'PJ'
                            ? (cliente.razaoSocial || cliente.nome)
                            : cliente.nome}
                        </p>
                        <p className="text-xs text-gray-400">
                          {cliente.tipoPessoa === 'PJ'
                            ? (cliente.nomeFantasia || 'Pessoa Jurídica')
                            : 'Pessoa Física'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {cliente.tipoPessoa === 'PF'
                      ? cliente.cpf
                        ? formatarCPF(cliente.cpf)
                        : '—'
                      : cliente.cnpj
                        ? formatarCNPJ(cliente.cnpj)
                        : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{cliente.email ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {cliente.celular ? formatarTelefone(cliente.celular) : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {cliente.grupo
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{cliente.grupo}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {cliente.parceiro?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-full font-semibold text-xs">
                      {cliente._count.certificados}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/clientes/${cliente.id}/editar`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={pagina <= 1}
                onClick={() => navegar({ page: String(pagina - 1) })}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs text-gray-700">
                {pagina} / {totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas}
                onClick={() => navegar({ page: String(pagina + 1) })}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}