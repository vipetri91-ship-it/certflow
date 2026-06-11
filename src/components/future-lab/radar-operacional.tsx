import { Radar } from 'lucide-react'
import type { SinalRadar, TipoSinal } from '@/mocks/future-dashboard'

const TIPO_COR: Record<TipoSinal, string> = {
  cliente: '#22d3ee',
  tarefa: '#a855f7',
  venda: '#34d399',
  protocolo: '#fbbf24',
  pendencia: '#f87171',
}

const TIPO_LABEL: Record<TipoSinal, string> = {
  cliente: 'Cliente',
  tarefa: 'Tarefa',
  venda: 'Venda',
  protocolo: 'Protocolo',
  pendencia: 'Pendência',
}

const CENTER = 100
const MAX_R = 88

function polar(urgencia: number, angulo: number) {
  // Quanto maior a urgência, mais perto do centro.
  const radius = MAX_R * (1 - urgencia / 110)
  const rad = (angulo * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  }
}

export function RadarOperacional({ sinais }: { sinais: SinalRadar[] }) {
  const ordenados = [...sinais].sort((a, b) => b.urgencia - a.urgencia)

  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-cyan)]/20 to-transparent border border-white/10">
          <Radar className="w-4 h-4 text-[var(--fl-cyan)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Radar Operacional</h2>
          <p className="fl-label">Sinais por urgência</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-56 h-56 shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Anéis de distância */}
            {[88, 60, 32].map(r => (
              <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            ))}
            {/* Eixos */}
            <line x1={CENTER} y1={CENTER - MAX_R} x2={CENTER} y2={CENTER + MAX_R} stroke="rgba(255,255,255,0.05)" />
            <line x1={CENTER - MAX_R} y1={CENTER} x2={CENTER + MAX_R} y2={CENTER} stroke="rgba(255,255,255,0.05)" />

            {/* Varredura giratória */}
            <g className="fl-radar-sweep" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
              <path
                d={`M ${CENTER} ${CENTER} L ${CENTER + MAX_R} ${CENTER} A ${MAX_R} ${MAX_R} 0 0 1 ${CENTER + MAX_R * Math.cos(Math.PI / 6)} ${CENTER + MAX_R * Math.sin(Math.PI / 6)} Z`}
                fill="url(#fl-radar-sweep-gradient)"
              />
            </g>

            <defs>
              <radialGradient id="fl-radar-sweep-gradient">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Centro */}
            <circle cx={CENTER} cy={CENTER} r="3" fill="#e6ecff" />

            {/* Sinais */}
            {sinais.map(sinal => {
              const { x, y } = polar(sinal.urgencia, sinal.angulo)
              return (
                <circle
                  key={sinal.id}
                  className="fl-radar-blip"
                  cx={x}
                  cy={y}
                  r={4}
                  fill={TIPO_COR[sinal.tipo]}
                  style={{ animationDelay: `${sinal.angulo}ms` }}
                >
                  <title>{sinal.label}</title>
                </circle>
              )
            })}
          </svg>
        </div>

        <div className="flex-1 w-full space-y-2">
          {ordenados.slice(0, 4).map(sinal => (
            <div key={sinal.id} className="flex items-center gap-2.5 text-sm">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TIPO_COR[sinal.tipo] }} />
              <span className="fl-label !text-[9px] !tracking-normal !normal-case shrink-0 text-[var(--fl-text-mid)] w-16">
                {TIPO_LABEL[sinal.tipo]}
              </span>
              <span className="text-[var(--fl-text-hi)]/85 truncate">{sinal.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
