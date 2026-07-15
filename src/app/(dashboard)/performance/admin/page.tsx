import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertOctagon, Target, Lightbulb, Gauge, ArrowRight, Tv } from 'lucide-react'
import { buscarMetaVigente } from '@/lib/performance/metas'
import { gerarTokenPublico } from '@/lib/token-publico'
import { RECURSO_TV } from '@/lib/performance/tv'
import { LinkTvCopiavel } from './link-tv'

export default async function PerformanceAdminPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:write')) redirect('/performance')

  const hoje = new Date()
  const mes = hoje.getMonth() + 1
  const ano = hoje.getFullYear()
  const inicioMes = new Date(ano, mes - 1, 1)
  const fimMes = new Date(ano, mes, 1)

  const [ocorrenciasMes, focoAtual, metaAtual, melhoriasNovas] = await Promise.all([
    prisma.ocorrenciaQualidade.count({ where: { data: { gte: inicioMes, lt: fimMes } } }),
    prisma.focoDoDia.findFirst({ orderBy: { data: 'desc' } }),
    buscarMetaVigente(mes, ano),
    prisma.melhoriaContinua.count({ where: { status: 'NOVA' } }),
  ])

  const cards = [
    {
      href: '/performance/admin/ocorrencias',
      icone: AlertOctagon,
      titulo: 'Ocorrências de Qualidade',
      valor: `${ocorrenciasMes} este mês`,
      cor: 'text-red-500 bg-red-50',
    },
    {
      href: '/performance/admin/foco-do-dia',
      icone: Target,
      titulo: 'Foco do Dia',
      valor: focoAtual ? focoAtual.objetivo : 'Nenhum definido',
      cor: 'text-orange-500 bg-orange-50',
    },
    {
      href: '/performance/admin/metas',
      icone: Gauge,
      titulo: 'Meta de Produção',
      valor: `${metaAtual} certificados/mês`,
      cor: 'text-blue-500 bg-blue-50',
    },
    {
      href: '/performance/melhorias',
      icone: Lightbulb,
      titulo: 'Melhoria Contínua',
      valor: `${melhoriasNovas} ideia${melhoriasNovas !== 1 ? 's' : ''} nova${melhoriasNovas !== 1 ? 's' : ''}`,
      cor: 'text-yellow-600 bg-yellow-50',
    },
  ]

  const tokenTv = gerarTokenPublico(RECURSO_TV)
  const linkTv = `${process.env.NEXTAUTH_URL}/tv/performance/${tokenTv}`

  return (
    <div>
      <Header titulo="Administração — Performance" />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-3">
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-indigo-500 bg-indigo-50 dark:bg-opacity-10 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white">Modo TV — link público pra TV do escritório</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Sem login. Atualiza sozinho a cada 1 minuto. Nunca mostra nomes.</p>
          </div>
          <LinkTvCopiavel link={linkTv} />
        </div>
        {cards.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 hover:border-blue-200 dark:hover:border-blue-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.cor} dark:bg-opacity-10`}>
                <c.icone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{c.titulo}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">{c.valor}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
