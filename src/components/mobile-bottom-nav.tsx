'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Plus, Users, Menu as MenuIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileMenu } from './dashboard-shell'

const ITENS = [
  { label: 'Início',  href: '/dashboard', icon: Home },
  { label: 'Agenda',  href: '/agenda',    icon: CalendarDays },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()
  const { onAbrirMenu } = useMobileMenu()

  function ativo(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
    >
      <div className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full bg-white/70 dark:bg-[#0d1117]/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-lg shadow-black/10">
        {ITENS.map(item => (
          <Link key={item.href} href={item.href} aria-label={item.label}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full transition-all',
              ativo(item.href)
                ? 'bg-blue-50 dark:bg-[rgba(124,111,205,0.2)] text-blue-600 dark:text-[#a78bfa]'
                : 'text-gray-500 dark:text-[#8892a4]'
            )}>
            <item.icon className="w-5 h-5" />
          </Link>
        ))}

        {/* Nova Venda — destaque central */}
        <Link href="/pedidos/nova-venda" aria-label="Nova Venda"
          className="flex items-center justify-center w-12 h-12 rounded-full text-white shadow-md transition-all"
          style={{ background: 'linear-gradient(135deg, #6622ee, #00aaff)' }}>
          <Plus className="w-5 h-5" />
        </Link>

        <Link href="/clientes" aria-label="Clientes"
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full transition-all',
            ativo('/clientes')
              ? 'bg-blue-50 dark:bg-[rgba(124,111,205,0.2)] text-blue-600 dark:text-[#a78bfa]'
              : 'text-gray-500 dark:text-[#8892a4]'
          )}>
          <Users className="w-5 h-5" />
        </Link>

        <button onClick={onAbrirMenu} aria-label="Menu"
          className="flex items-center justify-center w-12 h-12 rounded-full text-gray-500 dark:text-[#8892a4] transition-all">
          <MenuIcon className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
