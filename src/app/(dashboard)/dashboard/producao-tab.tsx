'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { X } from 'lucide-react'

const AGR_LABELS: Record<string, string> = {
  'ana.karolina': 'Ana Karolina',
  'arlen': 'Arlen',
  'vinicius': 'Vinicius',
  'laryssa': 'Laryssa',
}

const STATUS_COR: Record<string, string> = {
  GERADO: 'text-blue-600 bg-blue-50',
  VERIFICADO: 'text-yellow-600 bg-yellow-50',
  EMITIDO: 'text-green-600 bg-green-50',
  CANCELADO: 'text-red-500 bg-red-50',
}

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatarHora(d: string | Date) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface PedidoDetalhe {
  id: string
  numero: string
  status: string
  agr: string | null
  tipoAtendimento: string | null
  numeroCompra: string | null
  valorFinal: number
  createdAt: string | Date
  verificadoEm: string | Date | null
  emitidoEm: string | Date | null
  cliente: { nome: string; cpf?: string; cnpj?: string; tipoPessoa: string }
  parceiro?: { nome: string } | null
  itens: { modelo: { nome: string } }[]
}

interface AGRPerf {
  agr: string
  vendas: number
  valorVendas: number
  emissoes: number
  mediadiaria: number
}

interface Props {
  dados: {
    pedidosDia: number
    pedidosSemana: number
    pedidosMes: number
    emissoesDia: number
    emissoesSemana: number
    emissoesMes: number
    pedidosDetalhes: PedidoDetalhe[]
    performanceAgr: AGRPerf[]
    mediaDiaria: number
    projecaoMensal: number
    vencendo7: number
  }
}

