'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Award,
  Handshake,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Bell,
  UserCog,
  ClipboardList,
  Calendar,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const MENU = [
  {
    titulo: 'Principal',
    itens: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      { label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
      { label: 'Clientes', href: '/clientes', icon: Users },
      { label: 'Certificados', href: '/certificados', icon: Award },
      { label: 'Parceiros', href: '/parceiros', icon: Handshake },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart3 },
      { label: 'Google Agenda', href: '/agenda', icon: Calendar },
      { label: 'E-mails', href: '/configuracoes/emails', icon: Bell },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [
      { label: 'Usuários', href: '/usuarios', icon: UserCog },
      { label: 'Auditoria', href: '/configuracoes/auditoria', icon: ClipboardList },
      { label: 'Sistema', href: '/configuracoes', icon: Settings },
    ],
  },
]

interface SidebarProps {
  aberta?: boolean
  onFechar?: () => void
}

export function Sidebar({ aberta = true, onFechar }: SidebarProps) {
  const pathname = usePathname()
  const [recolhida, setRecolhida] = useState(false)

  return (
    <>
      {/* Overlay mobile */}
      {aberta && onFechar && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onFechar}
        />
      )}

      <aside
        className={cn(
          'flex flex-col h-screen z-40 transition-all duration-300 shrink-0',
          'bg-gradient-to-b from-blue-600 to-blue-700 text-white',
          // Mobile: drawer lateral
          'fixed lg:relative',
          onFechar
            ? aberta ? 'translate-x-0' : '-translate-x-full'
            : 'translate-x-0',
          recolhida ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-blue-500/40">
          {!recolhida && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">CertFlow</span>
            </div>
          )}
          {recolhida && (
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg mx-auto">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Fechar no mobile */}
          {onFechar && (
            <button
              onClick={onFechar}
              className="lg:hidden p-1 rounded hover:bg-white/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Recolher no desktop */}
          {!onFechar && !recolhida && (
            <button
              onClick={() => setRecolhida(true)}
              className="hidden lg:flex p-1 rounded hover:bg-white/20 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {!onFechar && recolhida && (
            <button
              onClick={() => setRecolhida(false)}
              className="hidden lg:flex absolute left-16 top-4 z-50 items-center justify-center w-6 h-6 bg-blue-600 rounded-full border border-blue-400 hover:bg-blue-500 transition"
            >
              <ChevronLeft className="w-3 h-3 rotate-180" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {MENU.map((grupo) => (
            <div key={grupo.titulo}>
              {!recolhida && (
                <p className="px-3 mb-1 text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
                  {grupo.titulo}
                </p>
              )}
              <ul className="space-y-0.5">
                {grupo.itens.map((item) => {
                  const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onFechar}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          ativo
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-blue-100 hover:bg-white/10 hover:text-white',
                          recolhida && 'justify-center px-2'
                        )}
                        title={recolhida ? item.label : undefined}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!recolhida && <span>{item.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-blue-500/40">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition',
              recolhida && 'justify-center px-2'
            )}
            title={recolhida ? 'Sair' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!recolhida && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}