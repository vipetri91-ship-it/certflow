'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, DollarSign } from 'lucide-react'

interface Props {
  parceiroId: string
  mes: number
  ano: number
  valorTotal: number
}

export function ComissaoPagarButton({ parceiroId, mes, ano, valorTotal }: Props) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function pagar() {
    if (!confirm(`Confirmar pagamento de comissão de R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}? Isso vai criar um lançamento em Contas a Pagar.`)) return
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/financeiro/comissoes/${parceiroId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, ano }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao marcar como pago'); return }
      router.refresh()
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={pagar}
        disabled={carregando}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
      >
        {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
        Marcar como pago
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}
