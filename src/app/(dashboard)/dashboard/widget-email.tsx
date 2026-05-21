'use client'

import { useEffect, useState } from 'react'
import { Mail, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react'

const EMAIL         = 'piracaia@vegcertificado.com.br'
const AUTOLOGIN_URL = '/api/webmail/autologin'

export function WidgetEmail() {
  const [naoLidos, setNaoLidos] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ultimaVez, setUltimaVez] = useState('')

  async function buscarNaoLidos() {
    setCarregando(true)
    try {
      const res = await fetch('/api/webmail/unread')
      const data = await res.json()
      setNaoLidos(data.naoLidos ?? 0)
      setUltimaVez(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setNaoLidos(null)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    buscarNaoLidos()
    const interval = setInterval(buscarNaoLidos, 60_000) // checa a cada 1 min
    return () => clearInterval(interval)
  }, [])

  const temNovos = naoLidos !== null && naoLidos > 0

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
        <div className="flex items-center gap-2">
          <button onClick={buscarNaoLidos} title="Atualizar"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
          <a href={AUTOLOGIN_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium transition">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir
          </a>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">

        {/* Ícone com badge */}
        <div className="relative">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
            temNovos ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-slate-700'
          }`}>
            <Mail className={`w-10 h-10 ${temNovos ? 'text-red-500' : 'text-gray-300 dark:text-slate-500'}`} />
          </div>
          {temNovos && (
            <span className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-md animate-bounce">
              {naoLidos}
            </span>
          )}
        </div>

        {/* Status */}
        {carregando && naoLidos === null ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">Verificando...</p>
        ) : temNovos ? (
          <div className="text-center space-y-1">
            <p className="text-lg font-black text-red-600 dark:text-red-400">
              {naoLidos} novo{naoLidos !== 1 ? 's' : ''} e-mail{naoLidos !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{EMAIL}</p>
          </div>
        ) : (
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">Caixa em dia</p>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">{EMAIL}</p>
          </div>
        )}

        {/* Botão */}
        <a href={AUTOLOGIN_URL} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition shadow-sm ${
            temNovos ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-gray-400 hover:bg-gray-500 dark:bg-slate-600 dark:hover:bg-slate-500'
          }`}>
          <Mail className="w-4 h-4" />
          {temNovos ? 'Ver mensagens' : 'Abrir E-mail'}
        </a>

        {ultimaVez && (
          <p className="text-xs text-gray-300 dark:text-slate-600">
            Atualizado às {ultimaVez}
          </p>
        )}
      </div>
    </div>
  )
}