'use client'

import { useRouter } from 'next/navigation'

interface Props {
  basePath:   string
  mes:        number
  ano:        number
  statusAtual: string
  agrAtual:   string
  // demais filtros já aplicados (busca, bonificado), para não se perderem
  outrosParams?: string
}

const AGR_OPTIONS = [
  { value: '',            label: 'Todos os AGRs' },
  { value: 'vinicius',    label: 'Vinicius' },
  { value: 'arlen',      label: 'Arlen' },
  { value: 'ana.karolina', label: 'Ana Karolina' },
  { value: 'laryssa',    label: 'Laryssa' },
]

export function FiltroAgr({ basePath, mes, ano, statusAtual, agrAtual, outrosParams }: Props) {
  const router = useRouter()

  function navegar(agr: string) {
    const params = new URLSearchParams(outrosParams)
    params.set('mes',    String(mes))
    params.set('ano',    String(ano))
    if (statusAtual) params.set('status', statusAtual)
    else params.delete('status')
    if (agr) params.set('agr', agr)
    else params.delete('agr')
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <select
      value={agrAtual}
      onChange={e => navegar(e.target.value)}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
    >
      {AGR_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
