'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'

export function BotaoReenviar({ logId }: { logId: string }) {
  const router = useRouter()
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle')
  const [msg, setMsg] = useState('')

  async function reenviar() {
    setEstado('loading')
    try {
      const res = await fetch(`/api/emails/${logId}/reenviar`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setEstado('erro')
        setMsg(data.erro ?? 'Erro ao reenviar')
      } else {
        setEstado('ok')
        setTimeout(() => { router.refresh(); setEstado('idle') }, 2000)
      }
    } catch {
      setEstado('erro')
      setMsg('Falha de conexão')
    }
  }

  if (estado === 'ok') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> Reenviado!
      </span>
    )
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        onClick={reenviar}
        disabled={estado === 'loading'}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-50"
      >
        {estado === 'loading'
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando…</>
          : <><RefreshCw className="w-3 h-3" /> Reenviar</>}
      </button>
      {estado === 'erro' && <p className="text-[10px] text-red-500 max-w-[160px] leading-tight">{msg}</p>}
    </div>
  )
}
