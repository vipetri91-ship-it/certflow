import Link from 'next/link'
import { ShoppingBag, Award, ArrowRight } from 'lucide-react'

interface Props {
  vendasHoje:  number
  vendasMes:   number
  emissoesMes: number
  mediaDiaria: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function WidgetVendas({ vendasHoje, vendasMes, emissoesMes, mediaDiaria }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Vendas</p>
        </div>
        <Link href="/pedidos" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
          Ver <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{vendasHoje}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Hoje</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{vendasMes}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">No mês</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Award className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-xl font-black text-green-700 dark:text-green-400">{emissoesMes}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Emissões mês</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-gray-700 dark:text-gray-200">{mediaDiaria.toFixed(1)}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Média/dia</p>
          </div>
        </div>
      </div>
    </div>
  )
}
