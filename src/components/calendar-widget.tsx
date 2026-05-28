'use client'

import { useState, useEffect } from 'react'
import { Calendar, X, ExternalLink } from 'lucide-react'

export function CalendarWidget() {
  const [aberto, setAberto] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('certflow_calendar_url')
    if (saved) setUrl(saved)
    else {
      fetch('/api/configuracoes/calendar')
        .then(r => r.json())
        .then(d => { if (d.valor) { setUrl(d.valor); localStorage.setItem('certflow_calendar_url', d.valor) } })
        .catch(() => {})
    }
  }, [])

  const embedUrl = (() => {
    if (!url) return ''
    try {
      const u = new URL(url)
      u.searchParams.set('ctz', 'America/Sao_Paulo')
      u.searchParams.set('mode', 'WEEK')
      u.searchParams.set('showTitle', '0')
      u.searchParams.set('showNav', '1')
      u.searchParams.set('showDate', '1')
      u.searchParams.set('showPrint', '0')
      u.searchParams.set('showTabs', '1')
      u.searchParams.set('showCalendars', '1')
      u.searchParams.set('hl', 'pt-BR')
      return u.toString()
    } catch { return url }
  })()

  return (
    <>
      {/* Botão compacto na sidebar */}
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition"
        title="Abrir Google Agenda"
      >
        <Calendar className="w-5 h-5 shrink-0" />
        <span>Agenda</span>
      </button>

      {/* Popup fullscreen */}
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

            {/* Header do popup */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Google Agenda</p>
                  <p className="text-xs text-gray-400">V&G Certificação Digital</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://calendar.google.com/calendar/r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no Google
                </a>
                <button
                  onClick={() => setAberto(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Calendário */}
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="flex-1 w-full"
                style={{ border: 'none' }}
                allowFullScreen
                title="Google Agenda V&G"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <Calendar className="w-12 h-12 text-gray-300" />
                <p className="text-gray-500 font-medium">Agenda não configurada</p>
                <p className="text-sm text-gray-400 text-center max-w-sm">
                  Configure o link de incorporação do Google Calendar nas configurações do sistema.
                </p>
                <a href="/agenda" onClick={() => setAberto(false)} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                  Configurar agenda
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}