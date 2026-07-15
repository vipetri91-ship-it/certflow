import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { NovoFocoForm } from './form'
import { FocoStatusButtons } from './status-buttons'

export default async function FocoDoDiaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:write')) redirect('/performance')

  const [focos, usuarios] = await Promise.all([
    prisma.focoDoDia.findMany({
      orderBy: { data: 'desc' },
      take: 15,
      include: { responsavel: { select: { nome: true } } },
    }),
    prisma.usuario.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ])

  return (
    <div>
      <Header titulo="Foco do Dia" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
        <NovoFocoForm usuarios={usuarios} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
          <p className="p-4 font-semibold text-gray-700 dark:text-white text-sm">Histórico recente</p>
          {focos.length === 0 && (
            <p className="p-4 text-sm text-gray-400 italic">Nenhum foco definido ainda.</p>
          )}
          {focos.map(f => (
            <div key={f.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{f.objetivo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(f.data).toLocaleDateString('pt-BR')}
                  {f.responsavel && ` · ${f.responsavel.nome}`}
                  {f.prazo && ` · Prazo: ${new Date(f.prazo).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <FocoStatusButtons id={f.id} statusAtual={f.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
