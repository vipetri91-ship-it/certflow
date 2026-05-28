'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, User, Award, BarChart2,
  FileText, LogOut, Menu, ChevronDown, Sparkles, Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Parceiro {
  id: string
  nome: string
  razaoSocial: string | null
  nomeFantasia: string | null
}

interface Props {
  parceiro: Parceiro
  children: React.ReactNode
}

type MenuItem  = { label: string; href: string; icon: React.ElementType }
type MenuGroup = { label: string; icon: React.ElementType; itens: MenuItem[] }
type MenuEntry = { label: string; href: string; icon: React.ElementType } | MenuGroup

function isGroup(e: MenuEntry): e is MenuGroup { return 'itens' in e }

const MENU: MenuEntry[] = [
  { label: 'Início', href: '/portal', icon: LayoutDashboard },
  { label: 'ZOE — IA',  href: '/portal/zoe',      icon: Sparkles },
  { label: 'Notícias', href: '/portal/noticias', icon: Newspaper },
  {
    label: 'Parceiro', icon: User, itens: [
      { label: 'Cadastro',      href: '/portal/cadastro',      icon: User },
      { label: 'Certificados',  href: '/portal/certificados',  icon: Award },
    ],
  },
  {
    label: 'Gestão', icon: BarChart2, itens: [
      { label: 'Relatórios', href: '/portal/relatorios', icon: BarChart2 },
    ],
  },
  {
    label: 'Regulamento', icon: FileText, itens: [
      { label: 'Informações', href: '/portal/regulamento', icon: FileText },
    ],
  },
]

export function PortalShell({ parceiro, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [grupos, setGrupos] = useState<Record<string, boolean>>({ Parceiro: true, Gestão: false, Regulamento: false })

  const nomeExibicao = parceiro.nomeFantasia || parceiro.razaoSocial || parceiro.nome

  async function sair() {
    await fetch('/api/portal/logout', { method: 'POST' })
    router.push('/portal/login')
  }

  function Sidebar() {
    return (
      <aside className="flex flex-col h-full bg-white border-r border-gray-100 shadow-sm w-60 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 shrink-0">
          <img src="/logo-vg.png" alt="V&G" className="h-7 w-auto" />
          <div>
            <p className="font-bold text-sm text-blue-700 leading-tight">CertFlow</p>
            <p className="text-[10px] text-gray-400 leading-tight">Portal do Parceiro</p>
          </div>
        </div>

        {/* Parceiro logado */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Parceiro</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5 leading-snug line-clamp-2">{nomeExibicao}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU.map(item => {
            if (!isGroup(item)) {
              const ativo = pathname === item.href
              const isZoe = item.href === '/portal/zoe'
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                    ativo
                      ? isZoe ? 'bg-violet-100 text-violet-700 font-semibold' : 'bg-blue-50 text-blue-700 font-semibold'
                      : isZoe
                        ? 'text-violet-600 hover:bg-violet-50 hover:text-violet-700 hover:font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:font-semibold'
                  )}>
                  <item.icon className={cn('w-4 h-4 shrink-0',
                    ativo
                      ? isZoe ? 'text-violet-600' : 'text-blue-600'
                      : isZoe ? 'text-violet-500' : 'text-gray-400'
                  )} />
                  {item.label}
                  {isZoe && !ativo && (
                    <span className="ml-auto text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">IA</span>
                  )}
                </Link>
              )
            }

            const grupoAtivo = item.itens.some(i => pathname.startsWith(i.href))
            const aberto = grupos[item.label] ?? false

            return (
              <div key={item.label}>
                <button onClick={() => setGrupos(g => ({ ...g, [item.label]: !g[item.label] }))}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all',
                    grupoAtivo ? 'text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:font-semibold'
                  )}>
                  <div className="flex items-center gap-2.5">
                    <item.icon className={cn('w-4 h-4 shrink-0', grupoAtivo ? 'text-blue-600' : 'text-gray-400')} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', aberto && 'rotate-180')} />
                </button>
                {aberto && (
                  <div className="ml-6 mt-0.5 border-l border-gray-100 pl-3 space-y-0.5">
                    {item.itens.map(sub => {
                      const ativo = pathname.startsWith(sub.href)
                      return (
                        <Link key={sub.href} href={sub.href}
                          onClick={() => setMenuAberto(false)}
                          className={cn(
                            'flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all',
                            ativo ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:font-semibold'
                          )}>
                          <sub.icon className={cn('w-3.5 h-3.5 shrink-0', ativo ? 'text-blue-600' : 'text-gray-400')} />
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Sair */}
        <div className="px-2 pb-3 pt-2 border-t border-gray-100 shrink-0">
          <button onClick={sair}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 hover:font-semibold transition-all">
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {menuAberto && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMenuAberto(false)} />
          <div className="fixed left-0 top-0 h-full z-50 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
          <button onClick={() => setMenuAberto(true)} className="text-white">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-white font-semibold text-sm">Portal do Parceiro</p>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
