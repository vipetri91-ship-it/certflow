'use client'

import { ShoppingCart, DollarSign, Fingerprint, Cake, Info, Users, Menu } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useMobileMenu } from './dashboard-shell'
import Link from 'next/link'
import { useState } from 'react'

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

  const acoes = [
    {
      icon: ShoppingCart,
      label: 'Nova Venda',
      href: '/pedidos/novo',
      cor: 'hover:text-blue-600 hover:bg-blue-50',
    },
    {
      icon: DollarSign,
      label: 'Preços de Custo',
      href: '/configuracoes/precos',
      cor: 'hover:text-green-600 hover:bg-green-50',
    },
    {
      icon: Fingerprint,
      label: 'Consultar Biometria PSbio',
      href: '/biometria',
      cor: 'hover:text-purple-600 hover:bg-purple-50',
    },
    {
      icon: Cake,
      label: 'Aniversários de Parceiros',
      href: '/parceiros?filtro=aniversario',
      cor: 'hover:text-pink-600 hover:bg-pink-50',
    },
  ]

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-5 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onAbrirMenu}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base lg:text-lg font-semibold text-gray-900">{titulo}</h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Ícones de ação */}
        {acoes.map((acao) => (
          <Link
            key={acao.label}
            href={acao.href}
            title={acao.label}
            className={`p-2 rounded-lg text-gray-400 transition ${acao.cor}`}
          >
            <acao.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </Link>
        ))}

        {/* Informações / Atualizações */}
        <div className="relative">
          <button
            onClick={() => setShowInfo(!showInfo)}
            title="Informações e atualizações"
            className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
          >
            <Info style={{ width: 18, height: 18 }} />
          </button>
          {showInfo && (
            <div className="absolute right-0 top-10 w-72 bg-white border border-gray-100 rounded-xl shadow-lg p-4 z-50">
              <p className="font-semibold text-gray-900 text-sm mb-2">Atualizações do Sistema</p>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <p><strong>13/05/2026</strong> — Dashboard com Agenda, Produção e Financeiro</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                  <p><strong>13/05/2026</strong> — Formulários de clientes e pedidos</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                  <p><strong>13/05/2026</strong> — Relatório diário por e-mail às 18h</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                  <p><strong>13/05/2026</strong> — Integração Google Agenda</p>
                </div>
              </div>
              <button onClick={() => setShowInfo(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Fechar</button>
            </div>
          )}
        </div>

        {/* Usuários ativos */}
        <ActiveUsers />

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Avatar do usuário */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-900 leading-tight">
              {session?.user?.name ?? 'Usuário'}
            </p>
            <p className="text-xs text-gray-400 leading-tight">
              {ROLE_LABELS[session?.user?.role ?? ''] ?? session?.user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

function ActiveUsers() {
  const [count] = useState(1) // Por ora mostra 1 (o próprio usuário)

  return (
    <button
      title="Usuários ativos no sistema"
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
    >
      <Users style={{ width: 18, height: 18 }} />
      <span className="text-xs font-medium">{count}</span>
    </button>
  )
}