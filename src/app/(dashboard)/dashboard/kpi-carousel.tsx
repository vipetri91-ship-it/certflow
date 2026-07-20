'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'

interface PedidoDetalhe {
  id: string
  numero: string
  valorFinal: number
  status: string
  agr: string | null
  tipoAtendimento: string | null
  numeroCompra: string | null
  createdAt: string | Date
  verificadoEm: string | Date | null
  emitidoEm: string | Date | null
  cliente: { nome: string; cpf?: string; cnpj?: string }
  parceiro?: { nome: string } | null
  itens: { modelo: { nome: string } }[]
}

interface Slide {
  label: string
  vendas: number
  emissoes: number
  faturamento: number
  periodo: 'dia' | 'semana' | 'mês' | 'ano'
  pedidos: PedidoDetalhe[]
}

interface Props {
  slides: Slide[]
  mediaDiaria: number
  projecaoMensal: number
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
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function dataHora(d: string | Date) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function KpiCarousel({ slides, mediaDiaria, projecaoMensal }: Props) {
  const [idx, setIdx] = useState(0)
  const [modalAberto, setModalAberto] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [slides.length])

  const slide = slides[idx]
  const pedidos = slide.pedidos
  const clicavel = true
  const valorTotal = pedidos.reduce((acc: number, p: PedidoDetalhe) => acc + p.valorFinal, 0)
  const ticketMedio = pedidos.length > 0 ? valorTotal / pedidos.length : 0

  return (
    <>
      {/* Card carrossel principal */}
      <div
        onClick={() => clicavel && setModalAberto(true)}
        className={`bg-panel rounded-2xl border border-stroke p-4 relative overflow-hidden shadow-[var(--shadow)] select-none h-full ${clicavel ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
      >
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-mut-2 text-xs font-medium uppercase tracking-wide">{slide.label}</p>
              {clicavel && (
                <span className="text-xs bg-panel-2 px-1.5 py-0.5 rounded-full text-mut hidden lg:inline">
                  ver detalhes
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIdx(i => (i - 1 + slides.length) % slides.length)} className="p-1 rounded-full hover:bg-panel-2 transition text-mut">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIdx(i => (i + 1) % slides.length)} className="p-1 rounded-full hover:bg-panel-2 transition text-mut">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-4xl font-black mb-0.5 text-violet font-display tabnum">{slide.vendas}</p>
          <p className="text-mut-2 text-xs">vendas no {slide.periodo}</p>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-divider">
            {[
              { label: 'Emissões', valor: String(slide.emissoes) },
              { label: 'Faturamento', valor: fmt(slide.faturamento) },
              { label: 'Média Diária', valor: mediaDiaria.toFixed(1) },
              { label: 'Projeção', valor: `${Math.round(projecaoMensal)}` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-mut-2 text-xs">{item.label}</p>
                <p className="font-bold text-sm text-violet font-display tabnum">{item.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? 'w-5 h-1.5 bg-violet' : 'w-1.5 h-1.5 bg-track'}`}
            />
          ))}
        </div>
      </div>

      {/* Modal — Vendas de Hoje */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">
                  Data {new Date().toLocaleDateString('pt-BR')} — {pedidos.length} Vendas
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Faturamento: {fmt(valorTotal)} · Ticket médio: {fmt(ticketMedio)}
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {pedidos.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400">Nenhuma venda hoje</p>
                  <Link href="/pedidos/nova-venda" onClick={() => setModalAberto(false)}
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                    Criar nova venda →
                  </Link>
                </div>
              )}
              {pedidos.map(p => (
                <div key={p.id} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="grid grid-cols-12 gap-3 text-sm">

                    {/* Timestamps */}
                    <div className="col-span-3 space-y-1 text-xs">
                      <div>
                        <span className="text-blue-500 font-semibold">Gerado: </span>
                        <span className="text-gray-600">{dataHora(p.createdAt)}</span>
                      </div>
                      {p.verificadoEm && (
                        <div>
                          <span className="text-yellow-500 font-semibold">Verificado: </span>
                          <span className="text-gray-600">{hora(p.verificadoEm)} {new Date(p.verificadoEm).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                      {p.emitidoEm && (
                        <div>
                          <span className="text-green-500 font-semibold">Emitido: </span>
                          <span className="text-gray-600">{hora(p.emitidoEm)} {new Date(p.emitidoEm).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Cliente */}
                    <div className="col-span-5">
                      <p className="font-semibold text-blue-700">{p.cliente.nome}</p>
                      {(p.cliente.cpf || p.cliente.cnpj) && (
                        <p className="text-xs text-cyan-600 font-medium">
                          CPF/CNPJ: {p.cliente.cpf ?? p.cliente.cnpj}
                        </p>
                      )}
                      {p.agr && (
                        <p className="text-xs text-purple-600 font-medium">AGR: {p.agr}</p>
                      )}
                      {p.parceiro && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          👤 {p.parceiro.nome}
                        </p>
                      )}
                    </div>

                    {/* Certificado e valor */}
                    <div className="col-span-4 text-right space-y-1">
                      <p className="text-xs text-gray-700 font-medium">{p.itens.map(i => i.modelo.nome).join(', ')}</p>
                      {p.numeroCompra && (
                        <p className="text-xs text-gray-500">Compra: <span className="font-mono">{p.numeroCompra}</span></p>
                      )}
                      {p.tipoAtendimento && (
                        <p className="text-xs text-blue-500">
                          Atendimento: {p.tipoAtendimento === 'videoconferencia' ? 'Videoconferência' : 'Presencial'}
                        </p>
                      )}
                      <p className="font-bold text-green-700">{fmt(p.valorFinal)}</p>
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between shrink-0">
              <span className="text-sm text-gray-500">Ticket médio: <strong className="text-gray-800">{fmt(ticketMedio)}</strong></span>
              <div className="flex items-center gap-3">
                <Link href="/pedidos/monitoramento" onClick={() => setModalAberto(false)}
                  className="text-sm text-blue-600 hover:underline">
                  Ver Monitoramento →
                </Link>
                <span className="font-bold text-gray-900">Total: <span className="text-green-700">{fmt(valorTotal)}</span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}