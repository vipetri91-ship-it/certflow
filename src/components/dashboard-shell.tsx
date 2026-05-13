'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop — sempre visível */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Sidebar mobile — drawer */}
      <div className="lg:hidden">
        <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Injeta onAbrirMenu nos filhos via context não é trivial,
            então passamos via wrapper que clona o children */}
        <MobileMenuProvider onAbrirMenu={() => setMenuAberto(true)}>
          {children}
        </MobileMenuProvider>
      </main>
    </div>
  )
}

// Context para passar o callback do menu para o Header
import { createContext, useContext } from 'react'

const MenuContext = createContext<{ onAbrirMenu: () => void }>({ onAbrirMenu: () => {} })

export function useMobileMenu() {
  return useContext(MenuContext)
}

function MobileMenuProvider({
  children,
  onAbrirMenu,
}: {
  children: React.ReactNode
  onAbrirMenu: () => void
}) {
  return <MenuContext.Provider value={{ onAbrirMenu }}>{children}</MenuContext.Provider>
}