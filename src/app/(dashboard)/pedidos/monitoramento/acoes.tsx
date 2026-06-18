'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2, Send, Unlock } from 'lucide-react'
import { PopupCertificadoEmitido } from '@/components/popup-certificado-emitido'

interface Props {
  pedidoId: string
  tipo: 'status' | 'protocolo'
  statusAtual?: string
  tipoAtendimento?: string | null
}

// REGRA (18/06/2026): emissão é 100% automática via webhook Safeweb. Não
// existe mais botão manual "Verificar"/"Finalizar" nem entrada manual de
// protocolo aqui — isso criava certificados fictícios sem protocolo real
// (ver memória feedback_safeweb_sagrado) e confundia os AGRs, que pensavam
// precisar "aprovar" algo que o sistema já resolve sozinho.
export function MonitoramentoAcoes({ pedidoId, tipo, statusAtual, tipoAtendimento }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mostrarPopup, setMostrarPopup] = useState(false)

  async function liberarEmissaoOnline() {
    setLoading(true)
    const res = await fetch(`/api/pedidos/${pedidoId}/liberar-emissao-online`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    }
  }

  if (tipo === 'protocolo') {
    // Pedido sem protocolo só pode existir aqui se foi criado antes da
    // regra de 18/06/2026 (protocolo automático obrigatório na venda).
    return <span className="text-xs text-gray-400 italic">Aguardando Safeweb</span>
  }

  // tipo = 'status'
  if (statusAtual === 'CANCELADO') {
    return <span className="text-xs text-gray-300">—</span>
  }

  if (statusAtual === 'EMITIDO') {
    return (
      <>
        <button onClick={() => setMostrarPopup(true)}
          title="Enviar notificação de certificado emitido"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700">
          <Send className="w-3 h-3" />
          Notificar
        </button>
        {mostrarPopup && (
          <PopupCertificadoEmitido
            pedidoId={pedidoId}
            onFechar={() => setMostrarPopup(false)}
          />
        )}
      </>
    )
  }

  // Emissão Online: único caso com checkpoint humano legítimo — confirmar
  // pagamento antes de liberar a emissão na Safeweb (não é "aprovar
  // certificado", é liberar o processamento financeiro).
  if (tipoAtendimento === 'emissao-online' && (statusAtual === 'GERADO' || statusAtual === 'VERIFICADO')) {
    return (
      <button onClick={liberarEmissaoOnline} disabled={loading}
        title="Confirmar pagamento e liberar emissão na Safeweb"
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition disabled:opacity-50 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
        Liberar
      </button>
    )
  }

  // GERADO/VERIFICADO em presencial/videoconferência: só esperar o webhook.
  return (
    <span className="flex items-center justify-center gap-1 text-xs text-gray-400" title="Aguardando confirmação automática da Safeweb">
      <Clock className="w-3 h-3" /> Aguardando
    </span>
  )
}