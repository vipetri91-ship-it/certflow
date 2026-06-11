import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { NucleoOperacional } from '@/mocks/future-dashboard'

const STATUS_LABEL: Record<NucleoOperacional['status'], string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  estavel: 'Estável',
  otimo: 'Operação ótima',
}

const STATUS_COLOR: Record<NucleoOperacional['status'], string> = {
  critico: '#f87171',
  atencao: '#fb923c',
  estavel: '#22d3ee',
  otimo: '#34d399',
}

const TENDENCIA_ICON: Record<NucleoOperacional['tendencia'], React.ReactNode> = {
  subindo: <TrendingUp className="w-3.5 h-3.5" />,
  descendo: <TrendingDown className="w-3.5 h-3.5" />,
  estavel: <Minus className="w-3.5 h-3.5" />,
}

export function NucleoOperacionalView({ data }: { data: NucleoOperacional }) {
  const cor = STATUS_COLOR[data.status]

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
        {/* Glow de fundo pulsante */}
        <div
          className="fl-core-glow absolute inset-6 rounded-full"
          style={{ background: `radial-gradient(circle, ${cor}55 0%, transparent 70%)` }}
        />

        {/* Anéis orbitais */}
        <div className="fl-core-ring fl-core-ring--spin absolute inset-2" />
        <div className="fl-core-ring fl-core-ring--spin-slow absolute inset-10" style={{ borderColor: 'rgba(168,85,247,0.18)' }} />
        <div className="fl-core-ring absolute inset-16" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Núcleo central */}
        <div
          className="fl-core-pulse relative w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center text-center"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${cor}33, rgba(255,255,255,0.02) 65%)`,
            border: `1px solid ${cor}66`,
            boxShadow: `0 0 60px ${cor}40, inset 0 0 30px ${cor}22`,
          }}
        >
          <span className="text-5xl font-bold tracking-tight" style={{ color: cor }}>
            {data.saude}%
          </span>
          <span className="fl-label mt-1">Saúde Operacional</span>
        </div>

        {/* Marcadores orbitais */}
        {[0, 90, 180, 270].map(deg => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full fl-dot-live"
            style={{
              background: cor,
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translate(140px) rotate(-${deg}deg)`,
            }}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4 text-sm">
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium"
          style={{ background: `${cor}1a`, color: cor, border: `1px solid ${cor}40` }}
        >
          <Activity className="w-3.5 h-3.5" />
          {STATUS_LABEL[data.status]}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--fl-text-mid)]">
          {TENDENCIA_ICON[data.tendencia]}
          {data.pulsosPorMinuto} sinais/min
        </span>
      </div>
    </div>
  )
}
