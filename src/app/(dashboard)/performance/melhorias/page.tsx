import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { NovaMelhoriaForm } from './form'
import { MelhoriaStatusSelect } from './status-select'

const LABEL_CATEGORIA: Record<string, string> = {
  ECONOMIA: 'Economia', AUTOMACAO: 'Automação', PROCESSO: 'Processo', ATENDIMENTO: 'Atendimento', MARKETING: 'Marketing',
}
const LABEL_STATUS: Record<string, string> = {
  NOVA: 'Nova', EM_ANALISE: 'Em análise', IMPLEMENTADA: 'Implementada',
}
const COR_STATUS: Record<string, string> = {
  NOVA: 'bg-blue-100 text-blue-700', EM_ANALISE: 'bg-yellow-100 text-yellow-700', IMPLEMENTADA: 'bg-green-100 text-green-700',
}

export default async function MelhoriasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:read')) redirect('/dashboard')

  const podeMudarStatus = hasPermission(session.user.role, 'performance:write')

  const melhorias = await prisma.melhoriaContinua.findMany({
    orderBy: { createdAt: 'desc' },
    include: { autor: { select: { nome: true } } },
  })

  return (
    <div>
      <Header titulo="Melhoria Contínua" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
        <NovaMelhoriaForm />

        <div className="space-y-2">
          {melhorias.length === 0 && (
            <p className="p-4 text-sm text-gray-400 italic bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
              Nenhuma ideia registrada ainda. Toda sugestão de melhoria é bem-vinda.
            </p>
          )}
          {melhorias.map(m => (
            <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{m.titulo}</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{m.descricao}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {LABEL_CATEGORIA[m.categoria]}
                    {m.autor && ` · sugerido por ${m.autor.nome}`}
                  </p>
                </div>
                {podeMudarStatus ? (
                  <MelhoriaStatusSelect id={m.id} statusAtual={m.status} />
                ) : (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${COR_STATUS[m.status]}`}>
                    {LABEL_STATUS[m.status]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
