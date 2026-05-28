import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatarDataHora } from '@/lib/utils'
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { AuditoriaFiltros } from './filtros'

const ACAO_COR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN:  'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
}

interface SearchParams {
  page?: string
  acao?: string
  entidade?: string
  usuarioId?: string
  de?: string
  ate?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

const LIMIT = 50

export default async function AuditoriaPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'auditoria:read')) redirect('/dashboard')

  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1))

  const where: Record<string, unknown> = {}
  if (sp.acao) where.acao = sp.acao
  if (sp.entidade) where.entidade = sp.entidade
  if (sp.usuarioId) where.usuarioId = sp.usuarioId
  if (sp.de || sp.ate) {
    where.createdAt = {
      ...(sp.de ? { gte: new Date(sp.de + 'T00:00:00') } : {}),
      ...(sp.ate ? { lte: new Date(sp.ate + 'T23:59:59') } : {}),
    }
  }

  const [logs, total, usuarios] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { usuario: { select: { nome: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.auditLog.count({ where }),
    prisma.usuario.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ])

  const totalPaginas = Math.ceil(total / LIMIT)

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { page: String(page), acao: sp.acao, entidade: sp.entidade, usuarioId: sp.usuarioId, de: sp.de, ate: sp.ate, ...params }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    return `/configuracoes/auditoria?${p.toString()}`
  }

  return (
    <div>
      <Header titulo="Trilha de Auditoria" />
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">

        <AuditoriaFiltros
          usuarios={usuarios}
          acaoAtual={sp.acao ?? ''}
          entidadeAtual={sp.entidade ?? ''}
          usuarioAtual={sp.usuarioId ?? ''}
          deAtual={sp.de ?? ''}
          ateAtual={sp.ate ?? ''}
        />

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {total === 0 ? 'Nenhum registro' : `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            {totalPaginas > 1 && ` — página ${page} de ${totalPaginas}`}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Ação</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum registro encontrado com os filtros selecionados
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatarDataHora(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{log.usuario?.nome ?? 'Sistema'}</p>
                      {log.usuario?.email && <p className="text-xs text-gray-400">{log.usuario.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACAO_COR[log.acao] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.entidade}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden lg:table-cell">
                      {log.entidadeId ? log.entidadeId.slice(0, 14) + '...' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link href={buildUrl({ page: String(page - 1) })} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 border border-gray-100 rounded-lg text-sm text-gray-300 cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </span>
            )}

            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
                let p = i + 1
                if (totalPaginas > 7) {
                  if (page <= 4) p = i + 1
                  else if (page >= totalPaginas - 3) p = totalPaginas - 6 + i
                  else p = page - 3 + i
                }
                return (
                  <Link
                    key={p}
                    href={buildUrl({ page: String(p) })}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition ${p === page ? 'bg-blue-600 text-white font-medium' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </Link>
                )
              })}
            </div>

            {page < totalPaginas ? (
              <Link href={buildUrl({ page: String(page + 1) })} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Próxima <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 border border-gray-100 rounded-lg text-sm text-gray-300 cursor-not-allowed">
                Próxima <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
