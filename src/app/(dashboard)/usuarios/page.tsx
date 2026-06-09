import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Pencil, Shield } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  ADMIN:        'Administrador',
  GERENTE:      'Gerente',
  OPERADOR:     'Agente de Registro',
  FINANCEIRO:   'Aux Financeiro',
  VISUALIZADOR: 'Visualizador',
}

const ROLE_COR: Record<string, string> = {
  ADMIN:        'bg-purple-100 text-purple-700',
  GERENTE:      'bg-blue-100 text-blue-700',
  OPERADOR:     'bg-green-100 text-green-700',
  FINANCEIRO:   'bg-yellow-100 text-yellow-700',
  VISUALIZADOR: 'bg-gray-100 text-gray-600',
}

function Iniciais({ nome }: { nome: string }) {
  const ini = nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const cores = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
  const cor = cores[nome.charCodeAt(0) % cores.length]
  return (
    <div className={`w-9 h-9 rounded-full ${cor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {ini}
    </div>
  )
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'usuarios:read')) redirect('/dashboard')

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true, nome: true, username: true, email: true, role: true,
      ativo: true, createdAt: true, unidade: true,
      whatsapp: true, nomeAgrDs: true, comissao: true,
    },
    orderBy: { nome: 'asc' },
  })

  const ativos   = usuarios.filter(u => u.ativo).length
  const inativos = usuarios.filter(u => !u.ativo).length

  return (
    <div>
      <Header titulo="Usuários" />
      <div className="p-4 lg:p-6 space-y-4">

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',    valor: usuarios.length, cor: 'text-gray-800' },
            { label: 'Ativos',   valor: ativos,          cor: 'text-green-700' },
            { label: 'Inativos', valor: inativos,        cor: 'text-red-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-black ${c.cor}`}>{c.valor}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            {hasPermission(session.user.role, 'usuarios:write') && (
              <Link href="/configuracoes/perfis"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                <Shield className="w-4 h-4" /> Perfis de Acesso
              </Link>
            )}
            {hasPermission(session.user.role, 'usuarios:write') && (
              <Link href="/usuarios/novo"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                <UserPlus className="w-4 h-4" /> Novo Usuário
              </Link>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Login</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Comissão</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Iniciais nome={u.nome} />
                        <div>
                          <p className="font-medium text-gray-900">{u.nome}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.whatsapp && <p className="text-xs text-green-600">{u.whatsapp}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell font-mono">
                      {u.username || u.email?.split('@')[0] || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COR[u.role]}`}>
                        <Shield className="w-3 h-3" />
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell">
                      {u.unidade || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell">
                      {u.comissao ? `${Number(u.comissao).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.ativo ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasPermission(session.user.role, 'usuarios:write') && (
                        <Link href={`/usuarios/${u.id}/editar`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
                          <Pencil className="w-3 h-3" /> Editar
                        </Link>
                      )}
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