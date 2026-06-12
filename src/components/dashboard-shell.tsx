'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from './sidebar'
import { WelcomePopup } from './welcome-popup'
import { AssistenteWidget } from './assistente-widget'
import { NotificacaoAgenda } from './notificacao-agenda'
import { MobileBottomNav } from './mobile-bottom-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)
  const { data: session } = useSession()

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
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 pb-24 lg:pb-0">
        <MobileMenuProvider onAbrirMenu={() => setMenuAberto(true)}>
          {children}
        </MobileMenuProvider>
      </main>

      {/* Navegação inferior — mobile/tablet */}
      <MobileBottomNav />

      {/* Popup de boas-vindas — aparece uma vez por dia */}
      {session?.user?.name && (
        <WelcomePopup nomeUsuario={session.user.name} />
      )}

      {/* Assistente AGR — widget flutuante */}
      <AssistenteWidget />

      {/* Notificações de reunião do Google Calendar */}
      <NotificacaoAgenda />
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