import Link from 'next/link'
import { DollarSign, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'

interface Props {
  faturamentoMes: number
  aReceber:       number
  vencendo7:      number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function WidgetFinanceiro({ faturamentoMes, aReceber, vencendo7 }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden" style={{ height: '100%' }}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Financeiro</p>
        </div>
        <Link href="/financeiro/contas-a-receber" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
          Ver <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-2 min-h-0">
        {/* Faturamento */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Faturamento Mês</p>
          </div>
          <p className="text-xl font-black text-green-700 dark:text-green-400 shrink-0">{fmt(faturamentoMes)}</p>
        </div>

        {/* A Receber */}
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">A Receber</p>
          </div>
          <p className="text-xl font-black text-teal-700 dark:text-teal-400 shrink-0">{fmt(aReceber)}</p>
        </div>

        {/* Vencimentos */}
        <Link href="/renovacoes"
          className={`flex items-center justify-between rounded-xl px-4 py-3 transition ${
            vencendo7 > 0 ? 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100' : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100'
          }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${vencendo7 > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Vencem em 7 dias</p>
          </div>
          <p className={`text-xl font-black ${vencendo7 > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{vencendo7}</p>
        </Link>
      </div>
    </div>
  )
}
