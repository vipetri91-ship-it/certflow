'use client'

import { useRouter } from 'next/navigation'

interface Props {
  basePath:   string
  mes:        number
  ano:        number
  statusAtual: string
  agrAtual:   string
}

const AGR_OPTIONS = [
  { value: '',            label: 'Todos os AGRs' },
  { value: 'vinicius',    label: 'Vinicius' },
  { value: 'arlen',      label: 'Arlen' },
  { value: 'ana.karolina', label: 'Ana Karolina' },
  { value: 'laryssa',    label: 'Laryssa' },
]

export function FiltroAgr({ basePath, mes, ano, statusAtual, agrAtual }: Props) {
  const router = useRouter()

  function navegar(agr: string) {
    const params = new URLSearchParams()
    params.set('mes',    String(mes))
    params.set('ano',    String(ano))
    if (statusAtual) params.set('status', statusAtual)
    if (agr)         params.set('agr',    agr)
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
