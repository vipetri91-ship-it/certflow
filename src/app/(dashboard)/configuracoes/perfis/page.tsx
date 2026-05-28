import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, Settings, ChevronRight } from 'lucide-react'

const PERFIS = [
  {
    role: 'ADMIN',
    label: 'Administrador',
    desc: 'Acesso total ao sistema. Pode configurar tudo.',
    cor: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: '👑',
  },
  {
    role: 'GERENTE',
    label: 'Gerente',
    desc: 'Acesso completo exceto configurações críticas do sistema.',
    cor: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '🎯',
  },
  {
    role: 'OPERADOR',
    label: 'Agente de Registro',
    desc: 'Emite certificados, atende clientes e gerencia renovações.',
    cor: 'bg-green-100 text-green-700 border-green-200',
    icon: '🏆',
  },
  {
    role: 'FINANCEIRO',
    label: 'Aux Financeiro',
    desc: 'Acesso ao módulo financeiro e relatórios.',
    cor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: '💰',
  },
  {
    role: 'VISUALIZADOR',
    label: 'Visualizador',
    desc: 'Somente leitura, sem permissão de edição.',
    cor: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: '👁️',
  },
]

export default async function PerfisPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div>
      <Header titulo="Perfis de Acesso" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{PERFIS.length} perfis disponíveis</p>
        </div>

        <div className="space-y-3">
          {PERFIS.map(p => (
            <div key={p.role}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition">

              {/* Ícone + info */}
              <div className="text-3xl shrink-0">{p.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-900">{p.label}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${p.cor}`}>
                    {p.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{p.desc}</p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/configuracoes/perfis/${p.role.toLowerCase()}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
                  <Shield className="w-3.5 h-3.5" />
                  Permissões
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">ℹ️ Como funcionam os perfis</p>
          <p className="text-xs leading-relaxed">
            Cada usuário recebe um perfil que define o que ele pode ver e fazer no sistema.
            As permissões são configuradas por módulo e subgrupo. O perfil <strong>Administrador</strong> tem acesso total e não pode ter permissões removidas.
          </p>
        </div>
      </div>
    </div>
  )
}
