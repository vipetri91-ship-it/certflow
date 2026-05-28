'use client'

import { useEffect, useState, useRef } from 'react'
import { CalendarDays, X, Bell } from 'lucide-react'

const DURACAO_MS = 12000 // 12 segundos visível

interface Evento {
  id: string
  titulo: string
  descricao: string
  inicio: string
  fim: string
  colorId: string
}

interface Notificacao {
  eventoId: string
  titulo: string
  inicio: string
  minutosRestantes: number
  criadaEm: number
}

function fmtHora(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function NotificacaoCard({ n, onDispensar }: { n: Notificacao; onDispensar: () => void }) {
  const [progresso, setProgresso] = useState(100) // 100% → 0%
  const [saindo, setSaindo] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const inicio = Date.now()

    function tick() {
      const decorrido = Date.now() - inicio
      const restante = Math.max(0, 100 - (decorrido / DURACAO_MS) * 100)
      setProgresso(restante)

      if (decorrido >= DURACAO_MS - 400) {
        // Inicia animação de saída 400ms antes de remover
        setSaindo(true)
      }

      if (decorrido >= DURACAO_MS) {
        onDispensar()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const cor = '#3b82f6'

  return (
    <div
      className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-400"
      style={{
        opacity: saindo ? 0 : 1,
        transform: saindo ? 'translateX(110%)' : 'translateX(0)',
        transition: saindo ? 'opacity 0.35s ease, transform 0.35s ease' : 'none',
      }}
    >
      {/* Barra de progresso animada no topo */}
      <div className="h-1 bg-gray-100 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-none"
          style={{
            width: `${progresso}%`,
            backgroundColor: cor,
          }}
        />
      </div>

      <div className="flex items-start gap-3 p-3.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: cor + '20' }}
        >
          <Bell className="w-4 h-4" style={{ color: cor }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 mb-0.5">
            {n.minutosRestantes === 1 ? 'Em 1 minuto' : `Em ${n.minutosRestantes} minutos`}
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">{n.titulo}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">{fmtHora(n.inicio)}</p>
          </div>
        </div>

        <button
          onClick={onDispensar}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function NotificacaoAgenda() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const notificadosRef = useRef<Set<string>>(new Set())

  async function verificarEventos() {
    try {
      const agora = new Date()
      const em2h = new Date(agora.getTime() + 2 * 60 * 60 * 1000)
      const res = await fetch(`/api/agenda/eventos?inicio=${agora.toISOString()}&fim=${em2h.toISOString()}`)
      if (!res.ok) return
      const data = await res.json()
      const eventos: Evento[] = data.eventos ?? []

      const novas: Notificacao[] = []
      for (const evt of eventos) {
        if (!evt.inicio) continue
        const inicio = new Date(evt.inicio)
        const diffMs = inicio.getTime() - agora.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin >= 1 && diffMin <= 15 && !notificadosRef.current.has(evt.id)) {
          notificadosRef.current.add(evt.id)
          novas.push({ eventoId: evt.id, titulo: evt.titulo, inicio: evt.inicio, minutosRestantes: diffMin, criadaEm: Date.now() })
        }
      }
      if (novas.length > 0) setNotificacoes(prev => [...prev, ...novas])
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    verificarEventos()
    const intervalo = setInterval(verificarEventos, 60 * 1000)
    return () => clearInterval(intervalo)
  }, [])

  function dispensar(eventoId: string) {
    setNotificacoes(prev => prev.filter(n => n.eventoId !== eventoId))
  }

  if (notificacoes.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {notificacoes.map(n => (
        <NotificacaoCard
          key={n.eventoId}
          n={n}
          onDispensar={() => dispensar(n.eventoId)}
        />
      ))}
    </div>
  )
}
