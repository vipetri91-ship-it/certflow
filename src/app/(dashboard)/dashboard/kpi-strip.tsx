import Link from 'next/link'
import { TrendingUp, Award, DollarSign, AlertCircle, ShoppingBag } from 'lucide-react'

interface Props {
  vendasHoje:   number
  vendasMes:    number
  faturamentoMes: number
  emissoesMes:  number
  aReceber:     number
  vencendo7:    number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function KpiStrip({ vendasHoje, vendasMes, faturamentoMes, emissoesMes, aReceber, vencendo7 }: Props) {
  const cards = [
    {
      label:  'Vendas Hoje',
      valor:  String(vendasHoje),
      sub:    `${vendasMes} no mês`,
      icon:   ShoppingBag,
      cor:    'text-blue-600',
      bg:     'bg-blue-50 dark:bg-blue-900/20',
      href:   '/pedidos',
    },
    {
      label:  'Faturamento Mês',
      valor:  fmt(faturamentoMes),
      sub:    'pedidos não cancelados',
      icon:   DollarSign,
      cor:    'text-green-600',
      bg:     'bg-green-50 dark:bg-green-900/20',
      href:   '/financeiro/contas-a-receber',
    },
    {
      label:  'Emissões Mês',
      valor:  String(emissoesMes),
      sub:    'certificados emitidos',
      icon:   Award,
      cor:    'text-indigo-600',
      bg:     'bg-indigo-50 dark:bg-indigo-900/20',
      href:   '/pedidos',
    },
    {
      label:  'A Receber',
      valor:  fmt(aReceber),
      sub:    'pendente este mês',
      icon:   TrendingUp,
      cor:    'text-teal-600',
      bg:     'bg-teal-50 dark:bg-teal-900/20',
      href:   '/financeiro/contas-a-receber',
    },
    {
      label:  'Vencem em 7 dias',
      valor:  String(vencendo7),
      sub:    vencendo7 > 0 ? '⚠ Renovações urgentes' : 'Nenhum no radar',
      icon:   AlertCircle,
      cor:    vencendo7 > 0 ? 'text-orange-500' : 'text-gray-400',
      bg:     vencendo7 > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-slate-700',
      href:   '/renovacoes',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <Link key={c.label} href={c.href}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition group">
          <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
            <c.icon className={`w-4 h-4 ${c.cor}`} />
          </div>
          <p className={`text-xl font-black ${c.cor} leading-none`}>{c.valor}</p>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-1">{c.label}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{c.sub}</p>
        </Link>
      ))}
    </div>
  )
}
