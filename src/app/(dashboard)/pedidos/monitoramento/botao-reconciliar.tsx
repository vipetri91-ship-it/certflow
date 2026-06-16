'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Resultado {
  protocolo: string
  pedido: string
  acao: 'EMITIDO' | 'AGUARDANDO' | 'IGNORADO' | 'ERRO'
  detalhe?: string
}

interface RespostaReconciliacao {
  ok: boolean
  total: number
  emitidos: number
  aguardando: number
  erros: number
  resultados: Resultado[]
}

export function BotaoReconciliar() {
  const [loading, setLoading]       = useState(false)
  const [resposta, setResposta]     = useState<RespostaReconciliacao | null>(null)
  const [erro, setErro]             = useState<string | null>(null)
  const [expandido, setExpandido]   = useState(false)

  async function reconciliar() {
    setLoading(true)
    setResposta(null)
    setErro(null)
    try {
      const res = await fetch('/api/jobs/reconciliar-protocolos', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro ?? 'Erro desconhecido')
      } else {
        setResposta(data)
        setExpandido(data.emitidos > 0 || data.erros > 0)
      }
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }

  const corAcao: Record<string, string> = {
    EMITIDO:   'text-green-600',
    AGUARDANDO: 'text-yellow-600',
    IGNORADO:  'text-gray-400',
    ERRO:      'text-red-500',
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={reconciliar}
        disabled={loading}
        title="Verifica na Safeweb todos os protocolos presos em VERIFICADO há mais de 2h e os avança para EMITIDO se confirmados"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />
        }
        Reconciliar Safeweb
      </button>

      {erro && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> {erro}
        </div>
      )}

      {resposta && (
        <div className="text-right">
          <div className="flex items-center justify-end gap-3 text-xs text-gray-500">
            <span>{resposta.total} verificado{resposta.total !== 1 ? 's' : ''}</span>
            {resposta.emitidos > 0 && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> {resposta.emitidos} emitido{resposta.emitidos !== 1 ? 's' : ''}
              </span>
            )}
            {resposta.erros > 0 && (
              <span className="text-red-500">{resposta.erros} erro{resposta.erros !== 1 ? 's' : ''}</span>
            )}
            {resposta.total > 0 && (
              <button
                onClick={() => setExpandido(v => !v)}
                className="text-blue-500 hover:underline"
              >
                {expandido ? 'ocultar' : 'detalhes'}
              </button>
            )}
          </div>

          {expandido && resposta.resultados.length > 0 && (
            <div className="mt-1 bg-white border border-gray-100 rounded-lg shadow-sm text-xs divide-y divide-gray-50 text-left">
              {resposta.resultados.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="font-mono text-gray-500 w-24 truncate">{r.protocolo}</span>
                  <span className="text-gray-700">{r.pedido}</span>
                  <span className={`ml-auto font-semibold ${corAcao[r.acao]}`}>{r.acao}</span>
                  {r.detalhe && <span className="text-gray-400 max-w-[160px] truncate">{r.detalhe}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}