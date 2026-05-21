'use client'

import { Mail, ExternalLink } from 'lucide-react'

const EMAIL        = 'piracaia@vegcertificado.com.br'
const AUTOLOGIN_URL = '/api/webmail/autologin'

export function WidgetEmail() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">E-mail</p>
        </div>
        <a
          href={AUTOLOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir
        </a>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 min-h-0">

        {/* Ícone animado */}
        <div className="relative">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
            <Mail className="w-10 h-10 text-red-400" />
          </div>
          {/* Indicador de novo e-mail */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400 dark:text-slate-500">Caixa de entrada</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{EMAIL}</p>
        </div>

        {/* Botão principal */}
        <a
          href={AUTOLOGIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-red-200"
        >
          <Mail className="w-4 h-4" /> Abrir Caixa de Entrada
        </a>

        <p className="text-xs text-gray-400 dark:text-slate-500 text-center px-2">
          Abre já logado em uma nova aba
        </p>
      </div>
    </div>
  )
}