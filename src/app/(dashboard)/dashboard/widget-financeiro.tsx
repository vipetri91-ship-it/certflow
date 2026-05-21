import Link from 'next/link'
import { DollarSign, AlertTriangle, ArrowRight, Users } from 'lucide-react'

interface Props {
  aReceber:            number
  aReceberVencidos:    number
  aReceberQtd:         number
  aReceberVencidosQtd: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function WidgetFinanceiro({ aReceber, aReceberVencidos, aReceberQtd, aReceberVencidosQtd }: Props) {
  const emDia = aReceber - aReceberVencidos
  const emDiaQtd = aReceberQtd - aReceberVencidosQtd
  const temVencidos = aReceberVencidosQtd > 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Contas a Receber</p>
        </div>
        <Link href="/financeiro/contas-a-receber" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
          Ver <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4 gap-2 min-h-0">

        {/* Total em aberto */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3 text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Total em Aberto</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-400">{fmt(aReceber)}</p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <Users className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {aReceberQtd} conta{aReceberQtd !== 1 ? 's' : ''} pendente{aReceberQtd !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Vencidos */}
        <Link href="/financeiro/contas-a-receber?status=VENCIDO"
          className={`rounded-xl px-4 py-2.5 flex items-center justify-between transition ${
            temVencidos
              ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
              : 'bg-gray-50 dark:bg-slate-700/50'
          }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${temVencidos ? 'text-red-500' : 'text-gray-300 dark:text-slate-600'}`} />
            <div>
              <p className={`text-xs font-semibold ${temVencidos ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'}`}>
                Vencidos
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{aReceberVencidosQtd} conta{aReceberVencidosQtd !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <p className={`text-base font-black ${temVencidos ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-slate-600'}`}>
            {fmt(aReceberVencidos)}
          </p>
        </Link>

        {/* No prazo */}
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">No prazo</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{emDiaQtd} conta{emDiaQtd !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <p className="text-base font-black text-teal-600 dark:text-teal-400">{fmt(emDia)}</p>
        </div>

      </div>
    </div>
  )
}