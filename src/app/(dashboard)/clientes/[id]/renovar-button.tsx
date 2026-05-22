'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'

export function RenovarButton({ certificadoId }: { certificadoId: string }) {
  const [renovando, setRenovando] = useState(false)
  const [renovado, setRenovado] = useState(false)

  async function renovar() {
    if (!confirm('Marcar este certificado como RENOVADO?')) return
    setRenovando(true)
    try {
      const res = await fetch(`/api/certificados/${certificadoId}/renovar`, { method: 'POST' })
      if (res.ok) {
        setRenovado(true)
        window.location.reload()
      }
    } catch {}
    setRenovando(false)
  }

  if (renovado) return <span className="text-xs text-blue-500">✓ Renovado</span>

  return (
    <button
      onClick={renovar}
      disabled={renovando}
      className="flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
    >
      {renovando ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      Renovar
    </button>
  )
}
