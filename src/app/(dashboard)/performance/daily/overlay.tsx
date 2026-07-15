'use client'

import Link from 'next/link'
import { X } from 'lucide-react'

// Cobre a tela inteira (inclusive a sidebar) por cima do layout do
// dashboard — evita ter que criar uma árvore de rotas separada só pra
// tirar a sidebar do Modo Daily, que é usado ocasionalmente em reunião.
export function DailyOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-blue-800 to-blue-950">
      <Link
        href="/performance"
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-lg backdrop-blur transition"
      >
        <X className="w-4 h-4" /> Sair do Modo Daily
      </Link>
      {children}
    </div>
  )
}
