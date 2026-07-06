import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Mail, TrendingUp, MousePointerClick, PackageCheck, AlertCircle, MessageCircle } from 'lucide-react'
import { TIPO_EMAIL_LABELS } from '@/lib/email/tipos'
import { MarketingDisparar } from './marketing-disparar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_COR: Record<string, string> = {
  ENVIADO:  'bg-green-100 text-green-700',
  PENDENTE: 'bg-yellow-100 text-yellow-700',
  ERRO:     'bg-red-100 text-red-700',
}

function pct(num: number, den: number) {
  if (den === 0) return '—'
  return `${Math.round((num / den) * 100)}%`
}

export default async function MarketingPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  const desde30d = new Date(Date.now() - 30 * 86_400_000)

  const [stats, porTipo, recentes, whatsappEnviados] = await Promise.all([
    prisma.emailLog.aggregate({
      where: { createdAt: { gte: desde30d } },
      _count: { _all: true },
    }).then(async r => {
      const [enviados, entregues, abertos, clicados, erros] = await Promise.all([
        prisma.emailLog.count({ where: { createdAt: { gte: desde30d }, status: 'ENVIADO' } }),
        prisma.emailLog.count({ where: { createdAt: { gte: desde30d }, entregueEm: { not: null } } }),
        prisma.emailLog.count({ where: { createdAt: { gte: desde30d }, abertoEm: { not: null } } }),
        prisma.emailLog.count({ where: { createdAt: { gte: desde30d }, clicadoEm: { not: null } } }),
        prisma.emailLog.count({ where: { createdAt: { gte: desde30d }, status: 'ERRO' } }),
      ])
      return { total: r._count._all, enviados, entregues, abertos, clicados, erros }
    }),

    prisma.emailLog.groupBy({
      by: ['tipo'],
      where: { createdAt: { gte: desde30d }, status: 'ENVIADO' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    prisma.emailLog.findMany({
      where: { createdAt: { gte: desde30d } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { cliente: { select: { nome: true } } },
    }),

    prisma.historicoContato.count({
      where: { dataContato: { gte: desde30d }, observacao: { contains: 'WhatsApp automático' } },
    }),
  ])

  const tipoLabel = (tipo: string) =>
    TIPO_EMAIL_LABELS[tipo]?.label ??
    (tipo === 'CAMPANHA_MARKETING' ? 'Campanha de marketing' :
     tipo === 'VENCIDO_1' ? '1 dia após vencer' :
     tipo === 'VENCIDO_7' ? '7 dias após vencer' :
     tipo === 'COBRANCA_FINANCEIRA' ? 'Cobrança financeira' : tipo)

  const tipoIcone = (tipo: string) =>
    TIPO_EMAIL_LABELS[tipo]?.icone ??
    (tipo === 'CAMPANHA_MARKETING' ? '📢' :
     tipo === 'VENCIDO_1' ? '🔴' :
     tipo === 'VENCIDO_7' ? '🔴' : '📧')

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          Marketing & E-mails
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Desempenho das notificações automáticas e disparos de campanha — últimos 30 dias
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
          <Mail className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.enviados}</p>
          <p className="text-xs text-gray-400 mt-0.5">Enviados</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
          <PackageCheck className="w-5 h-5 text-teal-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-teal-600">{pct(stats.entregues, stats.enviados)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Entregues</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-indigo-600">{pct(stats.abertos, stats.enviados)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Abertura</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
          <MousePointerClick className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-600">{pct(stats.clicados, stats.enviados)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cliques</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center col-span-2 sm:col-span-1">
          <MessageCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{whatsappEnviados}</p>
          <p className="text-xs text-gray-400 mt-0.5">WhatsApp</p>
        </div>
      </div>

      {stats.erros > 0 && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{stats.erros} e-mail{stats.erros !== 1 ? 's' : ''} falharam nos últimos 30 dias</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Por tipo */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Enviados por tipo</h2>
          </div>
          <div className="p-4 space-y-2">
            {porTipo.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum e-mail enviado neste período</p>
            ) : (
              porTipo.map(row => (
                <div key={row.tipo} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1.5 min-w-0">
                    <span>{tipoIcone(row.tipo)}</span>
                    <span className="truncate">{tipoLabel(row.tipo)}</span>
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-white shrink-0 tabular-nums">
                    {row._count.id}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Histórico recente */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Últimos envios</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700 max-h-72 overflow-y-auto">
            {recentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum registro</p>
            ) : (
              recentes.map(log => (
                <div key={log.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-200 truncate">
                      {log.cliente.nome}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{log.assunto}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COR[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {format(log.createdAt, "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Disparar campanha */}
      <MarketingDisparar />

    </div>
  )
}
