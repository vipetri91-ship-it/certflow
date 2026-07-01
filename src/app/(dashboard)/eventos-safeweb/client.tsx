'use client'

import { useState } from 'react'
import { Bell, CheckCircle2, XCircle, AlertCircle, Search, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Evento {
  id: string
  evento: string
  acao: string | null
  protocolo: string
  numeroPedido: string | null
  clienteNome: string | null
  agr: string | null
  statusAntes: string | null
  statusDepois: string | null
  motivoRecusa: string | null
  lido: boolean
  createdAt: string
  payload: Record<string, unknown> | null
}

const AGR_LABELS: Record<string, string> = {
  'ana.karolina': 'Ana Karolina',
  'arlen':        'Arlen',
  'vinicius':     'Vinicius',
  'laryssa':      'Laryssa',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function badgeEvento(evento: string, statusDepois: string | null, motivoRecusa: string | null) {
  const ev = normalizar(evento)
  if (ev.includes('emissao'))
    return { label: 'Emissão', cor: 'bg-green-100 text-green-700 border-green-200', icone: CheckCircle2 }
  if (ev.includes('cancelamento') || ev.includes('revogacao'))
    return { label: 'Cancelamento', cor: 'bg-red-100 text-red-700 border-red-200', icone: XCircle }
  if (ev.includes('verificacao') || ev.includes('confirmacao')) {
    if (motivoRecusa || statusDepois === null)
      return { label: 'Verificação Reprovada', cor: 'bg-orange-100 text-orange-700 border-orange-200', icone: AlertCircle }
    return { label: 'Verificação', cor: 'bg-blue-100 text-blue-700 border-blue-200', icone: CheckCircle2 }
  }
  return { label: 'Informativo', cor: 'bg-gray-100 text-gray-600 border-gray-200', icone: Bell }
}

export function EventosSafewebClient({ eventos }: { eventos: Evento[] }) {
  const [busca, setBusca] = useState('')

  const filtrados = eventos.filter(e => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      e.protocolo.includes(q) ||
      (e.clienteNome ?? '').toLowerCase().includes(q) ||
      (e.numeroPedido ?? '').toLowerCase().includes(q) ||
      (e.agr ?? '').toLowerCase().includes(q) ||
      normalizar(e.evento).includes(q)
    )
  })

  const totalEmissoes    = eventos.filter(e => normalizar(e.evento).includes('emissao')).length
  const totalVerificacoes = eventos.filter(e => normalizar(e.evento).includes('verificacao')).length
  const totalCancelamentos = eventos.filter(e => normalizar(e.evento).includes('cancelamento') || normalizar(e.evento).includes('revogacao')).length

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Emissões',      valor: totalEmissoes,      cor: 'bg-green-50 border-green-100 text-green-700' },
          { label: 'Verificações',  valor: totalVerificacoes,  cor: 'bg-blue-50 border-blue-100 text-blue-700'  },
          { label: 'Cancelamentos', valor: totalCancelamentos, cor: 'bg-red-50 border-red-100 text-red-700'    },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 text-center ${c.cor}`}>
            <p className="text-2xl font-black">{c.valor}</p>
            <p className="text-xs font-medium mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por protocolo, cliente, pedido ou AGR..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''}
            {busca ? ' encontrado' + (filtrados.length !== 1 ? 's' : '') : ' no histórico'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3" />
            Atualiza a cada nova venda
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum evento encontrado</p>
            {busca && <p className="text-sm text-gray-300 mt-1">Tente buscar por outro termo</p>}
            {!busca && <p className="text-sm text-gray-300 mt-1">Os eventos aparecerão aqui assim que a Safeweb enviar notificações</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtrados.map(e => {
              const badge = badgeEvento(e.evento, e.statusDepois, e.motivoRecusa)
              const Icone = badge.icone
              return (
                <div key={e.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition">

                  {/* Ícone */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${badge.cor}`}>
                    <Icone className="w-4 h-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* Título */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cor}`}>
                            {badge.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {e.clienteNome ?? '—'}
                          </span>
                        </div>

                        {/* Evento original da Safeweb */}
                        <p className="text-xs text-gray-500 mt-1">
                          Evento Safeweb: <span className="font-medium">{e.evento}</span>
                          {e.acao && <span className="text-gray-400"> — {e.acao}</span>}
                        </p>

                        {/* Recusa */}
                        {e.motivoRecusa && (
                          <p className="text-xs text-orange-600 mt-0.5">
                            Motivo: {e.motivoRecusa}
                          </p>
                        )}

                        {/* Rodapé */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-400">
                          <span>Protocolo: <span className="font-mono font-medium text-gray-600">{e.protocolo}</span></span>
                          {e.numeroPedido && (
                            <Link href={`/pedidos/${e.numeroPedido}`} className="hover:text-blue-600 transition">
                              Pedido: <span className="font-medium">{e.numeroPedido}</span>
                            </Link>
                          )}
                          {e.agr && (
                            <span>AGR: <span className="font-medium text-gray-600">{AGR_LABELS[e.agr] ?? e.agr}</span></span>
                          )}
                          {e.statusAntes && e.statusDepois && (
                            <span className="text-gray-300">
                              {e.statusAntes} → <span className="text-gray-500 font-medium">{e.statusDepois}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Data/hora */}
                      <div className="text-xs text-gray-400 shrink-0 text-right">
                        {fmt(e.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
