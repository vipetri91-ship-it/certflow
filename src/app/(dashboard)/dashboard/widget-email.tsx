'use client'

import { useState } from 'react'
import { Mail, ExternalLink, X, Maximize2 } from 'lucide-react'

const EMAIL        = 'piracaia@vegcertificado.com.br'
const WEBMAIL_URL  = 'https://webmail-seguro.com.br/vegcertificado.com.br/'
const AUTOLOGIN_URL = '/api/webmail/autologin'

export function WidgetEmail() {
  const [expandido,  setExpandido]  = useState(false)
  const [iframeErro, setIframeErro] = useState(false)

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden" style={{ height: '100%' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">E-mail</p>
          </div>
          <button
            onClick={() => { setExpandido(true); setIframeErro(false) }}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Expandir
          </button>
        </div>

        {/* Iframe direto no widget */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 -mx-1">
          <iframe
            src={AUTOLOGIN_URL}
            className="w-full h-full border-0"
            title="Webmail"
            style={{ minHeight: 0 }}
          />
        </div>
      </div>

      {/* Modal expandido */}
      {expandido && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
          {/* Barra superior */}
          <div className="bg-white dark:bg-slate-800 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-red-500" />
              <span className="font-semibold text-gray-800 dark:text-white text-sm">{EMAIL}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={WEBMAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition px-3 py-1.5 border border-blue-200 rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir em nova aba
              </a>
              <button
                onClick={() => setExpandido(false)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* iframe ou fallback */}
          {iframeErro ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-slate-900">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                <Mail className="w-10 h-10 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-gray-700 dark:text-slate-300 font-semibold mb-1">O webmail bloqueou a incorporação</p>
                <p className="text-sm text-gray-400 dark:text-slate-500">Clique abaixo para abrir em uma nova aba</p>
              </div>
              <a
                href={WEBMAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition"
              >
                <Mail className="w-5 h-5" /> Abrir Caixa de Entrada
              </a>
            </div>
          ) : (
            <iframe
              src={AUTOLOGIN_URL}
              className="flex-1 w-full border-0"
              title="Webmail"
              onError={() => setIframeErro(true)}
              onLoad={(e) => {
                try {
                  const src = (e.target as HTMLIFrameElement).contentWindow?.location?.href
                  if (!src || src === 'about:blank') setIframeErro(true)
                } catch { setIframeErro(true) }
              }}
            />
          )}
        </div>
      )}
    </>
  )
}