export function ProducaoTab({ dados }: Props) {
  const [modalDia, setModalDia] = useState(false)
  const [modalAgr, setModalAgr] = useState<AGRPerf | null>(null)

  const ticketMedioDia = dados.pedidosDetalhes.length > 0
    ? dados.pedidosDetalhes.reduce((acc, p) => acc + p.valorFinal, 0) / dados.pedidosDetalhes.length
    : 0

  const valorTotalDia = dados.pedidosDetalhes.reduce((acc, p) => acc + p.valorFinal, 0)

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Cards Dia / Semana / Mês */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Dia', vendas: dados.pedidosDia, emissoes: dados.emissoesDia },
          { label: 'Semana', vendas: dados.pedidosSemana, emissoes: dados.emissoesSemana },
          { label: 'Mês', vendas: dados.pedidosMes, emissoes: dados.emissoesMes },
        ].map(card => (
          <button
            key={card.label}
            onClick={() => card.label === 'Dia' && setModalDia(true)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl font-bold text-blue-600 group-hover:text-blue-700">
                {card.vendas}
              </span>
            </div>
            <p className="text-base font-semibold text-blue-600">{card.label}</p>
            <p className="text-xs text-gray-400 mb-3">Nº de vendas no {card.label}.</p>
            <div className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg text-center">
              {card.emissoes} Emissões no {card.label}
            </div>
          </button>
        ))}
      </div>

      {/* Média e projeção */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3 flex flex-wrap gap-4 items-center text-sm text-gray-600">
        <span>📈 <strong>Média Diária:</strong> {dados.mediaDiaria.toFixed(2)}</span>
        <span>🎯 <strong>Projeção Mensal:</strong> {Math.round(dados.projecaoMensal)} Vendas</span>
        <span>⚠️ <strong>{dados.vencendo7}</strong> certificados vencem em 7 dias</span>
      </div>

      {/* Performance por AGR */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Agente de Registro — Performance do Mês</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
          {dados.performanceAgr.map(agr => (
            <button
              key={agr.agr}
              onClick={() => setModalAgr(agr)}
              className="p-5 text-center hover:bg-blue-50 transition group"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3 text-lg font-bold text-blue-700 group-hover:bg-blue-200 transition">
                {AGR_LABELS[agr.agr]?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <p className="text-blue-600 font-semibold text-sm group-hover:underline">{AGR_LABELS[agr.agr]}</p>
              <p className="text-xs text-gray-500 mt-1">
                Vendas <strong className="text-gray-800">{agr.vendas}</strong>
              </p>
              <p className="text-xs text-gray-400">Média Diária: {agr.mediadiaria.toFixed(2)} Vendas</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal — Detalhe do Dia */}
      {modalDia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} — {dados.pedidosDetalhes.length} Vendas
                </h2>
              </div>
              <button onClick={() => setModalDia(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {dados.pedidosDetalhes.length === 0 && (
                <p className="px-6 py-8 text-center text-gray-400">Nenhuma venda hoje</p>
              )}
              {dados.pedidosDetalhes.map(p => (
                <div key={p.id} className="px-6 py-4">
                  <div className="grid grid-cols-12 gap-2 text-sm">
                    {/* Timestamps */}
                    <div className="col-span-3 space-y-0.5 text-xs">
                      <div><span className="text-blue-500 font-medium">Gerado:</span> <span className="text-gray-600">{formatarHora(p.createdAt)} {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span></div>
                      {p.verificadoEm && <div><span className="text-yellow-500 font-medium">Verificado:</span> <span className="text-gray-600">{formatarHora(p.verificadoEm)} {new Date(p.verificadoEm).toLocaleDateString('pt-BR')}</span></div>}
                      {p.emitidoEm && <div><span className="text-green-500 font-medium">Emitido:</span> <span className="text-gray-600">{formatarHora(p.emitidoEm)} {new Date(p.emitidoEm).toLocaleDateString('pt-BR')}</span></div>}
                    </div>

                    {/* Cliente */}
                    <div className="col-span-5">
                      <p className="font-semibold text-blue-700">{p.cliente.nome}</p>
                      <p className="text-xs text-gray-500">
                        CPF/CNPJ: {p.cliente.cpf ?? p.cliente.cnpj ?? '—'}
                      </p>
                      {p.agr && <p className="text-xs text-gray-500">AGR: <span className="text-blue-600 font-medium">{AGR_LABELS[p.agr] ?? p.agr}</span></p>}
                      {p.parceiro && <p className="text-xs text-gray-400">🤝 {p.parceiro.nome}</p>}
                    </div>

                    {/* Certificado e valor */}
                    <div className="col-span-4 text-right">
                      <p className="text-xs text-gray-600">{p.itens.map(i => i.modelo.nome).join(', ')}</p>
                      {p.numeroCompra && <p className="text-xs text-gray-400">Compra: {p.numeroCompra}</p>}
                      {p.tipoAtendimento && <p className="text-xs text-gray-400">{p.tipoAtendimento === 'videoconferencia' ? 'Videoconferência' : 'Presencial'}</p>}
                      <p className="font-bold text-green-700 mt-1">{formatarMoeda(p.valorFinal)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl">
              <span className="text-sm text-gray-600">Ticket Médio: <strong className="text-green-700">{formatarMoeda(ticketMedioDia)}</strong></span>
              <span className="font-bold text-gray-900">Valor Total: <span className="text-green-700">{formatarMoeda(valorTotalDia)}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Desempenho do AGR */}
      {modalAgr && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-blue-700 text-lg">
                {AGR_LABELS[modalAgr.agr]} — {modalAgr.vendas} Vendas
              </h2>
              <button onClick={() => setModalAgr(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Gráfico de barras */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Produção Mensal</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={[{ dia: 'Mês', vendas: modalAgr.vendas, emissoes: modalAgr.emissoes }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="vendas" name="Vendas" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="emissoes" name="Emissões" fill="#6b7280" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela resumo */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th colSpan={2} className="py-2 px-3 text-center font-semibold">VENDAS</th>
                    <th colSpan={2} className="py-2 px-3 text-center font-semibold border-l border-blue-500">EMISSÕES</th>
                    <th colSpan={2} className="py-2 px-3 text-center font-semibold border-l border-blue-500">RECEBIMENTO</th>
                  </tr>
                  <tr className="bg-blue-700 text-blue-100 text-xs">
                    <th className="py-1.5 px-3">Qtd</th>
                    <th className="py-1.5 px-3">Valor</th>
                    <th className="py-1.5 px-3 border-l border-blue-600">Qtd</th>
                    <th className="py-1.5 px-3">Valor</th>
                    <th className="py-1.5 px-3 border-l border-blue-600">Valor</th>
                    <th className="py-1.5 px-3">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-center border-t">
                    <td className="py-3 px-3 font-bold">{modalAgr.vendas}</td>
                    <td className="py-3 px-3 font-bold">{formatarMoeda(modalAgr.valorVendas)}</td>
                    <td className="py-3 px-3 font-bold border-l">{modalAgr.emissoes}</td>
                    <td className="py-3 px-3 font-bold">{formatarMoeda(modalAgr.valorVendas)}</td>
                    <td className="py-3 px-3 font-bold border-l">{formatarMoeda(modalAgr.valorVendas)}</td>
                    <td className="py-3 px-3 font-bold">
                      {formatarMoeda(modalAgr.vendas > 0 ? modalAgr.valorVendas / modalAgr.vendas : 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}