'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const CalendarioInterativo = dynamic(
  () => import('@/components/calendario-interativo').then(m => m.CalendarioInterativo),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    ),
  }
)

export function AgendaFullScreen() {
  return (
    <div className="h-full">
      <CalendarioInterativo />
    </div>
  )
}
