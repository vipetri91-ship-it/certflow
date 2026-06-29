'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, DollarSign, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatarMoeda, formatarData } from '@/lib/utils'

export interface LinhaComissaoPainel {
  comissaoPedidoId: string | null
  pedidoId: string
  numero: string
  protocolo: string | null
  clienteNome: string
  modeloNome: string
  valorCusto: number
  valorCliente: number
  comissao: number
  emitidoEm: string
  status: 'PENDENTE' | 'PAGO'
  pagoEm: string | null
}

interface Props {
  parceiroId: string
  pendentes: LinhaComissaoPainel[]
  pagas: LinhaComissaoPainel[]
}

export function ComissoesParceiroPainel({ parceiroId, pendentes, pagas }: Props) {
  const router = useRouter()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [dataPagamento, setDataPagamento] = useState(() => new Date().toISOString().slice(0, 10))
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const totalSelecionado = useMemo(
    () => pendentes.filter((l) => l.comissaoPedidoId && selecionados.has(l.comissaoPedidoId)).reduce((s, l) => s + l.comissao, 0),
    [pendentes, selecionados]
  )

  function alternar(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function marcarTodos() {
    setSelecionados(new Set(pendentes.map((l) => l.comissaoPedidoId).filter((id): id is string => !!id)))
  }

  async function pagar() {
    if (selecionados.size === 0) return
    if (!confirm(`Confirmar pagamento de ${formatarMoeda(totalSelecionado)} para ${selecionados.size} cliente${selecionados.size !== 1 ? 's' : ''}?`)) return
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/financeiro/comissoes/${parceiroId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissaoPedidoIds: [...selecionados], dataPagamento }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao marcar como pago'); return }
      setSelecionados(new Set())
      router.refresh()
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-gray-900">Pendentes de pagamento</p>
          {pendentes.length > 0 && (
            <button onClick={marcarTodos} className="text-xs text-blue-600 hover:underline">Selecionar todos</button>
          )}
        </div>

        {pendentes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma comissão pendente para este parceiro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2"></th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Modelo</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Protocolo</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Emitido em</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Custo</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Venda</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Comissão</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendentes.map((l) => (
                  <tr key={l.pedidoId} className={l.comissaoPedidoId && selecionados.has(l.comissaoPedidoId) ? 'bg-blue-50/50' : ''}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={!!l.comissaoPedidoId && selecionados.has(l.comissaoPedidoId)}
                        onChange={() => l.comissaoPedidoId && alternar(l.comissaoPedidoId)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-800">{l.clienteNome}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{l.modeloNome}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{l.protocolo ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{formatarData(l.emitidoEm)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatarMoeda(l.valorCusto)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatarMoeda(l.valorCliente)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-orange-700">{formatarMoeda(l.comissao)}</td>
                    <td className="px-4 py-2 text-center">
                      <Link href={`/pedidos/${l.pedidoId}`} className="text-blue-500 hover:text-blue-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pendentes.length > 0 && (
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data do pagamento</label>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total selecionado ({selecionados.size})</p>
                <p className="text-lg font-bold text-orange-700">{formatarMoeda(totalSelecionado)}</p>
              </div>
            </div>
            <button
              onClick={pagar}
              disabled={carregando || selecionados.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
            >
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Marcar selecionados como pagos
            </button>
          </div>
        )}
        {erro && <p className="text-xs text-red-600 px-4 py-2">{erro}</p>}
      </div>

      {pagas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-semibold text-gray-900">Já pagas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Modelo</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Comissão</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Pago em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagas.map((l) => (
                  <tr key={l.pedidoId}>
                    <td className="px-4 py-2 text-gray-800">{l.clienteNome}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{l.modeloNome}</td>
                    <td className="px-4 py-2 text-right font-semibold text-green-700">{formatarMoeda(l.comissao)}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{l.pagoEm ? formatarData(l.pagoEm) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
