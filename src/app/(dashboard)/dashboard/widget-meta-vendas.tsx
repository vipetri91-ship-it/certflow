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
    <div className="relative bg-slate-800 rounded-2xl p-5 flex flex-col h-full overflow-hidden">
      {/* Brilho de fundo */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: cor, filter: 'blur(40px)' }} />
      </div>

      {/* Header */}
      <div className="relative shrink-0 mb-1">
        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Meta Mensal</p>
        <p className="text-white font-bold text-sm">{mesNome}</p>
      </div>

      {/* Gauge SVG */}
      <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
        <svg viewBox="0 0 200 115" className="w-full max-w-[200px]" style={{ overflow: 'visible' }}>
          {/* Trilha */}
          <path
            d="M 10 110 A 90 90 0 0 1 190 110"
            fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round"
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
          <text x="100" y="92" textAnchor="middle" fill="white"
            fontSize="32" fontWeight="bold" fontFamily="inherit">
            {pct}%
          </text>
        </svg>

        {/* Vendas / meta */}
        <div className="text-center -mt-2">
          <p className="text-white text-2xl font-bold leading-tight">
            {vendasMes}
            <span className="text-slate-400 text-base font-normal"> / {META}</span>
          </p>
          <p className="text-slate-400 text-xs mt-0.5">vendas no mês</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="relative shrink-0 mt-3 pt-3 border-t border-slate-700">
        {atingida ? (
          <p className="text-green-400 text-xs font-semibold text-center">
            🎉 Meta atingida! Parabéns à equipe!
          </p>
        ) : (
          <p className="text-slate-400 text-xs text-center">
            Faltam <span className="text-white font-semibold">{faltam} vendas</span> para bater a meta
          </p>
        )}
      </div>
    </div>
  )
}