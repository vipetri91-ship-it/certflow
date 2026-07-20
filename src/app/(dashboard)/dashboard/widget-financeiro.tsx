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
    <div className="bg-panel rounded-2xl border border-stroke shadow-[var(--shadow)] flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-g-soft rounded-lg flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-grn" />
          </div>
          <p className="text-sm font-semibold text-txt-strong">Contas a Receber</p>
        </div>
        <Link href="/financeiro/contas-a-receber" className="text-xs text-violet hover:text-violet-2 flex items-center gap-1">
          Ver <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-4 gap-2 min-h-0">

        {/* Total em aberto */}
        <div className="bg-g-soft rounded-xl px-4 py-3 text-center">
          <p className="text-xs font-medium text-mut uppercase tracking-wide mb-0.5">Total em Aberto</p>
          <p className="text-2xl font-black text-grn tabnum">{fmt(aReceber)}</p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <Users className="w-3 h-3 text-mut-2" />
            <p className="text-xs text-mut-2">
              {aReceberQtd} conta{aReceberQtd !== 1 ? 's' : ''} pendente{aReceberQtd !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Vencidos */}
        <Link href="/financeiro/contas-a-receber?status=VENCIDO"
          className={`rounded-xl px-4 py-2.5 flex items-center justify-between transition ${
            temVencidos ? 'bg-r-soft hover:opacity-90' : 'bg-panel-2'
          }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${temVencidos ? 'text-red' : 'text-mut-2'}`} />
            <div>
              <p className={`text-xs font-semibold ${temVencidos ? 'text-red' : 'text-mut-2'}`}>
                Vencidos
              </p>
              <p className="text-xs text-mut-2">{aReceberVencidosQtd} conta{aReceberVencidosQtd !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <p className={`text-base font-black tabnum ${temVencidos ? 'text-red' : 'text-mut-2'}`}>
            {fmt(aReceberVencidos)}
          </p>
        </Link>

        {/* No prazo */}
        <div className="bg-c-soft rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-cyan shrink-0" />
            <div>
              <p className="text-xs font-semibold text-cyan">No prazo</p>
              <p className="text-xs text-mut-2">{emDiaQtd} conta{emDiaQtd !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <p className="text-base font-black text-cyan tabnum">{fmt(emDia)}</p>
        </div>

      </div>
    </div>
  )
}