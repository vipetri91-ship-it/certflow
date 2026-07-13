'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export function BotaoExcluirParceiro({ id, nome }: { id: string; nome: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)

  async function excluir() {
    if (!confirm(`Excluir o parceiro "${nome}"? Essa ação não pode ser desfeita.`)) return
    setCarregando(true)
    try {
      await fetch(`/api/parceiros/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setCarregando(false)
    }
  }

  return (
    <button
      onClick={excluir}
      disabled={carregando}
      title="Excluir parceiro"
      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
    >
      {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
