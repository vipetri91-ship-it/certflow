'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useMobileMenu } from './dashboard-shell'

interface HeaderProps {
  titulo: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
  VISUALIZADOR: 'Visualizador',
}

export function Header({ titulo }: HeaderProps) {
  const { data: session } = useSession()
  const { onAbrirMenu } = useMobileMenu()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Botão hamburguer — só mobile */}
        <button
          onClick={onAbrirMenu}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg lg:text-xl font-semibold text-gray-900">{titulo}</h1>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
          <Search className="w-5 h-5" />
        </button>

        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-3 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {session?.user?.name ?? 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {ROLE_LABELS[session?.user?.role ?? ''] ?? session?.user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}