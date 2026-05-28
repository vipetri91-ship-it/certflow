'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileCheck, XCircle, Loader2 } from 'lucide-react'
import { PopupCertificadoEmitido } from '@/components/popup-certificado-emitido'

const PROXIMOS_STATUS: Record<string, { label: string; proximo: string; cor: string }> = {
  GERADO: { label: 'Marcar como Verificado', proximo: 'VERIFICADO', cor: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  VERIFICADO: { label: 'Marcar como Emitido', proximo: 'EMITIDO', cor: 'bg-green-600 hover:bg-green-700 text-white' },
}

interface Props {
  pedidoId: string
  statusAtual: string
}

export function PedidoAcoes({ pedidoId, statusAtual }: Props) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [mostrarPopup, setMostrarPopup] = useState(false)

  const proximo = PROXIMOS_STATUS[statusAtual]

  async function avancarStatus() {
    if (!proximo) return
    setCarregando(true)
    try {
      await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: proximo.proximo }),
      })
      if (proximo.proximo === 'EMITIDO') {
        setMostrarPopup(true)
      } else {
        router.refresh()
      }
    } finally {
      setCarregando(false)
    }
  }

  async function cancelar() {
    if (!confirm('Confirmar cancelamento do pedido?')) return
    setCancelando(true)
    try {
      await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADO' }),
      })
      router.refresh()
    } finally {
      setCancelando(false)
    }
  }

  if (statusAtual === 'CANCELADO' || statusAtual === 'EMITIDO') return null

  return (
    <>
      <div className="flex gap-2">
        {proximo && (
          <button
            onClick={avancarStatus}
            disabled={carregando}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${proximo.cor}`}
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : statusAtual === 'GERADO' ? <FileCheck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {proximo.label}
          </button>
        )}
        <button
          onClick={cancelar}
          disabled={cancelando}
          className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-50"
        >
          {cancelando ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Cancelar
        </button>
      </div>
      {mostrarPopup && (
        <PopupCertificadoEmitido
          pedidoId={pedidoId}
          onFechar={() => { setMostrarPopup(false); router.refresh() }}
        />
      )}
    </>
  )
}