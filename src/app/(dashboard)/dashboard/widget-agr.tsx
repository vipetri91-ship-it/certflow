import { Users } from 'lucide-react'

interface PerformanceAgr {
  agr: string
  vendas: number
  valorVendas: number
  emissoes: number
}

interface Props {
  performanceAgr: PerformanceAgr[]
}

const AGR_LABEL: Record<string, string> = {
  'vinicius':     'Vinicius',
  'arlen':        'Arlen',
  'ana.karolina': 'Ana Karolina',
  'laryssa':      'Laryssa',
}
const AGR_COR: Record<string, string> = {
  'vinicius':     'bg-green-500',
  'arlen':        'bg-blue-500',
  'ana.karolina': 'bg-purple-500',
  'laryssa':      'bg-pink-500',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function WidgetAgr({ performanceAgr }: Props) {
  const ordenado = [...performanceAgr].sort((a, b) => b.vendas - a.vendas)
  const maxVendas = Math.max(...performanceAgr.map(a => a.vendas), 1)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ranking AGR — Mês</p>
      </div>

      <div className="flex-1 space-y-3">
        {ordenado.map((agr, i) => {
          const pct = maxVendas > 0 ? (agr.vendas / maxVendas) * 100 : 0
          return (
            <div key={agr.agr}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}º</span>
                  <div className={`w-2 h-2 rounded-full ${AGR_COR[agr.agr] ?? 'bg-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {AGR_LABEL[agr.agr] ?? agr.agr}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{agr.vendas}</span>
                  <span className="text-xs text-gray-400 ml-1">vendas</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${AGR_COR[agr.agr] ?? 'bg-gray-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{fmt(agr.valorVendas)}</p>
            </div>
          )
        })}

        {ordenado.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Sem vendas este mês</p>
        )}
      </div>
    </div>
  )
}
