import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { listarMetas } from '@/lib/performance/metas'
import { NovaMetaForm } from './form'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export default async function MetasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:write')) redirect('/performance')

  const metas = await listarMetas()
  const hoje = new Date()

  return (
    <div>
      <Header titulo="Metas de Produção" />
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <NovaMetaForm mesAtual={hoje.getMonth() + 1} anoAtual={hoje.getFullYear()} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
          <p className="p-4 font-semibold text-gray-700 dark:text-white text-sm">Metas cadastradas</p>
          {metas.length === 0 && (
            <p className="p-4 text-sm text-gray-400 italic">Nenhuma meta cadastrada — usando o padrão de 350/mês.</p>
          )}
          {metas.map(m => (
            <div key={m.id} className="p-4 flex items-center justify-between">
              <p className="text-sm text-gray-800 dark:text-white capitalize">{NOMES_MES[m.mes - 1]} de {m.ano}</p>
              <p className="text-sm font-semibold text-blue-600">{m.metaProducao} certificados</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
