'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'

export function DeletarCertificadoButton({ certId, modelo }: { certId: string; modelo: string }) {
  const [loading, setLoading] = useState(false)

  async function excluir() {
    if (!confirm(`Excluir o certificado "${modelo}"?\n\nEsta ação não pode ser desfeita.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/certificados/${certId}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.erro ?? 'Erro ao excluir certificado')
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
      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
      title="Excluir certificado"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}
