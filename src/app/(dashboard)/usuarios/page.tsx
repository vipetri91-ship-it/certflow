import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Shield } from 'lucide-react'
import { formatarData } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
  VISUALIZADOR: 'Visualizador',
}

const ROLE_COR: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  GERENTE: 'bg-blue-100 text-blue-700',
  OPERADOR: 'bg-green-100 text-green-700',
  FINANCEIRO: 'bg-yellow-100 text-yellow-700',
  VISUALIZADOR: 'bg-gray-100 text-gray-600',
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  if (!hasPermission(session.user.role, 'usuarios:read')) {
    redirect('/dashboard')
  }

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true, nome: true, email: true, role: true, ativo: true, createdAt: true,
    },
    orderBy: { nome: 'asc' },
  })

  return (
    <div>
      <Header titulo="Gerenciamento de Usuários" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
          {hasPermission(session.user.role, 'usuarios:write') && (
            <Link
              href="/usuarios/novo"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cadastrado em</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {u.nome[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.nome}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COR[u.role]}`}>
                      <Shield className="w-3 h-3" />
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatarData(u.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}