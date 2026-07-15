'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const OPCOES: { valor: string; label: string; cor: string }[] = [
  { valor: 'NOVA', label: 'Nova', cor: 'bg-blue-100 text-blue-700' },
  { valor: 'EM_ANALISE', label: 'Em análise', cor: 'bg-yellow-100 text-yellow-700' },
  { valor: 'IMPLEMENTADA', label: 'Implementada', cor: 'bg-green-100 text-green-700' },
]

export function MelhoriaStatusSelect({ id, statusAtual }: { id: string; statusAtual: string }) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)

  async function mudar(status: string) {
    if (status === statusAtual || salvando) return
    setSalvando(true)
    try {
      await fetch(`/api/performance/melhorias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  if (salvando) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />

  return (
    <select
      value={statusAtual}
      onChange={e => mudar(e.target.value)}
      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer whitespace-nowrap ${OPCOES.find(o => o.valor === statusAtual)?.cor}`}
    >
      {OPCOES.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
    </select>
  )
}
