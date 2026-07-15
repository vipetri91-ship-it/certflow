'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { LABEL_TIPO_OCORRENCIA } from '@/lib/performance/qualidade-shared'

interface Props {
  usuarios: { id: string; nome: string }[]
}

const TIPOS = Object.keys(LABEL_TIPO_OCORRENCIA) as (keyof typeof LABEL_TIPO_OCORRENCIA)[]

export function NovaOcorrenciaForm({ usuarios }: Props) {
  const router = useRouter()
  const [tipo, setTipo] = useState<string>('ERRO_PEQUENO')
  const [descricao, setDescricao] = useState('')
  const [observacao, setObservacao] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/performance/ocorrencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descricao, observacao: observacao || undefined, usuarioId: usuarioId || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setDescricao(''); setObservacao(''); setUsuarioId('')
        router.refresh()
      } else {
        setErro(data.erro ?? 'Erro ao registrar ocorrência')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
      <p className="font-semibold text-gray-700 dark:text-white text-sm">Registrar ocorrência</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Tipo</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          >
            {TIPOS.map(t => <option key={t} value={t}>{LABEL_TIPO_OCORRENCIA[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400">Responsável (opcional)</label>
          <select
            value={usuarioId}
            onChange={e => setUsuarioId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          >
            <option value="">— não informado —</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">O que aconteceu</label>
        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          required
          rows={2}
          className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          placeholder="Descreva objetivamente o ocorrido"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-slate-400">Observação (opcional)</label>
        <textarea
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          rows={1}
          className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
          placeholder="Contexto adicional, ação tomada, etc."
        />
      </div>

      {erro && <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

      <button
        type="submit"
        disabled={salvando}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Registrar
      </button>
    </form>
  )
}
