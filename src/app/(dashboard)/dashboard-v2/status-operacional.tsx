import { Activity } from 'lucide-react'

export type StatusNivel = 'ok' | 'atencao' | 'critico'

export interface IndicadorStatus {
  label: string
  valor: string
  detalhe: string
  status: StatusNivel
}

interface Props {
  indicadores: IndicadorStatus[]
  statusGeral: StatusNivel
}

const STATUS_CONFIG: Record<StatusNivel, { dot: string; texto: string; fundo: string; label: string }> = {
  ok:      { dot: 'bg-green-500', texto: 'text-green-700 dark:text-green-400', fundo: 'bg-green-50 dark:bg-green-900/20',   label: 'Operação normal' },
  atencao: { dot: 'bg-amber-500', texto: 'text-amber-700 dark:text-amber-400', fundo: 'bg-amber-50 dark:bg-amber-900/20',   label: 'Atenção necessária' },
  critico: { dot: 'bg-red-500',   texto: 'text-red-700 dark:text-red-400',     fundo: 'bg-red-50 dark:bg-red-900/20',       label: 'Ação urgente' },
}

export function StatusOperacional({ indicadores, statusGeral }: Props) {
  const geral = STATUS_CONFIG[statusGeral]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 v2-rise">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Status Operacional</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${geral.fundo}`}>
          <span className={`w-2 h-2 rounded-full ${geral.dot} v2-pulse-dot`} />
          <span className={`text-xs font-semibold ${geral.texto}`}>{geral.label}</span>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {indicadores.map((ind) => {
          const c = STATUS_CONFIG[ind.status]
          return (
            <div key={ind.label} className={`rounded-xl px-4 py-3 ${c.fundo}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${ind.status === 'critico' ? 'v2-pulse-dot' : ''}`} />
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{ind.label}</p>
              </div>
              <p className={`text-xl font-black v2-num ${c.texto}`}>{ind.valor}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{ind.detalhe}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}