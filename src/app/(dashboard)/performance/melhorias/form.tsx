'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

const CATEGORIAS: { valor: string; label: string }[] = [
  { valor: 'ECONOMIA', label: 'Economia' },
  { valor: 'AUTOMACAO', label: 'Automação' },
  { valor: 'PROCESSO', label: 'Processo' },
  { valor: 'ATENDIMENTO', label: 'Atendimento' },
  { valor: 'MARKETING', label: 'Marketing' },
]

export function NovaMelhoriaForm() {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('PROCESSO')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/performance/melhorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, categoria }),
      })
      const data = await res.json()
      if (res.ok) {
        setTitulo(''); setDescricao('')
        router.refresh()
      } else {
        setErro(data.erro ?? 'Erro ao registrar ideia')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
      <p className="font-semibold text-gray-700 dark:text-white text-sm">Sugerir uma ideia de melhoria</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          required
          placeholder="Título curto"
          className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
        />
        <select
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
        >
          {CATEGORIAS.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
        </select>
      </div>

      <textarea
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        required
        rows={2}
        placeholder="Descreva a ideia"
        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
      />

      {erro && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

      <button
        type="submit"
        disabled={salvando}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Enviar ideia
      </button>
    </form>
  )
}
