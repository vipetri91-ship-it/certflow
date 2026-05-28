import Link from 'next/link'
import { AlertCircle, ArrowRight } from 'lucide-react'

interface CertCard {
  id: string
  dataVencimento: string
  cliente: { nome: string }
  modelo: { nome: string }
}

interface Props {
  vencidos: CertCard[]
  em7:      CertCard[]
  em15:     CertCard[]
  em30:     CertCard[]
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function WidgetVencimentos({ vencidos, em7, em15, em30 }: Props) {
  const faixas = [
    { label: 'Vencidos',  count: vencidos.length, cor: 'bg-red-500',    textCor: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-900/20',    lista: vencidos },
    { label: '7 dias',    count: em7.length,      cor: 'bg-orange-500', textCor: 'text-orange-700', bg: 'bg-orange-50 dark:bg-orange-900/20', lista: em7 },
    { label: '15 dias',   count: em15.length,     cor: 'bg-yellow-500', textCor: 'text-yellow-700', bg: 'bg-yellow-50 dark:bg-yellow-900/20', lista: em15 },
    { label: '30 dias',   count: em30.length,     cor: 'bg-green-500',  textCor: 'text-green-700',  bg: 'bg-green-50 dark:bg-green-900/20',  lista: em30 },
  ]

  // Próximos 3 certificados mais urgentes
  const urgentes = [...vencidos, ...em7]
    .slice(0, 3)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Vencimentos</p>
        </div>
        <Link href="/renovacoes" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 4 faixas */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {faixas.map(f => (
          <div key={f.label} className={`${f.bg} rounded-xl p-2.5 text-center`}>
            <p className={`text-xl font-black ${f.textCor}`}>{f.count}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{f.label}</p>
          </div>
        ))}
      </div>

      {/* Lista dos mais urgentes */}
      {urgentes.length > 0 ? (
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Mais urgentes</p>
          {urgentes.map(c => (
            <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-slate-700 last:border-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{c.cliente.nome}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{c.modelo.nome}</p>
              </div>
              <span className="text-xs font-semibold text-red-600 shrink-0">{fmt(c.dataVencimento)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400 text-center">Nenhum certificado urgente</p>
        </div>
      )}
    </div>
  )
}
