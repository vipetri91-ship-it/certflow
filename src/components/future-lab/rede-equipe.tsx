import { Network } from 'lucide-react'
import type { ColaboradorRede } from '@/mocks/future-dashboard'

const CENTER = 100

function corDesempenho(desempenho: number) {
  if (desempenho >= 90) return '#34d399'
  if (desempenho >= 75) return '#22d3ee'
  if (desempenho >= 60) return '#fbbf24'
  return '#f87171'
}

function posicao(i: number, total: number) {
  const angulo = (i / total) * 2 * Math.PI - Math.PI / 2
  const raio = 72
  return {
    x: CENTER + raio * Math.cos(angulo),
    y: CENTER + raio * Math.sin(angulo),
  }
}

export function RedeEquipe({ equipe }: { equipe: ColaboradorRede[] }) {
  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-blue)]/20 to-transparent border border-white/10">
          <Network className="w-4 h-4 text-[var(--fl-blue)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Rede da Equipe</h2>
          <p className="fl-label">Atividade em tempo real</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-56 h-56 shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {equipe.map((c, i) => {
              const { x, y } = posicao(i, equipe.length)
              return (
                <line
                  key={`link-${c.id}`}
                  className="fl-link-flow"
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke={corDesempenho(c.desempenho)}
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                />
              )
            })}

            {/* Hub central */}
            <circle cx={CENTER} cy={CENTER} r="10" fill="rgba(124,111,255,0.25)" stroke="#7c6fcd" strokeWidth="1.5" />
            <circle cx={CENTER} cy={CENTER} r="4" fill="#a78bfa" />

            {equipe.map((c, i) => {
              const { x, y } = posicao(i, equipe.length)
              const r = 5 + (c.produtividade / 100) * 5
              const cor = corDesempenho(c.desempenho)
              return (
                <g key={c.id}>
                  <circle
                    className="fl-node-pulse"
                    cx={x}
                    cy={y}
                    r={r}
                    fill={`${cor}33`}
                    stroke={cor}
                    strokeWidth="1.5"
                    style={{ '--r': r } as React.CSSProperties}
                  >
                    <title>{`${c.nome} — produtividade ${c.produtividade}% · carga ${c.cargaOperacional}%`}</title>
                  </circle>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="flex-1 w-full space-y-2.5">
          {equipe.map(c => (
            <div key={c.id} className="flex items-center gap-3 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corDesempenho(c.desempenho) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--fl-text-hi)] font-medium truncate">{c.nome} <span className="text-[var(--fl-text-lo)] font-normal">· {c.cargo}</span></p>
                <p className="text-[var(--fl-text-mid)] truncate">{c.atividadeAtual}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-[var(--fl-text-hi)]">{c.desempenho}%</p>
                <p className="text-[var(--fl-text-lo)]">desempenho</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
