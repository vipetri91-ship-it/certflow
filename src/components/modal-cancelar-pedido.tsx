'use client'

import { useState } from 'react'
import { X, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { MOTIVOS_CANCELAMENTO, MOTIVOS_CANCELAMENTO_LABELS, type MotivoCancelamento } from '@/app/api/pedidos/[id]/cancelar/lib'

interface Props {
  pedidoId: string
  numeroPedido: string
  onFechar: () => void
  onCancelado: () => void
}

type Etapa = 'form' | 'confirmar' | 'sucesso'

export function ModalCancelarPedido({ pedidoId, numeroPedido, onFechar, onCancelado }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('form')
  const [motivoCategoria, setMotivoCategoria] = useState<MotivoCancelamento | ''>('')
  const [motivoTexto, setMotivoTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultadoSafeweb, setResultadoSafeweb] = useState<{ ok: boolean; erro?: string; tratadoComo?: string } | null>(null)

  async function confirmarCancelamento() {
    setEnviando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCategoria, motivoTexto: motivoTexto.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro || 'Erro ao cancelar pedido')
        setEtapa('form')
        return
      }
      setResultadoSafeweb(data.resultadoSafeweb ?? null)
      setEtapa('sucesso')
    } catch {
      setErro('Falha de comunicação com o servidor. Tente novamente.')
      setEtapa('form')
    } finally {
      setEnviando(false)
    }
  }

  function fechar() {
    if (etapa === 'sucesso') onCancelado()
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={fechar}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 text-center relative ${etapa === 'sucesso' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <button onClick={fechar} className="absolute top-3 right-3 text-white/70 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            {etapa === 'sucesso' ? <CheckCircle2 className="w-8 h-8 text-white" /> : <AlertTriangle className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-xl font-bold text-white">
            {etapa === 'sucesso' ? 'Pedido cancelado' : `Cancelar pedido ${numeroPedido}`}
          </h2>
          {etapa !== 'sucesso' && (
            <p className="text-red-100 text-sm mt-1">Esta ação é irreversível</p>
          )}
        </div>

        {/* Conteúdo */}
        <div className="px-6 pt-5 pb-4">
          {etapa === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motivo do cancelamento <span className="text-red-500">*</span>
                </label>
                <select
                  value={motivoCategoria}
                  onChange={e => setMotivoCategoria(e.target.value as MotivoCancelamento)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                >
                  <option value="">Selecione um motivo...</option>
                  {MOTIVOS_CANCELAMENTO.map(m => (
                    <option key={m} value={m}>{MOTIVOS_CANCELAMENTO_LABELS[m]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Observação (opcional)
                </label>
                <textarea
                  value={motivoTexto}
                  onChange={e => setMotivoTexto(e.target.value)}
                  rows={3}
                  placeholder="Detalhes adicionais sobre o cancelamento..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
                />
              </div>

              {erro && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={fechar}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setEtapa('confirmar')}
                  disabled={!motivoCategoria}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {etapa === 'confirmar' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  Tem certeza que deseja cancelar o pedido <strong className="font-mono">{numeroPedido}</strong>?
                </p>
                <p className="text-sm text-gray-700">
                  Motivo: <strong>{motivoCategoria && MOTIVOS_CANCELAMENTO_LABELS[motivoCategoria]}</strong>
                </p>
                {motivoTexto.trim() && (
                  <p className="text-sm text-gray-600">Observação: {motivoTexto.trim()}</p>
                )}
                <p className="text-xs text-red-600 mt-2">
                  Se houver protocolo na Safeweb, o cancelamento também será solicitado lá.
                  Esta ação não pode ser desfeita.
                </p>
              </div>

              {erro && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEtapa('form')}
                  disabled={enviando}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmarCancelamento}
                  disabled={enviando}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          )}

          {etapa === 'sucesso' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 text-center">
                O pedido <strong className="font-mono">{numeroPedido}</strong> foi cancelado com sucesso.
              </p>
              {resultadoSafeweb && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 text-center">
                  {resultadoSafeweb.tratadoComo === 'sem_protocolo' && 'Pedido sem protocolo Safeweb vinculado.'}
                  {resultadoSafeweb.tratadoComo === 'protocolo_ja_inexistente' && 'O protocolo já não existia na Safeweb.'}
                  {!resultadoSafeweb.tratadoComo && resultadoSafeweb.ok && 'Protocolo cancelado com sucesso na Safeweb.'}
                </div>
              )}
              <button
                onClick={fechar}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
