'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Props {
  basePath:   string
  buscaAtual: string
  // querystring com os demais filtros já aplicados (mes, ano, status, agr, bonificado)
  outrosParams: string
}

export function FiltroBusca({ basePath, buscaAtual, outrosParams }: Props) {
  const router = useRouter()
  const [valor, setValor] = useState(buscaAtual)

  useEffect(() => {
    const t = setTimeout(() => {
      if (valor === buscaAtual) return
      const params = new URLSearchParams(outrosParams)
      if (valor.trim()) params.set('busca', valor.trim())
      else params.delete('busca')
      router.push(`${basePath}?${params.toString()}`)
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      <input
        value={valor}
        onChange={e => setValor(e.target.value)}
        placeholder="Buscar cliente, responsável..."
        className="text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white w-36 shrink-0"
      />
    </div>
  )
}
