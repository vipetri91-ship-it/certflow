'use client'

import { useState, useEffect } from 'react'
import { Settings, ExternalLink } from 'lucide-react'

interface Props {
  calendarUrl?: string
}

export function AgendaTabDash({ calendarUrl }: Props) {
  const [url, setUrl] = useState(calendarUrl ?? '')
  const [editando, setEditando] = useState(!calendarUrl)
  const [inputUrl, setInputUrl] = useState(calendarUrl ?? '')

  useEffect(() => {
    // Tenta carregar URL salva no localStorage como fallback
    const saved = localStorage.getItem('certflow_calendar_url')
    if (saved && !calendarUrl) {
      setUrl(saved)
      setEditando(false)
    }
  }, [calendarUrl])

  function salvar() {
    localStorage.setItem('certflow_calendar_url', inputUrl)
    setUrl(inputUrl)
    setEditando(false)
    // Salva também no banco via API
    fetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'google_calendar_embed_url', valor: inputUrl }),
    }).catch(() => {})
  }

  if (editando || !url) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-5 min-h-96">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 w-full max-w-2xl">
          <h2 className="font-bold text-gray-900 text-lg mb-2">Configurar Google Agenda</h2>
          <p className="text-sm text-gray-500 mb-5">
            Para exibir a agenda V&G aqui, você precisa do <strong>link de incorporação</strong> do Google Calendar.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-5 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Como obter o link:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Abra o <strong>Google Calendar</strong> com a conta da V&G</li>
              <li>Clique nos 3 pontos ao lado de <strong>"V&G Certificação Digital"</strong></li>
              <li>Selecione <strong>"Configurações e compartilhamento"</strong></li>
              <li>Role até <strong>"Integrar agenda"</strong></li>
              <li>Copie a URL que começa com <code className="bg-blue-100 px-1 rounded">https://calendar.google.com/calendar/embed?src=</code></li>
            </ol>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={salvar}
                disabled={!inputUrl.includes('calendar.google.com')}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Salvar e exibir agenda
              </button>
              <a
                href="https://calendar.google.com/calendar/r/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Google Calendar
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Garante que a URL tem os parâmetros corretos para exibição completa
  const embedUrl = (() => {
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
    } catch {
      return url
    }
  })()

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior com botão de configurar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <p className="text-xs text-gray-400">Google Agenda — V&G Certificação Digital</p>
        <button
          onClick={() => { setInputUrl(url); setEditando(true) }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar
        </button>
      </div>

      {/* Google Calendar iframe — interação total: drag, drop, criar, editar */}
      <iframe
        src={embedUrl}
        className="flex-1 w-full"
        style={{ minHeight: 'calc(100vh - 180px)', border: 'none' }}
        allowFullScreen
        title="Google Agenda V&G"
      />
    </div>
  )
}