'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

interface Props {
  usuarios: { id: string; nome: string }[]
}

export function NovoFocoForm({ usuarios }: Props) {
  const router = useRouter()
  const [objetivo, setObjetivo] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [prazo, setPrazo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/performance/foco-do-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo, responsavelId: responsavelId || undefined, prazo: prazo || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setObjetivo(''); setResponsavelId(''); setPrazo('')
        router.refresh()
      } else {
        setErro(data.erro ?? 'Erro ao salvar')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
      <p className="font-semibold text-gray-700 dark:text-white text-sm">Definir foco de hoje</p>

      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">Objetivo</label>
        <textarea
          value={objetivo}
          onChange={e => setObjetivo(e.target.value)}
          required
          rows={2}
          className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          placeholder="Ex: Finalizar renovações pendentes de outubro"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Responsável (opcional)</label>
          <select
            value={responsavelId}
            onChange={e => setResponsavelId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          >
            <option value="">— não informado —</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Prazo (opcional)</label>
          <input
            type="date"
            value={prazo}
            onChange={e => setPrazo(e.target.value)}
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
        Salvar
      </button>
    </form>
  )
}
