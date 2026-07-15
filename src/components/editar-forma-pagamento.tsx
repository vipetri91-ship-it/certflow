'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, CheckCircle, X, Loader2 } from 'lucide-react'
import { FORMAS_PAGAMENTO } from '@/lib/financeiro-config'

interface Props {
  id:   string
  forma: string
}

export function EditarFormaPagamento({ id, forma }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [novaForma, setNovaForma] = useState(forma)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch(`/api/financeiro/lancamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formaPagamento: novaForma }),
      })
      if (res.ok) {
        setEditando(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setErro(data.erro ?? 'Erro ao salvar')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  if (!editando) {
    return (
      <button
        onClick={() => { setNovaForma(forma === '—' ? FORMAS_PAGAMENTO[0] : forma); setErro(''); setEditando(true) }}
        className="group flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg px-1.5 py-0.5 -mx-1.5 transition"
        title="Editar forma de pagamento"
      >
        <span>{forma}</span>
        <Pencil className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition" />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <select
          autoFocus
          value={novaForma}
          onChange={e => setNovaForma(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setEditando(false) }}
          className="px-1.5 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={salvar} disabled={loading} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setEditando(false)} disabled={loading} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {erro && <span className="text-xs text-red-500">{erro}</span>}
    </div>
  )
}
