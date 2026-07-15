'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function NovaMetaForm({ mesAtual, anoAtual }: { mesAtual: number; anoAtual: number }) {
  const router = useRouter()
  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(anoAtual)
  const [metaProducao, setMetaProducao] = useState(350)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/performance/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, ano, metaProducao }),
      })
      const data = await res.json()
      if (res.ok) router.refresh()
      else setErro(data.erro ?? 'Erro ao salvar meta')
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
      <p className="font-semibold text-gray-700 dark:text-white text-sm">Definir meta mensal</p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Mês</label>
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm capitalize"
          >
            {NOMES_MES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Ano</label>
          <input
            type="number"
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Meta</label>
          <input
            type="number"
            value={metaProducao}
            onChange={e => setMetaProducao(Number(e.target.value))}
            min={1}
            className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {erro && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

      <button
        type="submit"
        disabled={salvando}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar meta
      </button>
    </form>
  )
}
