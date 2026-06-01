'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'

const INATIVO_MS     = 10 * 60 * 1000  // 10 minutos → aviso
const LOGOUT_MS      = 12 * 60 * 1000  // 12 minutos → logout
const HEARTBEAT_MS   = 60 * 1000       // 1 minuto → registra atividade

export function InatividadeWatcher() {
  const ultimaAtividade  = useRef(Date.now())
  const [aviso,  setAviso]  = useState(false)
  const [contagem, setContagem] = useState(120) // 2 min em segundos

  useEffect(() => {
    const resetar = () => {
      ultimaAtividade.current = Date.now()
      setAviso(false)
      setContagem(120)
    }

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    eventos.forEach(e => window.addEventListener(e, resetar, { passive: true }))

    // Heartbeat — registra 1 minuto ativo a cada minuto se houve atividade recente
    const heartbeatInterval = setInterval(() => {
      const inativo = Date.now() - ultimaAtividade.current
      if (inativo < HEARTBEAT_MS) {
        fetch('/api/sessao/heartbeat', { method: 'POST' }).catch(() => {})
      }
    }, HEARTBEAT_MS)

    // Verificador de inatividade — checa a cada 30s
    const verificador = setInterval(() => {
      const inativo = Date.now() - ultimaAtividade.current
      if (inativo >= LOGOUT_MS) {
        signOut({ callbackUrl: '/login' })
      } else if (inativo >= INATIVO_MS) {
        setAviso(true)
        setContagem(Math.max(0, Math.ceil((LOGOUT_MS - inativo) / 1000)))
      }
    }, 30_000)

    // Contagem regressiva quando aviso está ativo
    const contador = setInterval(() => {
      if (aviso) setContagem(c => Math.max(0, c - 1))
    }, 1000)

    return () => {
      eventos.forEach(e => window.removeEventListener(e, resetar))
      clearInterval(heartbeatInterval)
      clearInterval(verificador)
      clearInterval(contador)
    }
  }, [aviso])

  if (!aviso) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏱️</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Você está inativo
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Por segurança, você será desconectado em{' '}
          <span className="font-bold text-amber-600">{contagem}s</span>
        </p>
        <button
          onClick={() => {
            const now = Date.now()
            setAviso(false)
            setContagem(120)
            // Simula atividade
            window.dispatchEvent(new MouseEvent('mousemove'))
          }}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition">
          Continuar no sistema
        </button>
      </div>
    </div>
  )
}
