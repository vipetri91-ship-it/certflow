'use client'

import { useEffect, useRef, useState } from 'react'
import { PopupCertificadoEmitido } from './popup-certificado-emitido'

const POLL_INTERVAL_MS = 25_000

export function NotificacaoEmissaoWatcher() {
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const verificando = useRef(false)

  async function verificar() {
    if (verificando.current) return
    verificando.current = true
    try {
      const res = await fetch('/api/pedidos/notificacoes-pendentes')
      if (!res.ok) return
      const { pedidoId: id } = await res.json()
      if (id) setPedidoId(id)
    } catch {
      // falha silenciosa — próximo ciclo tenta novamente
    } finally {
      verificando.current = false
    }
  }

  useEffect(() => {
    verificar()
    const interval = setInterval(verificar, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  if (!pedidoId) return null

  async function fechar() {
    // Marca como visto para não reaparecer
    await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ popupNotificacaoVisto: true }),
    })
    setPedidoId(null)
    // Verifica imediatamente se há outro pedido pendente
    setTimeout(verificar, 500)
  }

  return <PopupCertificadoEmitido pedidoId={pedidoId} onFechar={fechar} />
}