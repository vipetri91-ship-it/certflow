'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

interface Props {
  de: string
  ate: string
}

export function RelatoriosFiltros({ de, ate }: Props) {
  const router = useRouter()
  const [dataInicio, setDataInicio] = useState(de)
  const [dataFim, setDataFim] = useState(ate)

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (dataInicio) params.set('de', dataInicio)
    if (dataFim) params.set('ate', dataFim)
    router.push(`/relatorios?${params.toString()}`)
  }

  function setMesAtual() {
    const hoje = new Date()
    const de = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
    const ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
    setDataInicio(de)
    setDataFim(ate)
    router.push(`/relatorios?de=${de}&ate=${ate}`)
  }

  function setMesAnterior() {
    const hoje = new Date()
    const de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0]
    const ate = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0]
    setDataInicio(de)
    setDataFim(ate)
    router.push(`/relatorios?de=${de}&ate=${ate}`)
  }

  function setUltimos30() {
    const ate = new Date().toISOString().split('T')[0]
    const de = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setDataInicio(de)
    setDataFim(ate)
    router.push(`/relatorios?de=${de}&ate=${ate}`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          <Search className="w-4 h-4" /> Filtrar
        </button>
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={setMesAtual} className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            Mês atual
          </button>
          <button type="button" onClick={setMesAnterior} className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            Mês anterior
          </button>
          <button type="button" onClick={setUltimos30} className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            Últimos 30 dias
          </button>
        </div>
      </form>
    </div>
  )
}
