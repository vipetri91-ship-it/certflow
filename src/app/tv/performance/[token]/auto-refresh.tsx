'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Tela sem interação humana (TV de escritório) — atualiza sozinha buscando
// os dados de novo no servidor, mesmo padrão de polling já usado em
// notificacao-emissao-watcher.tsx, só que via router.refresh() em vez de
// fetch próprio, já que aqui é a página inteira (Server Component) que
// precisa recalcular o indicador.
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(interval)
  }, [router, intervalMs])

  return null
}
