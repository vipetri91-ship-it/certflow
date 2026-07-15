import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { LABEL_TIPO_OCORRENCIA, PONTOS_POR_TIPO } from '@/lib/performance/qualidade'
import { NovaOcorrenciaForm } from './form'

export default async function OcorrenciasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:write')) redirect('/performance')

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)

  const [ocorrencias, usuarios] = await Promise.all([
    prisma.ocorrenciaQualidade.findMany({
      where: { data: { gte: inicioMes, lt: fimMes } },
      orderBy: { data: 'desc' },
      include: {
        usuario: { select: { nome: true } },
        registradoPor: { select: { nome: true } },
      },
    }),
    prisma.usuario.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ])

  return (
    <div>
      <Header titulo="Ocorrências de Qualidade" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
        <NovaOcorrenciaForm usuarios={usuarios} />

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-100 dark:divide-slate-700">
          <p className="p-4 font-semibold text-gray-700 dark:text-white text-sm">Ocorrências deste mês ({ocorrencias.length})</p>
          {ocorrencias.length === 0 && (
            <p className="p-4 text-sm text-gray-400 italic">Nenhuma ocorrência registrada este mês — ótimo sinal.</p>
          )}
          {ocorrencias.map(o => (
            <div key={o.id} className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {LABEL_TIPO_OCORRENCIA[o.tipo]}
                  <span className="ml-2 text-xs text-red-500 font-normal">
                    {o.tipo === 'REVOGACAO' ? 'zera o mês' : `-${PONTOS_POR_TIPO[o.tipo as keyof typeof PONTOS_POR_TIPO]}pts`}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">{o.descricao}</p>
                {o.observacao && <p className="text-xs text-gray-400 mt-0.5">{o.observacao}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(o.data).toLocaleDateString('pt-BR')}
                  {o.usuario && ` · Responsável: ${o.usuario.nome}`}
                  {o.registradoPor && ` · Registrado por: ${o.registradoPor.nome}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
