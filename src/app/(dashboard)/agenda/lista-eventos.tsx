'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Pencil, AlertCircle } from 'lucide-react'
import { EditorEvento, type EventoCalendario } from './editor-evento'

const CORES_CSS: Record<string, string> = {
  '10': 'bg-green-700',  // vinicius presencial
  '2':  'bg-green-400',  // vinicius video
  '9':  'bg-blue-800',   // arlen presencial
  '7':  'bg-blue-400',   // arlen video
  '3':  'bg-purple-700', // ana presencial
  '1':  'bg-purple-400', // ana video
  '6':  'bg-orange-500', // bonificado
  '11': 'bg-red-500',    // pessoal
  '8':  'bg-gray-400',   // pre-agendado
  '0':  'bg-blue-500',   // padrão
}

function startOfWeek(d: Date) {
  const r = new Date(d)
  r.setDate(d.getDate() - d.getDay())
  r.setHours(0, 0, 0, 0)
  return r
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(d.getDate() + n)
  return r
}
function fmtHora(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtDia(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function ListaEventos() {
  const [semanaBase, setSemanaBase] = useState(() => startOfWeek(new Date()))
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [eventoEditando, setEventoEditando] = useState<EventoCalendario | null>(null)
  const [filtroAgr, setFiltroAgr] = useState('')

  const fimSemana = addDays(semanaBase, 6)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const inicio = semanaBase.toISOString()
      const fim = addDays(semanaBase, 7).toISOString()
      const res = await fetch(`/api/agenda/eventos?inicio=${inicio}&fim=${fim}`)
      const data = await res.json()
      if (res.ok) {
        setEventos(data.eventos ?? [])
      } else {
        setErro(data.erro ?? 'Erro ao carregar eventos')
      }
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }, [semanaBase])

  useEffect(() => { carregar() }, [carregar])

  const dias = Array.from({ length: 7 }, (_, i) => addDays(semanaBase, i))

  const eventosFiltrados = filtroAgr
    ? eventos.filter(e => {
        const desc = (e.titulo + e.descricao).toLowerCase()
        if (filtroAgr === 'vinicius') return ['10', '2'].includes(e.colorId)
        if (filtroAgr === 'arlen') return ['9', '7'].includes(e.colorId)
        if (filtroAgr === 'ana') return ['3', '1'].includes(e.colorId)
        return true
      })
    : eventos

  function eventosDoDia(dia: Date) {
    const diStr = dia.toLocaleDateString('pt-BR')
    return eventosFiltrados.filter(e => {
      try { return new Date(e.inicio).toLocaleDateString('pt-BR') === diStr } catch { return false }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSemanaBase(d => addDays(d, -7))} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-800">
            {fmtDia(semanaBase)} — {fmtDia(fimSemana)}
          </span>
          <button onClick={() => setSemanaBase(d => addDays(d, 7))} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => setSemanaBase(startOfWeek(new Date()))} className="px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            Hoje
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select value={filtroAgr} onChange={e => setFiltroAgr(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600">
            <option value="">Todos os AGRs</option>
            <option value="vinicius">Vinicius</option>
            <option value="ana">Ana</option>
            <option value="arlen">Arlen</option>
          </select>
          <button onClick={carregar} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      {erro && (
        <div className="flex flex-col gap-2 p-4 bg-red-50 text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
          <a href="/api/google" className="self-start px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition">
            Reconectar Google Calendar
          </a>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {dias.map(dia => {
            const evts = eventosDoDia(dia)
            const hoje = dia.toDateString() === new Date().toDateString()
            if (evts.length === 0 && !hoje) return null
            return (
              <div key={dia.toISOString()}>
                <div className={`px-4 py-2 flex items-center gap-2 ${hoje ? 'bg-blue-50' : 'bg-gray-50/50'}`}>
                  <span className={`text-xs font-semibold ${hoje ? 'text-blue-700' : 'text-gray-500'}`}>
                    {dia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </span>
                  {evts.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${hoje ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                      {evts.length}
                    </span>
                  )}
                </div>
                {evts.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-gray-300">Sem atendimentos</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {evts.map(evt => {
                      const cor = CORES_CSS[evt.colorId] ?? 'bg-blue-500'
                      return (
                        <div key={evt.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition group">
                          <div className={`w-2.5 h-2.5 rounded-full ${cor} shrink-0 mt-1`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{evt.titulo}</p>
                            <p className="text-xs text-gray-400">{fmtHora(evt.inicio)} — {fmtHora(evt.fim)}</p>
                            {evt.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{evt.descricao}</p>}
                          </div>
                          <button
                            onClick={() => setEventoEditando(evt)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-100 transition text-blue-600 shrink-0"
                            title="Editar evento"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          {eventosFiltrados.length === 0 && !carregando && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhum evento nesta semana</p>
          )}
        </div>
      )}

      {eventoEditando && (
        <EditorEvento
          evento={eventoEditando}
          onFechar={() => setEventoEditando(null)}
          onSalvo={() => { setEventoEditando(null); carregar() }}
        />
      )}
    </div>
  )
}
