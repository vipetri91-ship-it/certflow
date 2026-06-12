import { Sparkles } from 'lucide-react'

export type PrioridadeInsight = 'alta' | 'media' | 'baixa'

export interface Insight {
  texto: string
  prioridade: PrioridadeInsight
}

const PRIORIDADE_CONFIG: Record<PrioridadeInsight, { borda: string; fundo: string; dot: string }> = {
  alta:  { borda: 'border-red-200 dark:border-red-900/40',     fundo: 'bg-red-50 dark:bg-red-900/15',     dot: 'bg-red-500' },
  media: { borda: 'border-amber-200 dark:border-amber-900/40', fundo: 'bg-amber-50 dark:bg-amber-900/15', dot: 'bg-amber-500' },
  baixa: { borda: 'border-gray-100 dark:border-slate-700',     fundo: 'bg-gray-50 dark:bg-slate-700/30',  dot: 'bg-gray-400' },
}

interface Props {
  insights: Insight[]
}

export function CertflowAI({ insights }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 v2-rise" style={{ animationDelay: '0.05s' }}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">CertFlow AI</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Resumo do que precisa da sua atenção agora</p>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-2">
        {insights.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">Tudo certo por aqui. Nenhum ponto crítico identificado.</p>
        ) : insights.map((insight, i) => {
          const c = PRIORIDADE_CONFIG[insight.prioridade]
          return (
            <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${c.borda} ${c.fundo}`}>
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${c.dot} ${insight.prioridade === 'alta' ? 'v2-pulse-dot' : ''}`} />
              <p className="text-sm text-gray-700 dark:text-gray-200">{insight.texto}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}