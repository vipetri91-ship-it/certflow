'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { ModalCancelarPedido } from '@/components/modal-cancelar-pedido'

interface Props {
  pedidoId: string
  numeroPedido: string
  statusAtual: string
  podeCancelar: boolean
}

export function PedidoAcoes({ pedidoId, numeroPedido, statusAtual, podeCancelar }: Props) {
  const router = useRouter()
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false)

  if (statusAtual === 'CANCELADO' || statusAtual === 'EMITIDO') return null
  if (!podeCancelar) return null

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setMostrarModalCancelar(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
        >
          <XCircle className="w-4 h-4" />
          Cancelar
        </button>
      </div>
      {mostrarModalCancelar && (
        <ModalCancelarPedido
          pedidoId={pedidoId}
          numeroPedido={numeroPedido}
          onFechar={() => setMostrarModalCancelar(false)}
          onCancelado={() => { setMostrarModalCancelar(false); router.refresh() }}
        />
      )}
    </>
  )
}