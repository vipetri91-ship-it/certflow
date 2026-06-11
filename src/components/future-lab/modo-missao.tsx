import { Target } from 'lucide-react'

interface Props {
  titulo: string
  objetivo: number
  concluidas: number
  faltam: number
  probabilidadeSucesso: number
}

export function ModoMissao({ titulo, objetivo, concluidas, faltam, probabilidadeSucesso }: Props) {
  const progresso = Math.round((concluidas / objetivo) * 100)

  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-cyan)]/20 to-transparent border border-white/10">
          <Target className="w-4 h-4 text-[var(--fl-cyan)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Missão do Dia</h2>
          <p className="fl-label">{titulo}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <div>
          <p className="text-2xl font-bold text-[var(--fl-text-hi)]">{objetivo}</p>
          <p className="fl-label mt-1">Objetivo</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--fl-cyan)]">{concluidas}</p>
          <p className="fl-label mt-1">Concluídas</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--fl-pink)]">{faltam}</p>
          <p className="fl-label mt-1">Faltam</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progresso}%`,
            background: 'linear-gradient(90deg, #3b82f6, #22d3ee)',
            boxShadow: '0 0 12px rgba(34,211,238,0.6)',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--fl-text-mid)]">{progresso}% concluído</span>
        <span className="flex items-center gap-1.5 font-semibold text-[var(--fl-cyan)]">
          Probabilidade de sucesso: {probabilidadeSucesso}%
        </span>
      </div>
    </div>
  )
}
