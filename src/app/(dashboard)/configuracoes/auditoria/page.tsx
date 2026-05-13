import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { formatarDataHora } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'

const ACAO_COR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  VIEW: 'bg-gray-100 text-gray-500',
}

export default async function AuditoriaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'auditoria:read')) redirect('/dashboard')

  const logs = await prisma.auditLog.findMany({
    include: { usuario: { select: { nome: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div>
      <Header titulo="Trilha de Auditoria" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Histórico completo de todas as ações realizadas no sistema. Últimas 100 entradas.
        </p>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Ação</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum registro de auditoria
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs">{formatarDataHora(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{log.usuario?.nome ?? 'Sistema'}</p>
                      <p className="text-xs text-gray-400">{log.usuario?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACAO_COR[log.acao] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.entidade}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.entidadeId?.slice(0, 12)}...</td>
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