import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, XCircle, Clock, Mail, AlertTriangle,
  ExternalLink, Settings, MailOpen, MousePointerClick,
} from 'lucide-react'
import { TIPO_EMAIL_LABELS } from '@/lib/email/tipos'
import { BotaoReenviar } from './botao-reenviar'

type StatusFiltro = 'TODOS' | 'ERRO' | 'ENVIADO' | 'PENDENTE'

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  ENVIADO:  { label: 'Enviado',    className: 'bg-green-50 text-green-700 border border-green-200',  icon: CheckCircle2 },
  ERRO:     { label: 'Falhou',     className: 'bg-red-50 text-red-700 border border-red-200',        icon: XCircle },
  PENDENTE: { label: 'Aguardando', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: Clock },
}

function StatusBadge({ status, abertoEm, clicadoEm }: { status: string; abertoEm: Date | null; clicadoEm: Date | null }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.PENDENTE
  const Icon = cfg.icon
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
      {abertoEm && (
        <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
          <MailOpen className="w-3 h-3" /> Aberto
        </span>
      )}
      {clicadoEm && (
        <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
          <MousePointerClick className="w-3 h-3" /> Clicou
        </span>
      )}
    </div>
  )
}

export default async function MonitoramentoEmailsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const filtro = (searchParams.status?.toUpperCase() ?? 'TODOS') as StatusFiltro
  const desde60d = new Date(Date.now() - 60 * 86_400_000)

  const whereStatus = filtro !== 'TODOS' ? { status: filtro as 'ERRO' | 'ENVIADO' | 'PENDENTE' } : {}

  const [logs, contagens] = await Promise.all([
    prisma.emailLog.findMany({
      where: { createdAt: { gte: desde60d }, ...whereStatus },
      include: {
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.emailLog.groupBy({
      by: ['status'],
      where: { createdAt: { gte: desde60d } },
      _count: { _all: true },
    }),
  ])

  const totais = {
    TODOS:    contagens.reduce((s, r) => s + r._count._all, 0),
    ENVIADO:  contagens.find(r => r.status === 'ENVIADO')?._count._all ?? 0,
    ERRO:     contagens.find(r => r.status === 'ERRO')?._count._all ?? 0,
    PENDENTE: contagens.find(r => r.status === 'PENDENTE')?._count._all ?? 0,
  }

  const abertos  = await prisma.emailLog.count({ where: { createdAt: { gte: desde60d }, abertoEm: { not: null } } })
  const taxaAbertura = totais.ENVIADO > 0 ? Math.round((abertos / totais.ENVIADO) * 100) : null

  const TABS: { key: StatusFiltro; label: string; count: number; cor: string }[] = [
    { key: 'TODOS',    label: 'Todos',       count: totais.TODOS,    cor: 'text-gray-600' },
    { key: 'ERRO',     label: 'Com falha',   count: totais.ERRO,     cor: 'text-red-600' },
    { key: 'PENDENTE', label: 'Aguardando',  count: totais.PENDENTE, cor: 'text-yellow-600' },
    { key: 'ENVIADO',  label: 'Entregues',   count: totais.ENVIADO,  cor: 'text-green-600' },
  ]

  return (
    <div>
      <Header titulo="Monitoramento de E-mails" />

      <div className="p-4 lg:p-6 space-y-5 max-w-5xl">

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totais.ENVIADO}</p>
            <p className="text-xs text-gray-400 mt-0.5">Enviados (60d)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{taxaAbertura !== null ? `${taxaAbertura}%` : '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Taxa de abertura</p>
          </div>
          <div className={`bg-white rounded-xl border shadow-sm p-4 text-center ${totais.ERRO > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            <p className={`text-2xl font-bold ${totais.ERRO > 0 ? 'text-red-500' : 'text-gray-900'}`}>{totais.ERRO}</p>
            <p className="text-xs text-gray-400 mt-0.5">Falharam</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{totais.PENDENTE}</p>
            <p className="text-xs text-gray-400 mt-0.5">Aguardando</p>
          </div>
        </div>

        {/* Alerta de falhas */}
        {totais.ERRO > 0 && filtro !== 'ERRO' && (
          <Link href="/monitoramento/emails?status=ERRO"
            className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 hover:bg-red-100 transition">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><strong>{totais.ERRO} e-mail{totais.ERRO !== 1 ? 's' : ''}</strong> com falha de entrega — clique para ver quais são</span>
          </Link>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tabs de filtro */}
          <div className="flex items-center gap-0 border-b border-gray-100 overflow-x-auto">
            {TABS.map(tab => (
              <Link
                key={tab.key}
                href={tab.key === 'TODOS' ? '/monitoramento/emails' : `/monitoramento/emails?status=${tab.key}`}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  filtro === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                    filtro === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : tab.key === 'ERRO' && tab.count > 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            ))}
            <div className="ml-auto px-3 py-2 shrink-0">
              <Link href="/configuracoes/emails" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                <Settings className="w-3.5 h-3.5" /> Configurar templates
              </Link>
            </div>
          </div>

          {/* Lista */}
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum e-mail encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => {
                const tipoInfo = TIPO_EMAIL_LABELS[log.tipo]
                const ehErro = log.status === 'ERRO'
                return (
                  <div key={log.id} className={`px-4 py-3.5 ${ehErro ? 'bg-red-50/40' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">

                      {/* Cliente + tipo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{tipoInfo?.icone ?? '📧'}</span>
                          <Link
                            href={`/clientes/${log.cliente.id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate flex items-center gap-1"
                          >
                            {log.cliente.nome}
                            <ExternalLink className="w-3 h-3 text-gray-300 shrink-0" />
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                          <span className="font-medium text-gray-600">{tipoInfo?.label ?? log.tipo}</span>
                          <span>·</span>
                          <span className="font-mono">{log.destinatario}</span>
                          <span>·</span>
                          <span title={format(log.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
                            {formatDistanceToNow(log.createdAt, { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      {/* Status + ação */}
                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <StatusBadge
                          status={log.status}
                          abertoEm={log.abertoEm}
                          clicadoEm={log.clicadoEm}
                        />
                        {ehErro && <BotaoReenviar logId={log.id} />}
                      </div>
                    </div>

                    {/* Motivo da falha */}
                    {ehErro && log.motivoFalha && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-100/60 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700 leading-snug">
                          <strong>Motivo:</strong> {log.motivoFalha}
                        </p>
                      </div>
                    )}
                    {ehErro && !log.motivoFalha && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-100/60 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700">Falha no envio — sem motivo registrado (possível erro de API do Brevo)</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {logs.length === 100 && (
            <div className="px-4 py-3 border-t border-gray-50 text-center text-xs text-gray-400">
              Exibindo os 100 registros mais recentes dos últimos 60 dias
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
