'use client'

import { Target } from 'lucide-react'

const ARC_LENGTH = Math.PI * 90 // semicircle r=90 ≈ 282.74

interface Props {
  vendasMes: number
  mesNome: string
  meta: number
}

export function WidgetMetaVendas({ vendasMes, mesNome, meta }: Props) {
  const progresso  = Math.min(vendasMes / meta, 1)
  const pct        = Math.round(progresso * 100)
  const faltam     = Math.max(meta - vendasMes, 0)
  const atingida   = vendasMes >= meta
  const offset     = ARC_LENGTH * (1 - progresso)

  const cor = atingida ? 'var(--color-grn)' : 'var(--color-cyan)'

  return (
    <div className="bg-panel rounded-2xl border border-stroke shadow-[var(--shadow)] p-5 flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 shrink-0 mb-1">
        <div className="w-8 h-8 bg-v-soft rounded-lg flex items-center justify-center">
          <Target className="w-4 h-4 text-violet" />
        </div>
        <div>
          <p className="text-sm font-semibold text-txt-strong">Meta Mensal</p>
          <p className="text-xs text-mut-2 capitalize">{mesNome}</p>
        </div>
      </div>

      {/* Gauge SVG */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <svg viewBox="0 0 200 115" className="w-full max-w-[200px]" style={{ overflow: 'visible' }}>
          {/* Trilha */}
          <path
            d="M 10 110 A 90 90 0 0 1 190 110"
            fill="none" strokeWidth="14" strokeLinecap="round"
            style={{ stroke: 'var(--gauge-track)' }}
          />
          {/* Progresso */}
          <path
            d="M 10 110 A 90 90 0 0 1 190 110"
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${ARC_LENGTH}`}
            strokeDashoffset={offset}
            style={{ stroke: cor, transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />

          {/* Percentual central */}
          <text x="100" y="92" textAnchor="middle"
            fontSize="32" fontWeight="bold" className="font-display" style={{ fill: 'var(--color-txt-strong)' }}>
            {pct}%
          </text>
        </svg>

        {/* Vendas / meta */}
        <div className="text-center -mt-2">
          <p className="text-txt-strong text-2xl font-bold leading-tight font-display tabnum">
            {vendasMes}
            <span className="text-mut-2 text-base font-normal"> / {meta}</span>
          </p>
          <p className="text-mut-2 text-xs mt-0.5">vendas no mês</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="shrink-0 mt-3 pt-3 border-t border-stroke">
        {atingida ? (
          <p className="text-grn text-xs font-semibold text-center">
            🎉 Meta atingida! Parabéns à equipe!
          </p>
        ) : (
          <p className="text-mut-2 text-xs text-center">
            Faltam <span className="text-txt-strong font-semibold">{faltam} vendas</span> para bater a meta
          </p>
        )}
      </div>
    </div>
  )
}