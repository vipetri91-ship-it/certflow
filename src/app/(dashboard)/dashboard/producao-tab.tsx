'use client'

import { useState } from 'react'
import { X, TrendingUp, Award, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

const AGR_LABELS: Record<string, string> = {
  'ana.karolina': 'Ana Karolina',
  'arlen': 'Arlen',
  'vinicius': 'Vinicius',
  'laryssa': 'Laryssa',
}

const AGR_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'vinicius':    { bg: 'bg-blue-500',   text: 'text-blue-600',   ring: 'ring-blue-200' },
  'arlen':       { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-200' },
  'ana.karolina':{ bg: 'bg-pink-500',   text: 'text-pink-600',   ring: 'ring-pink-200' },
  'laryssa':     { bg: 'bg-teal-500',   text: 'text-teal-600',   ring: 'ring-teal-200' },
}

const STATUS_COR: Record<string, string> = {
  GERADO:    'bg-blue-100 text-blue-700',
  VERIFICADO:'bg-yellow-100 text-yellow-700',
  EMITIDO:   'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function hora(d: string | Date) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface PedidoDetalhe {
  id: string; numero: string; status: string; agr: string | null
  tipoAtendimento: string | null; numeroCompra: string | null
  valorFinal: number; createdAt: string | Date
  verificadoEm: string | Date | null; emitidoEm: string | Date | null
  cliente: { nome: string; cpf?: string; cnpj?: string; tipoPessoa: string }
  parceiro?: { nome: string } | null
  itens: { modelo: { nome: string } }[]
}

interface AGRPerf {
  agr: string; vendas: number; valorVendas: number; emissoes: number; mediadiaria: number
}

interface Props {
  dados: {
    pedidosDia: number; pedidosSemana: number; pedidosMes: number
    emissoesDia: number; emissoesSemana: number; emissoesMes: number
    pedidosDetalhes: PedidoDetalhe[]; performanceAgr: AGRPerf[]
    mediaDiaria: number; projecaoMensal: number; vencendo7: number
  }
}

export function ProducaoTab({ dados }: Props) {
  const [modalDia, setModalDia] = useState(false)
  const [modalAgr, setModalAgr] = useState<AGRPerf | null>(null)

  const valorTotalDia = dados.pedidosDetalhes.reduce((acc, p) => acc + p.valorFinal, 0)
  const ticketMedio = dados.pedidosDetalhes.length > 0 ? valorTotalDia / dados.pedidosDetalhes.length : 0

  return (
    <div className="p-4 lg:p-6 space-y-5">

      {/* Faixa de métricas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Média Diária', valor: dados.mediaDiaria.toFixed(1), sub: 'vendas/dia no mês', icon: TrendingUp, cor: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Projeção Mensal', valor: Math.round(dados.projecaoMensal).toString(), sub: 'vendas projetadas', icon: Award, cor: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Faturamento Hoje', valor: fmt(valorTotalDia), sub: `${dados.pedidosDia} pedidos`, icon: ShoppingBag, cor: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Ticket Médio', valor: fmt(ticketMedio), sub: 'por venda hoje', icon: TrendingUp, cor: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
              <item.icon className={`w-5 h-5 ${item.cor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{item.label}</p>
              <p className={`text-lg font-bold ${item.cor} truncate`}>{item.valor}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Vendas do dia — card clicável */}
        <button
          onClick={() => setModalDia(true)}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md hover:border-blue-200 transition group"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendas de Hoje</p>
            <span className="text-xs text-blue-600 group-hover:underline">Ver detalhes →</span>
          </div>
          <p className="text-5xl font-black text-blue-600">{dados.pedidosDia}</p>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>{dados.emissoesDia} emissões</span>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{fmt(valorTotalDia)}</span>
          </div>
          {dados.pedidosDetalhes.slice(0, 3).map(p => (
            <div key={p.id} className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
              <span className="truncate flex-1">{p.cliente.nome}</span>
              <span className="text-gray-400 shrink-0">{hora(p.createdAt)}</span>
            </div>
          ))}
          {dados.pedidosDia > 3 && (
            <p className="text-xs text-blue-500 mt-2">+ {dados.pedidosDia - 3} mais...</p>
          )}
          {dados.pedidosDia === 0 && (
            <p className="text-sm text-gray-400 mt-3">Nenhuma venda ainda hoje</p>
          )}
        </button>

        {/* Performance AGR */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Performance por AGR — Mês atual</h2>
            <Link href="/relatorios" className="text-xs text-blue-600 hover:underline">Relatório completo →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {dados.performanceAgr.map(agr => {
              const cor = AGR_COLORS[agr.agr] ?? AGR_COLORS.vinicius
              const maxVendas = Math.max(...dados.performanceAgr.map(a => a.vendas), 1)
              const pct = Math.round((agr.vendas / maxVendas) * 100)
              return (
                <button
                  key={agr.agr}
                  onClick={() => setModalAgr(agr)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition text-left"
                >
                  <div className={`w-9 h-9 rounded-full ${cor.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {AGR_LABELS[agr.agr]?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{AGR_LABELS[agr.agr]}</span>
                      <span className={`text-sm font-bold ${cor.text}`}>{agr.vendas} vendas</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${cor.bg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{agr.emissoes} emissões</span>
                      <span className="text-xs text-gray-500 font-medium">{fmt(agr.valorVendas)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal detalhe do dia */}
      {modalDia && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Vendas de Hoje</h2>
                <p className="text-xs text-gray-400">{dados.pedidosDetalhes.length} pedidos · {fmt(valorTotalDia)}</p>
              </div>
              <button onClick={() => setModalDia(false)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {dados.pedidosDetalhes.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400">Nenhuma venda hoje</p>
                  <Link href="/pedidos/nova-venda" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                    Criar nova venda →
                  </Link>
                </div>
              )}
              {dados.pedidosDetalhes.map(p => (
                <div key={p.id} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{p.cliente.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{p.itens.map(i => i.modelo.nome).join(', ')}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>🕐 {hora(p.createdAt)}</span>
                        {p.agr && <span>👤 {AGR_LABELS[p.agr] ?? p.agr}</span>}
                        {p.tipoAtendimento && <span>{p.tipoAtendimento === 'videoconferencia' ? '📹 Vídeo' : '🏢 Presencial'}</span>}
                        {p.numeroCompra && <span className="font-mono">#{p.numeroCompra}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-700">{fmt(p.valorFinal)}</p>
                      <Link href={`/pedidos/${p.id}`} className="text-xs text-blue-500 hover:underline">Ver pedido</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between text-sm">
              <span className="text-gray-500">Ticket médio: <strong className="text-gray-800">{fmt(ticketMedio)}</strong></span>
              <span className="font-bold text-gray-900">Total: <span className="text-green-700">{fmt(valorTotalDia)}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe AGR */}
      {modalAgr && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${AGR_COLORS[modalAgr.agr]?.bg ?? 'bg-blue-500'} flex items-center justify-center text-white font-bold`}>
                  {AGR_LABELS[modalAgr.agr]?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{AGR_LABELS[modalAgr.agr]}</h2>
                  <p className="text-xs text-gray-400">Performance do mês</p>
                </div>
              </div>
              <button onClick={() => setModalAgr(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: 'Vendas', valor: modalAgr.vendas.toString(), sub: `Média: ${modalAgr.mediadiaria.toFixed(2)}/dia` },
                { label: 'Faturamento', valor: fmt(modalAgr.valorVendas), sub: `Ticket: ${fmt(modalAgr.vendas > 0 ? modalAgr.valorVendas / modalAgr.vendas : 0)}` },
                { label: 'Emissões', valor: modalAgr.emissoes.toString(), sub: `${modalAgr.vendas > 0 ? Math.round(modalAgr.emissoes / modalAgr.vendas * 100) : 0}% das vendas` },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                    <p className="text-sm text-gray-400">{item.sub}</p>
                  </div>
                  <p className={`text-2xl font-black ${AGR_COLORS[modalAgr.agr]?.text ?? 'text-blue-600'}`}>{item.valor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}