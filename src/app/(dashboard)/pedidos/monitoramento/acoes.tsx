'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileCheck, Loader2 } from 'lucide-react'
import { PopupCertificadoEmitido } from '@/components/popup-certificado-emitido'

interface Props {
  pedidoId: string
  tipo: 'status' | 'protocolo'
  statusAtual?: string
}

export function MonitoramentoAcoes({ pedidoId, tipo, statusAtual }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [protocolo, setProtocolo] = useState('')
  const [editando, setEditando] = useState(false)
  const [mostrarPopup, setMostrarPopup] = useState(false)

  async function avancar() {
    const proximo = statusAtual === 'GERADO' ? 'VERIFICADO' : statusAtual === 'VERIFICADO' ? 'EMITIDO' : null
    if (!proximo) return
    setLoading(true)
    await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: proximo }),
    })
    setLoading(false)
    if (proximo === 'EMITIDO') {
      setMostrarPopup(true)
    } else {
      router.refresh()
    }
  }

  async function salvarProtocolo() {
    if (!protocolo.trim()) return
    setLoading(true)
    await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numeroCompra: protocolo.trim(), status: 'VERIFICADO' }),
    })
    setEditando(false)
    router.refresh()
    setLoading(false)
  }

  if (tipo === 'protocolo') {
    if (editando) {
      return (
        <div className="flex items-center gap-1">
          <input
            value={protocolo}
            onChange={e => setProtocolo(e.target.value)}
            placeholder="Protocolo"
            className="w-24 px-2 py-1 border border-gray-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={e => e.key === 'Enter' && salvarProtocolo()}
            autoFocus
          />
          <button onClick={salvarProtocolo} disabled={loading} className="p-1 text-green-600 hover:text-green-700">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          </button>
        </div>
      )
    }
    return (
      <button onClick={() => setEditando(true)} className="text-xs text-blue-600 hover:underline">
        + Protocolo
      </button>
    )
  }

  // tipo = 'status'
  if (statusAtual === 'EMITIDO' || statusAtual === 'CANCELADO') {
    return <span className="text-xs text-gray-300">—</span>
  }

  return (
    <>
      <button onClick={avancar} disabled={loading}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition disabled:opacity-50 bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
        {statusAtual === 'GERADO' ? 'Verificar' : 'Finalizar'}
      </button>
      {mostrarPopup && (
        <PopupCertificadoEmitido
          pedidoId={pedidoId}
          onFechar={() => { setMostrarPopup(false); router.refresh() }}
        />
      )}
    </>
  )
}
