'use client'

const META = 300
const ARC_LENGTH = Math.PI * 90 // semicircle r=90 ≈ 282.74

interface Props {
  vendasMes: number
  mesNome: string
}

export function WidgetMetaVendas({ vendasMes, mesNome }: Props) {
  const progresso  = Math.min(vendasMes / META, 1)
  const pct        = Math.round(progresso * 100)
  const faltam     = Math.max(META - vendasMes, 0)
  const atingida   = vendasMes >= META
  const offset     = ARC_LENGTH * (1 - progresso)

  const cor = atingida
    ? '#22c55e'                           // verde — meta batida
    : progresso >= 0.75
      ? '#2dd4bf'                         // teal — próximo
      : progresso >= 0.4
        ? '#2dd4bf'
        : '#2dd4bf'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="shrink-0 mb-1">
        <p className="text-gray-400 dark:text-slate-400 text-xs uppercase tracking-wide font-medium">Meta Mensal</p>
        <p className="text-gray-700 dark:text-white font-bold text-sm">{mesNome}</p>
      </div>

      {/* Gauge SVG */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <svg viewBox="0 0 200 115" className="w-full max-w-[200px]" style={{ overflow: 'visible' }}>
          {/* Trilha */}
          <path
            d="M 10 110 A 90 90 0 0 1 190 110"
            fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"
            className="dark:[stroke:#334155]"
          />
          {/* Progresso */}
          <path
            d="M 10 110 A 90 90 0 0 1 190 110"
            fill="none"
            stroke={cor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${ARC_LENGTH}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />

          {/* Percentual central */}
          <text x="100" y="92" textAnchor="middle" fill="#111827"
            fontSize="32" fontWeight="bold" fontFamily="inherit">
            {pct}%
          </text>
        </svg>

        {/* Vendas / meta */}
        <div className="text-center -mt-2">
          <p className="text-gray-900 dark:text-white text-2xl font-bold leading-tight">
            {vendasMes}
            <span className="text-gray-400 dark:text-slate-400 text-base font-normal"> / {META}</span>
          </p>
          <p className="text-gray-400 dark:text-slate-400 text-xs mt-0.5">vendas no mês</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="shrink-0 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
        {atingida ? (
          <p className="text-green-600 text-xs font-semibold text-center">
            🎉 Meta atingida! Parabéns à equipe!
          </p>
        ) : (
          <p className="text-gray-400 dark:text-slate-400 text-xs text-center">
            Faltam <span className="text-gray-800 dark:text-white font-semibold">{faltam} vendas</span> para bater a meta
          </p>
        )}
      </div>
    </div>
  )
}