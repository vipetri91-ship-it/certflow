'use client'

import { useEffect, useRef, useState } from 'react'
import { PopupCertificadoEmitido } from './popup-certificado-emitido'

// Intervalo de checagem de notificação pendente no banco (leve — só leitura).
const NOTIF_INTERVAL_MS = 25_000

// Intervalo de reconciliação Safeweb (consulta API externa — mais conservador).
// A cada 60s o sistema verifica se algum protocolo em VERIFICADO já foi emitido
// na Safeweb mas o webhook nunca chegou — e avança para EMITIDO automaticamente.
const RECONCILIAR_INTERVAL_MS = 60_000

export function NotificacaoEmissaoWatcher() {
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const verificando    = useRef(false)
  const reconciliando  = useRef(false)

  async function reconciliarSafeweb() {
    if (reconciliando.current) return
    reconciliando.current = true
    try {
      const res = await fetch('/api/jobs/reconciliar-protocolos', { method: 'POST' })
      if (!res.ok) return
      const data: { emitidos?: number } = await res.json()
      // Se algum pedido avançou para EMITIDO, força checagem imediata de notificação
      if ((data.emitidos ?? 0) > 0) await verificar()
    } catch {
      // falha silenciosa — próximo ciclo tenta novamente
    } finally {
      reconciliando.current = false
    }
  }

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
    // Na abertura: reconcilia imediatamente e checa notificações
    reconciliarSafeweb().then(() => verificar())

    const notifInterval       = setInterval(verificar, NOTIF_INTERVAL_MS)
    const reconciliarInterval = setInterval(reconciliarSafeweb, RECONCILIAR_INTERVAL_MS)

    return () => {
      clearInterval(notifInterval)
      clearInterval(reconciliarInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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