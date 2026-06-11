import { Zap } from 'lucide-react'
import type { FatorEnergia } from '@/mocks/future-dashboard'

const CENTER = 100
const CORES = ['#22d3ee', '#3b82f6', '#7c6fcd', '#a855f7', '#ec4899', '#34d399']

export function PainelEnergia({ percentual, fatores }: { percentual: number; fatores: FatorEnergia[] }) {
  const raioBase = 32
  const passo = 9.5

  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-pink)]/20 to-transparent border border-white/10">
          <Zap className="w-4 h-4 text-[var(--fl-pink)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Energia da Empresa</h2>
          <p className="fl-label">Operando em {percentual}%</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            {fatores.map((fator, i) => {
              const r = raioBase + i * passo
              const circ = 2 * Math.PI * r
              const dash = circ * (fator.valor / 100)
              return (
                <g key={fator.label}>
                  <circle cx={CENTER} cy={CENTER} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle
                    className="fl-energy-arc fl-energy-shimmer"
                    cx={CENTER}
                    cy={CENTER}
                    r={r}
                    fill="none"
                    stroke={CORES[i % CORES.length]}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                </g>
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[var(--fl-text-hi)]">{percentual}%</span>
            <span className="fl-label mt-1">operando</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 w-full">
          {fatores.map((fator, i) => (
            <div key={fator.label} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CORES[i % CORES.length] }} />
              <span className="text-[var(--fl-text-mid)] flex-1">{fator.label}</span>
              <span className="font-semibold text-[var(--fl-text-hi)]">{fator.valor}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
