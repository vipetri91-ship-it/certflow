import { Clock, FileCheck, ShoppingBag, Calendar, Wallet, Cpu } from 'lucide-react'
import type { EventoTimeline } from '@/mocks/future-dashboard'

const TIPO_ICON: Record<EventoTimeline['tipo'], React.ReactNode> = {
  emissao: <FileCheck className="w-3.5 h-3.5" />,
  venda: <ShoppingBag className="w-3.5 h-3.5" />,
  agenda: <Calendar className="w-3.5 h-3.5" />,
  financeiro: <Wallet className="w-3.5 h-3.5" />,
  sistema: <Cpu className="w-3.5 h-3.5" />,
}

const FASE_LABEL = {
  passado: 'Já aconteceu',
  presente: 'Acontecendo agora',
  futuro: 'Vai acontecer',
} as const

export function TimelineViva({ eventos }: { eventos: EventoTimeline[] }) {
  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-blue)]/20 to-transparent border border-white/10">
          <Clock className="w-4 h-4 text-[var(--fl-blue)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Linha do Tempo Viva</h2>
          <p className="fl-label">Passado · presente · futuro</p>
        </div>
      </div>

      <div className="relative pl-6">
        {/* Linha vertical com fluxo */}
        <div
          className="fl-timeline-flow absolute left-[7px] top-1 bottom-1 w-px"
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(124,111,255,0.6) 0%, rgba(34,211,238,0.6) 50%, rgba(124,111,255,0.6) 100%)',
          }}
        />

        <div className="space-y-5">
          {eventos.map((evento, i) => {
            const ehPresente = evento.fase === 'presente'
            const ehFuturo = evento.fase === 'futuro'
            return (
              <div key={evento.id} className="fl-rise relative flex gap-4" style={{ animationDelay: `${i * 60}ms` }}>
                <div
                  className={`relative z-10 mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${ehPresente ? 'fl-dot-live' : ''}`}
                  style={{
                    background: ehPresente ? '#22d3ee' : ehFuturo ? 'transparent' : '#7c6fcd',
                    borderColor: ehPresente ? '#22d3ee' : ehFuturo ? 'rgba(255,255,255,0.25)' : '#7c6fcd',
                    marginLeft: '-10px',
                  }}
                />
                <div className={`flex-1 ${ehFuturo ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[var(--fl-text-mid)]">{TIPO_ICON[evento.tipo]}</span>
                    <span className="text-sm font-medium text-[var(--fl-text-hi)]">{evento.titulo}</span>
                    <span className="text-[10px] font-mono text-[var(--fl-text-mid)] ml-auto">{evento.hora}</span>
                  </div>
                  <p className="text-xs text-[var(--fl-text-mid)] mt-0.5">{evento.descricao}</p>
                  {ehPresente && (
                    <span className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-[var(--fl-cyan)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fl-cyan)] fl-dot-live" />
                      {FASE_LABEL.presente}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
