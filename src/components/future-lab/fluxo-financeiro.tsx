import { Waves } from 'lucide-react'
import type { FluxoFinanceiroPonto } from '@/mocks/future-dashboard'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function FluxoFinanceiro({
  saudeFinanceira,
  previsaoHoje,
  pontos,
}: {
  saudeFinanceira: number
  previsaoHoje: number
  pontos: FluxoFinanceiroPonto[]
}) {
  const max = Math.max(...pontos.map(p => p.entrada))
  const W = 280
  const H = 80
  const step = W / (pontos.length - 1)

  const pathEntrada = pontos
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${H - (p.entrada / max) * H}`)
    .join(' ')

  const areaEntrada = `${pathEntrada} L ${W} ${H} L 0 ${H} Z`

  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-cyan)]/20 to-transparent border border-white/10">
          <Waves className="w-4 h-4 text-[var(--fl-cyan)]" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Fluxo Financeiro</h2>
          <p className="fl-label">Energia de receita do dia</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[var(--fl-cyan)]">{formatarMoeda(previsaoHoje)}</p>
          <p className="fl-label mt-0.5">previsão hoje</p>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fl-fluxo-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaEntrada} fill="url(#fl-fluxo-gradient)" />
          <path d={pathEntrada} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="fl-energy-shimmer" />
          {pontos.map((p, i) => (
            <circle key={p.hora} cx={i * step} cy={H - (p.entrada / max) * H} r="2.5" fill="#e6ecff" />
          ))}
        </svg>
        <div className="flex justify-between mt-1.5 text-[10px] text-[var(--fl-text-lo)] font-mono">
          {pontos.map(p => (
            <span key={p.hora}>{p.hora}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="fl-label">Saúde financeira</span>
        <div className="flex items-center gap-2 flex-1 mx-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${saudeFinanceira}%`, background: 'linear-gradient(90deg, #34d399, #22d3ee)' }}
          />
        </div>
        <span className="text-sm font-semibold text-[var(--fl-text-hi)]">{saudeFinanceira}%</span>
      </div>
    </div>
  )
}
