'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, X, Loader2, Ban } from 'lucide-react'

const FORMAS = ['Pix', 'Boleto', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Safe2Pay']

interface BaixaButtonProps { id: string }

export function BaixaButton({ id }: BaixaButtonProps) {
  const router = useRouter()
  const [aberto,  setAberto]  = useState(false)
  const [forma,   setForma]   = useState('Pix')
  const [loading, setLoading] = useState(false)

  async function confirmar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/financeiro/lancamentos/${id}/baixa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formaPagamento: forma }),
      })
      if (res.ok) {
        router.refresh()
        setAberto(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Dar Baixa
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 rounded-xl p-2 shadow-lg min-w-[220px]">
      <select
        value={forma}
        onChange={e => setForma(e.target.value)}
        className="flex-1 text-xs border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
      >
        {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <button
        onClick={confirmar}
        disabled={loading}
        className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
        title="Confirmar"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => setAberto(false)}
        disabled={loading}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
        title="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Botão Cancelar lançamento ─────────────────────────────────────────────────

interface CancelarButtonProps { id: string }

export function CancelarButton({ id }: CancelarButtonProps) {
  const router  = useRouter()
  const [confirmar, setConfirmar] = useState(false)
  const [loading,   setLoading]   = useState(false)

  async function executar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/financeiro/lancamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADO' }),
      })
      if (res.ok) {
        router.refresh()
        setConfirmar(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!confirmar) {
    return (
      <button
        onClick={() => setConfirmar(true)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
      >
        <Ban className="w-3.5 h-3.5" />
        Cancelar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-xl p-2 shadow-lg">
      <span className="text-xs text-red-700 dark:text-red-400 font-medium whitespace-nowrap">Cancelar lançamento?</span>
      <button
        onClick={executar}
        disabled={loading}
        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
        title="Confirmar cancelamento"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => setConfirmar(false)}
        disabled={loading}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 transition"
        title="Não cancelar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
