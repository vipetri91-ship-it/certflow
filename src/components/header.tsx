'use client'

import { ShoppingCart, DollarSign, Fingerprint, Cake, Info, Users, Menu, Monitor, LogOut, UserCog, ChevronDown, Bell } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useMobileMenu } from './dashboard-shell'
import { ThemeToggle } from './theme-toggle'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

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
  const [showInfo, setShowInfo] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUser(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const acoes = [
    { icon: ShoppingCart, label: 'Nova Venda',               href: '/pedidos/nova-venda',        cor: 'hover:text-blue-600 hover:bg-blue-50' },
    { icon: Monitor,      label: 'Monitoramento',             href: '/pedidos/monitoramento',     cor: 'hover:text-indigo-600 hover:bg-indigo-50' },
    { icon: DollarSign,   label: 'Preços de Custo',           href: '/configuracoes/precos',      cor: 'hover:text-green-600 hover:bg-green-50' },
    { icon: Fingerprint,  label: 'Consultar Biometria PSbio', href: '/biometria',                 cor: 'hover:text-purple-600 hover:bg-purple-50' },
    { icon: Cake,         label: 'Aniversários de Parceiros', href: '/parceiros?filtro=aniversario', cor: 'hover:text-pink-600 hover:bg-pink-50' },
  ]

  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    async function buscar() {
      try {
        const r = await fetch('/api/notificacoes/nao-lidas')
        const j = await r.json()
        setNaoLidas(j.total ?? 0)
      } catch { /* silencioso */ }
    }
    buscar()
    const t = setInterval(buscar, 10_000) // atualiza a cada 10s
    return () => clearInterval(t)
  }, [])

  const nomeUsuario = session?.user?.name ?? 'Usuário'
  const roleLabel = ROLE_LABELS[session?.user?.role ?? ''] ?? session?.user?.role ?? ''
  const iniciais = nomeUsuario.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex flex-col shrink-0 sticky top-0 z-20"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-14 flex items-center justify-between px-4 lg:px-5 w-full">
      {/* Esquerda */}
      <div className="flex items-center gap-3">
        <button onClick={onAbrirMenu} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-gray-900">{titulo}</h1>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-0.5">

        {/* Ícones de ação rápida — ocultos em telas muito pequenas */}
        <div className="hidden sm:flex items-center gap-0.5">
          {acoes.map(acao => (
            <Link key={acao.label} href={acao.href} title={acao.label}
              className={`p-2 rounded-lg text-gray-400 transition ${acao.cor}`}>
              <acao.icon style={{ width: 18, height: 18 }} />
            </Link>
          ))}
        </div>

        {/* Informações do sistema */}
        <div className="relative">
          <button onClick={() => { setShowInfo(!showInfo); setShowUser(false) }} title="Atualizações do sistema"
            className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition hidden sm:flex">
            <Info style={{ width: 18, height: 18 }} />
          </button>
          {showInfo && (
            <div className="absolute right-0 top-11 w-72 bg-white border border-gray-100 rounded-xl shadow-xl p-4 z-50">
              <p className="font-semibold text-gray-900 text-sm mb-2">Atualizações do Sistema</p>
              <div className="space-y-2 text-xs text-gray-600">
                {[
                  { data: '14/05/2026', texto: 'Nova Venda com wizard 4 etapas + Monitoramento' },
                  { data: '14/05/2026', texto: 'Dashboard redesenhado com painel AGR' },
                  { data: '13/05/2026', texto: 'Relatórios, e-mails automáticos e auditoria' },
                  { data: '13/05/2026', texto: 'Integração Google Agenda' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <p><strong>{item.data}</strong> — {item.texto}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowInfo(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Fechar</button>
            </div>
          )}
        </div>

        {/* Usuários ativos */}
        <button title="Usuários ativos"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
          <Users style={{ width: 18, height: 18 }} />
          <span className="text-xs font-medium">1</span>
        </button>

        {/* Notificações Safeweb */}
        <Link
          href="/eventos-safeweb"
          title="Eventos Safeweb"
          className="relative p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
        >
          <Bell style={{ width: 18, height: 18 }} />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {naoLidas > 99 ? '99+' : naoLidas}
            </span>
          )}
        </Link>

        {/* Modo claro / escuro */}
        <ThemeToggle />

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 mx-1.5" />

        {/* Usuário — clicável com dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUser(!showUser); setShowInfo(false) }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {iniciais}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{nomeUsuario}</p>
              <p className="text-xs text-gray-400 leading-tight">{roleLabel}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform hidden sm:block ${showUser ? 'rotate-180' : ''}`} />
          </button>

          {showUser && (
            <div className="absolute right-0 top-11 w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-3 py-2 border-b border-gray-50 mb-1">
                <p className="text-xs font-semibold text-gray-900">{nomeUsuario}</p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>
              <Link href="/perfil" onClick={() => setShowUser(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                <UserCog className="w-4 h-4 text-gray-400" />
                Editar Meus Dados
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  )
}