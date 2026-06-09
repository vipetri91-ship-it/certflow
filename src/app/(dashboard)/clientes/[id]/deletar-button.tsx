'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export function DeletarClienteButton({ clienteId, nomeCliente }: { clienteId: string; nomeCliente: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function excluir() {
    if (!confirm(`Excluir o cliente "${nomeCliente}"?\n\nEsta ação não pode ser desfeita.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/clientes')
      } else {
        const data = await res.json()
        alert(data.erro ?? 'Erro ao excluir cliente')
      }
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={excluir}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
      title="Excluir cliente"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      Excluir
    </button>
  )
}
