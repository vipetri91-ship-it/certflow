'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, CheckCircle2 } from 'lucide-react'

interface Pedido {
  id: string; numero: string; status: string
  valor: number; cliente: string; modelo: string; hora: string
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function LimparTestesPage() {
  const [pedidos,   setPedidos]   = useState<Pedido[]>([])
  const [loading,   setLoading]   = useState(true)
  const [excluindo, setExcluindo] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/pedidos-teste')
      .then(r => r.json())
      .then(d => {
        setPedidos(d)
        setSelecionados(new Set(d.map((p: Pedido) => p.id)))
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleTodos() {
    if (selecionados.size === pedidos.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(pedidos.map(p => p.id)))
    }
  }

  function toggle(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function excluir() {
    if (!selecionados.size) return
    if (!confirm(`Excluir ${selecionados.size} pedido(s) permanentemente? Esta ação não pode ser desfeita.`)) return
    setExcluindo(true)
    const res = await fetch('/api/admin/pedidos-teste', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selecionados] }),
    })
    const data = await res.json()
    setExcluindo(false)
    if (res.ok) {
      setPedidos(prev => prev.filter(p => !selecionados.has(p.id)))
      setSelecionados(new Set())
      setConcluido(true)
    } else {
      alert(data.erro ?? 'Erro ao excluir')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Limpar Pedidos de Teste — 09/06/2026</h1>
        <p className="text-sm text-gray-500 mt-1">Selecione os pedidos a excluir permanentemente.</p>
      </div>

      {concluido && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4" />
          Pedidos excluídos com sucesso.
        </div>
      )}

      {pedidos.length === 0 && !concluido && (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum pedido criado hoje.</p>
      )}

      {pedidos.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <input type="checkbox" checked={selecionados.size === pedidos.length}
                onChange={toggleTodos} className="w-4 h-4" />
              <span className="text-xs font-medium text-gray-600">
                {selecionados.size} de {pedidos.length} selecionado(s)
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="w-10 px-4 py-2"></th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Pedido</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Modelo</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Valor</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidos.map(p => (
                  <tr key={p.id} className={selecionados.has(p.id) ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={selecionados.has(p.id)}
                        onChange={() => toggle(p.id)} className="w-4 h-4" />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{p.numero}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{p.cliente}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{p.modelo}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmt(p.valor)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400">
                      {new Date(p.hora).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button onClick={excluir} disabled={excluindo || selecionados.size === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
              {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {excluindo ? 'Excluindo...' : `Excluir ${selecionados.size} pedido(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
