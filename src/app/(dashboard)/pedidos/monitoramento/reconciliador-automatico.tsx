'use client'

// Componente invisível — sem UI.
// Toda vez que a página de monitoramento é aberta ou recarregada,
// consulta a Safeweb para todos os pedidos em VERIFICADO e avança
// automaticamente para EMITIDO os que já foram emitidos.
// Comportamento idêntico ao do controller Safeweb (sem clique do usuário).

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  temPendentes: boolean
}

export function ReconciliadorAutomatico({ temPendentes }: Props) {
  const router  = useRouter()
  const rodando = useRef(false)

  useEffect(() => {
    if (!temPendentes || rodando.current) return
    rodando.current = true

    fetch('/api/jobs/reconciliar-protocolos', { method: 'POST' })
      .then(r => r.json())
      .then((data: { emitidos?: number }) => {
        if ((data.emitidos ?? 0) > 0) router.refresh()
      })
      .catch(() => { /* silencioso — não interrompe o usuário */ })
  }, [temPendentes, router])

  return null
}