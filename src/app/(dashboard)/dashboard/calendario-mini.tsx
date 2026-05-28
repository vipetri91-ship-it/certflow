'use client'

import { useState } from 'react'
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'

const CalendarioInterativo = dynamic(
  () => import('@/components/calendario-interativo').then(m => m.CalendarioInterativo),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> }
)

interface Props { calendarUrl?: string }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S']

function MiniCalendario() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())

  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (let d = 1; d <= diasNoMes; d++) cells.push(d)

  return (
    <div className="px-3 pb-1 select-none flex-1 flex flex-col">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => mes === 0 ? (setMes(11), setAno(a => a - 1)) : setMes(m => m - 1)}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 transition">
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{MESES[mes]} {ano}</span>
        <button onClick={() => mes === 11 ? (setMes(0), setAno(a => a + 1)) : setMes(m => m + 1)}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 transition">
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Cabeçalho dos dias */}
      <div className="grid grid-cols-7 mb-0.5">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{d}</div>
        ))}
      </div>

      {/* Células — compactas para caber no widget */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
        {cells.map((dia, i) => {
          const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
          return (
            <div key={i} className={`flex items-center justify-center text-[11px] rounded-full mx-0.5
              ${isHoje ? 'bg-blue-600 text-white font-bold' : dia ? 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-default' : ''}`}>
              {dia}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarioMini({ calendarUrl }: Props) {
  const [expandido, setExpandido] = useState(false)

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden" style={{ height: '100%' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Google Agenda</p>
          </div>
          <button onClick={() => setExpandido(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition">
            Expandir
          </button>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <MiniCalendario />
        </div>
      </div>

      {/* Popup — Google Calendar embed */}
      {expandido && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-[92vh] flex flex-col overflow-hidden" style={{ maxWidth: 1200 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <p className="font-semibold text-gray-900 text-sm">Google Agenda — V&G Certificação Digital</p>
              </div>
              <button onClick={() => setExpandido(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FullCalendar interativo — com cores, clique esq. edita, clique dir. troca cor */}
            <div className="flex-1 overflow-hidden">
              <CalendarioInterativo />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
