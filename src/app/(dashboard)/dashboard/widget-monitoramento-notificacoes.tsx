import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BellRing, MessageCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { TIPO_EMAIL_LABELS } from '@/lib/email/tipos'

export async function WidgetMonitoramentoNotificacoes() {
  const desde30d = new Date(Date.now() - 30 * 86_400_000)

  const [porTipoStatus, totalAbertos, whatsappEnviados] = await Promise.all([
    prisma.emailLog.groupBy({
      by: ['tipo', 'status'],
      where: { createdAt: { gte: desde30d } },
      _count: { _all: true },
    }),
    prisma.emailLog.count({ where: { createdAt: { gte: desde30d }, abertoEm: { not: null } } }),
    prisma.historicoContato.count({
      where: { dataContato: { gte: desde30d }, observacao: { contains: 'WhatsApp automático' } },
    }),
  ])

  const totalEnviados = porTipoStatus.filter(r => r.status === 'ENVIADO').reduce((s, r) => s + r._count._all, 0)
  const totalErros    = porTipoStatus.filter(r => r.status === 'ERRO').reduce((s, r) => s + r._count._all, 0)
  const taxaAbertura  = totalEnviados > 0 ? Math.round((totalAbertos / totalEnviados) * 100) : null

  function contagemTipo(tipo: string) {
    return porTipoStatus.filter(r => r.tipo === tipo && r.status === 'ENVIADO').reduce((s, r) => s + r._count._all, 0)
  }

  return (
    <div className="bg-panel rounded-xl border border-stroke shadow-[var(--shadow)] overflow-hidden flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke shrink-0">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-violet" />
          <p className="text-sm font-semibold text-txt-strong">Notificações Automáticas</p>
        </div>
        <Link href={totalErros > 0 ? '/monitoramento/emails?status=ERRO' : '/monitoramento/emails'}
          className="text-xs text-violet hover:text-violet-2 flex items-center gap-1 transition">
          Detalhes <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 shrink-0">
        <div className="text-center">
          <p className="text-lg font-bold text-txt-strong font-display tabnum">{totalEnviados}</p>
          <p className="text-[11px] text-mut-2">E-mails (30d)</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-cyan font-display tabnum">{taxaAbertura !== null ? `${taxaAbertura}%` : '—'}</p>
          <p className="text-[11px] text-mut-2">Taxa abertura</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold font-display tabnum ${totalErros > 0 ? 'text-red' : 'text-txt-strong'}`}>{totalErros}</p>
          <p className="text-[11px] text-mut-2">Falharam</p>
        </div>
      </div>

      {totalErros > 0 && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-red bg-r-soft rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {totalErros} e-mail{totalErros !== 1 ? 's' : ''} falharam no envio
          </div>
        </div>
      )}

      {/* Por tipo */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {Object.entries(TIPO_EMAIL_LABELS).map(([tipo, info]) => (
            <div key={tipo} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-mut truncate flex items-center gap-1">
                <span>{info.icone}</span>
                <span className="truncate">{info.label.replace(' antes do vencimento', '').replace(' após emissão', '')}</span>
              </span>
              <span className="font-semibold text-txt shrink-0 ml-1 tabnum">{contagemTipo(tipo)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="px-4 py-2.5 border-t border-stroke flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1.5 text-xs text-mut">
          <MessageCircle className="w-3.5 h-3.5 text-grn" /> WhatsApp (30d)
        </span>
        <span className="text-xs font-semibold text-txt tabnum">
          {whatsappEnviados} enviadas
        </span>
      </div>
    </div>
  )
}
