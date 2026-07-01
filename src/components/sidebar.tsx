'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import {
  LayoutDashboard, Users, Handshake,
  DollarSign, BarChart3, Settings, LogOut,
  Bell, UserCog, ClipboardList, Monitor, ShoppingBag,
  ChevronDown, Plus, User, RefreshCw, Menu, Sparkles, Award, Building2, Receipt, BellRing, CalendarDays, Newspaper, ShieldCheck, Search, Scale, Car, Tags,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type MenuItem  = { label: string; href: string; icon: React.ElementType }
type MenuGroup = { tipo: 'grupo'; label: string; icon: React.ElementType; itens: MenuItem[] }
type MenuSingle = { tipo: 'item'; label: string; href: string; icon: React.ElementType }
type MenuEntry  = MenuGroup | MenuSingle

const MENU_PADRAO: MenuEntry[] = [
  { tipo: 'item', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { tipo: 'item', label: 'Agenda',    href: '/agenda',    icon: CalendarDays },

  {
    tipo: 'grupo', label: 'Cadastros', icon: Users,
    itens: [
      { label: 'Clientes',     href: '/clientes',     icon: User },
      { label: 'Parceiros',    href: '/parceiros',    icon: Handshake },
      { label: 'Fornecedores', href: '/fornecedores', icon: ShoppingBag },
    ],
  },

  {
    tipo: 'grupo', label: 'Certificado Digital', icon: Monitor,
    itens: [
      { label: 'Nova Venda',     href: '/pedidos/nova-venda',      icon: Plus },
      { label: 'Monitoramento',    href: '/pedidos/monitoramento',   icon: Monitor },
      { label: 'Notificações',   href: '/pedidos/notificacoes',    icon: BellRing },
      { label: 'Eventos Safeweb', href: '/eventos-safeweb',         icon: Bell },
      { label: 'Recibo',         href: '/recibo',                  icon: Receipt },
      { label: 'Orçamento',      href: '/orcamento',               icon: ClipboardList },
      { label: 'Resp. RFB',      href: '/pedidos/rfb',             icon: Search },
      { label: 'Calculadora de Deslocamento', href: '/pedidos/calculadora-deslocamento', icon: Car },
    ],
  },

  { tipo: 'item', label: 'Renovações', href: '/renovacoes', icon: RefreshCw },
  { tipo: 'item', label: 'Notícias',   href: '/noticias',   icon: Newspaper },

  {
    tipo: 'grupo', label: 'Financeiro', icon: DollarSign,
    itens: [
      { label: 'Contas a Receber', href: '/financeiro/contas-a-receber', icon: DollarSign },
      { label: 'Contas a Pagar',      href: '/financeiro/contas-a-pagar',   icon: BarChart3 },
      { label: 'Comissões',          href: '/financeiro/comissoes',        icon: Handshake },
      { label: 'Prod. Detalhada',    href: '/relatorios',                  icon: BarChart3 },
      { label: 'Conciliações',       href: '/financeiro/conciliacoes',     icon: Scale },
    ],
  },

  { tipo: 'item', label: 'SST',        href: '/sst',        icon: ShieldCheck },

  {
    tipo: 'grupo', label: 'Configurações', icon: Settings,
    itens: [
      { label: 'Usuários',   href: '/usuarios',                     icon: UserCog },
      { label: 'Modelos',    href: '/configuracoes/modelos',        icon: Award },
      { label: 'Tabelas de Preço', href: '/configuracoes/tabelas-preco', icon: Tags },
      { label: 'E-mails',    href: '/configuracoes/emails',         icon: Bell },
      { label: 'Auditoria',  href: '/configuracoes/auditoria',      icon: ClipboardList },
      { label: 'Assistente', href: '/configuracoes/assistente',     icon: Sparkles },
      { label: 'Empresa',    href: '/configuracoes/empresa',        icon: Building2 },
      { label: 'Integrações', href: '/configuracoes',                icon: Settings },
    ],
  },
]

const MENU_FINANCEIRO: MenuEntry[] = [
  { tipo: 'item', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    tipo: 'grupo', label: 'Financeiro', icon: DollarSign,
    itens: [
      { label: 'Contas a Receber', href: '/financeiro/contas-a-receber', icon: DollarSign },
      { label: 'Conciliações',     href: '/financeiro/conciliacoes',     icon: Scale },
    ],
  },
]

interface SidebarProps { aberta?: boolean; onFechar?: () => void }

export function Sidebar({ aberta = true, onFechar }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [recolhida, setRecolhida] = useState(true)

  // Detecta PWA standalone ou dispositivo sem hover (touch) → sempre expandida
  useEffect(() => {
    const isStandalone  = window.matchMedia('(display-mode: standalone)').matches
    const isTouchOnly   = window.matchMedia('(hover: none)').matches
    if (isStandalone || isTouchOnly) setRecolhida(false)
  }, [])

  // No mobile drawer (onFechar definido) ou touch/PWA, sempre expandida
  const expandido = !recolhida || !!onFechar

  const role = session?.user?.role
  const semFinanceiro = ['OPERADOR', 'VISUALIZADOR']

  const semSST = (menu: typeof MENU_PADRAO) => menu.filter(e => !(e.tipo === 'item' && e.label === 'SST'))

  const MENU = role === 'FINANCEIRO'
    ? MENU_FINANCEIRO
    : semFinanceiro.includes(role ?? '')
      ? semSST(MENU_PADRAO).filter(e => !(e.tipo === 'grupo' && e.label === 'Financeiro'))
      : role === 'ADMIN'
        ? MENU_PADRAO
        : semSST(MENU_PADRAO)

  const gruposAbertosInicial = MENU.reduce<Record<string, boolean>>((acc, entry) => {
    if (entry.tipo === 'grupo') {
      // No mobile, abre todos os grupos por padrão para facilitar a navegação
      acc[entry.label] = !!onFechar || entry.itens.some(i => pathname.startsWith(i.href))
    }
    return acc
  }, {})

  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(gruposAbertosInicial)

  function toggleGrupo(label: string) {
    setGruposAbertos(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <>
      {aberta && onFechar && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onFechar} />
      )}

      <aside
        className={cn(
          'flex flex-col h-screen z-40 transition-all duration-300 shrink-0',
          'bg-white dark:bg-[#0d1117] border-r border-gray-100 dark:border-[#21293b] shadow-sm dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)]',
          'fixed lg:relative',
          onFechar ? aberta ? 'translate-x-0' : '-translate-x-full' : 'translate-x-0',
          expandido ? 'w-60' : 'w-16'
        )}
        onMouseEnter={() => !onFechar && setRecolhida(false)}
        onMouseLeave={() => !onFechar && setRecolhida(true)}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-gray-100 dark:border-slate-700 shrink-0">
          {expandido ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/vaz-mark.svg" alt="VAZ Group" className="h-7 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-sm text-blue-700 dark:text-blue-400 tracking-tight leading-tight">CertFlow</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight truncate">V&G Certificação Digital</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto shrink-0"
              style={{ background: 'linear-gradient(135deg, #6622ee, #00aaff)' }}>
              <span className="text-white font-bold text-sm leading-none">V</span>
            </div>
          )}
          {onFechar && (
            <button onClick={onFechar} className="lg:hidden p-1 rounded hover:bg-gray-100 text-gray-500">
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU.map(entry => {
            if (entry.tipo === 'item') {
              const ativo = pathname === entry.href || pathname.startsWith(entry.href + '/')
              return (
                <Link key={entry.href} href={entry.href} onClick={onFechar}
                  title={!expandido ? entry.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                    ativo ? 'bg-blue-50 dark:bg-[rgba(124,111,205,0.2)] text-blue-700 dark:text-[#a78bfa] font-semibold dark:border-l-2 dark:border-[#7c6fcd]' : 'text-gray-600 dark:text-[#8892a4] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-blue-600 dark:hover:text-[#a78bfa] hover:font-semibold',
                    !expandido && 'justify-center px-2'
                  )}>
                  <entry.icon className={cn('w-4 h-4 shrink-0', ativo ? 'text-blue-600 dark:text-[#a78bfa]' : 'text-gray-400 dark:text-[#545e78]')} />
                  {expandido && <span>{entry.label}</span>}
                </Link>
              )
            }

            const grupo = entry as MenuGroup
            const grupoAtivo = grupo.itens.some(i => pathname.startsWith(i.href))
            const aberto = gruposAbertos[grupo.label] ?? false

            if (!expandido) {
              return (
                <div key={grupo.label} className="space-y-0.5">
                  <div className={cn('flex justify-center py-2.5 px-2 rounded-lg', grupoAtivo ? 'text-blue-600' : 'text-gray-400')}>
                    <grupo.icon className="w-4 h-4" />
                  </div>
                </div>
              )
            }

            return (
              <div key={grupo.label}>
                <button onClick={() => toggleGrupo(grupo.label)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all',
                    grupoAtivo ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:font-semibold'
                  )}>
                  <div className="flex items-center gap-2.5">
                    <grupo.icon className={cn('w-4 h-4 shrink-0', grupoAtivo ? 'text-blue-600' : 'text-gray-400')} />
                    <span>{grupo.label}</span>
                  </div>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', aberto && 'rotate-180')} />
                </button>

                {aberto && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-slate-700 pl-3">
                    {grupo.itens.map(item => {
                      const ativo = pathname.startsWith(item.href)
                      return (
                        <Link key={item.href} href={item.href} onClick={onFechar}
                          className={cn(
                            'flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all',
                            ativo ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:font-semibold'
                          )}>
                          <item.icon className={cn('w-3.5 h-3.5 shrink-0', ativo ? 'text-blue-600' : 'text-gray-400')} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3 pt-2 border-t border-gray-100 dark:border-slate-700 shrink-0">
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            title={!expandido ? 'Sair' : undefined}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:font-semibold transition-all',
              !expandido && 'justify-center px-2'
            )}>
            <LogOut className="w-4 h-4 shrink-0" />
            {expandido && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}