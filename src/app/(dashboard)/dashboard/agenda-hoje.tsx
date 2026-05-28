'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, ArrowRight, Loader2 } from 'lucide-react'

interface Evento {
  id:        string
  titulo:    string
  inicio:    string
  cor?:      string
  agr?:      string
}

const COR_MAP: Record<string, string> = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
}

function fmtHora(iso: string) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

export function AgendaHoje() {
  const [eventos,    setEventos]    = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro,       setErro]       = useState(false)

  useEffect(() => {
    const hoje   = new Date()
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1)
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const fim    = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate()).toISOString()

    fetch(`/api/agenda/eventos?inicio=${inicio}&fim=${fim}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) { setErro(true); return }
        const lista: Evento[] = (data.eventos ?? [])
          .slice(0, 5)
          .map((e: { id: string; summary?: string; start?: { dateTime?: string; date?: string }; colorId?: string; description?: string }) => ({
            id:     e.id,
            titulo: e.summary ?? 'Sem título',
            inicio: e.start?.dateTime ?? e.start?.date ?? '',
            cor:    e.colorId ? COR_MAP[e.colorId] : '#3b82f6',
          }))
        setEventos(lista)
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false))
  }, [])

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Agenda de Hoje</p>
        </div>
        <Link href="/agenda"
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition">
          Ver agenda <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <p className="px-4 pt-2.5 pb-0 text-xs text-gray-400 dark:text-slate-500 capitalize">{hoje}</p>

      <div className="px-4 py-2">
        {carregando ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : erro ? (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500">Google Calendar não conectado</p>
            <Link href="/agenda" className="text-xs text-blue-500 hover:underline">Conectar →</Link>
          </div>
        ) : eventos.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-slate-500">
            Nenhum atendimento agendado hoje
          </p>
        ) : (
          <div className="space-y-2 py-1">
            {eventos.map(ev => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full shrink-0" style={{ background: ev.cor ?? '#3b82f6' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{ev.titulo}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{fmtHora(ev.inicio)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
