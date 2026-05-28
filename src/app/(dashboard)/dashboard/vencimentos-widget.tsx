'use client'

import { useState } from 'react'
import { X, Phone, Mail, AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Certificado {
  id: string
  dataVencimento: string
  status: string
  cliente: {
    id: string
    nome: string
    cpf?: string | null
    cnpj?: string | null
    celular?: string | null
    email?: string | null
  }
  modelo: { nome: string }
}

interface MesGrafico {
  mes: string
  total: number
  pf: number
  pj: number
}

interface Props {
  vencidos: Certificado[]
  em7: Certificado[]
  em15: Certificado[]
  em30: Certificado[]
  proximosMeses: MesGrafico[]
}

const FAIXAS = [
  {
    key: 'vencidos' as const,
    label: 'Vencidos',
    sublabel: 'Certificados já expirados',
    cor: 'bg-red-500',
    corLight: 'bg-red-50',
    corTexto: 'text-red-600',
    corBorda: 'border-red-200',
    corHover: 'hover:bg-red-50',
    icon: XCircle,
  },
  {
    key: 'em7' as const,
    label: '7 dias',
    sublabel: 'Vencem em até 7 dias',
    cor: 'bg-orange-500',
    corLight: 'bg-orange-50',
    corTexto: 'text-orange-600',
    corBorda: 'border-orange-200',
    corHover: 'hover:bg-orange-50',
    icon: AlertTriangle,
  },
  {
    key: 'em15' as const,
    label: '15 dias',
    sublabel: 'Vencem em 8 a 15 dias',
    cor: 'bg-yellow-500',
    corLight: 'bg-yellow-50',
    corTexto: 'text-yellow-600',
    corBorda: 'border-yellow-200',
    corHover: 'hover:bg-yellow-50',
    icon: Clock,
  },
  {
    key: 'em30' as const,
    label: '30 dias',
    sublabel: 'Vencem em 16 a 30 dias',
    cor: 'bg-green-500',
    corLight: 'bg-green-50',
    corTexto: 'text-green-600',
    corBorda: 'border-green-200',
    corHover: 'hover:bg-green-50',
    icon: CheckCircle,
  },
]

function diasRestantes(dataVencimento: string) {
  const diff = new Date(dataVencimento).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtDoc(c: Certificado['cliente']) {
  if (c.cpf) return c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (c.cnpj) return c.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return '—'
}

export function VencimentosWidget({ vencidos, em7, em15, em30, proximosMeses }: Props) {
  const [modalFaixa, setModalFaixa] = useState<typeof FAIXAS[0] | null>(null)

  const dados: Record<string, Certificado[]> = { vencidos, em7, em15, em30 }
  const total = vencidos.length + em7.length + em15.length + em30.length

  const maxMes = Math.max(...proximosMeses.map(m => m.total), 1)

  const modalCerts = modalFaixa ? dados[modalFaixa.key] : []

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Controle de Vencimentos</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{total} certificados no radar</span>
            <Link href="/renovacoes" className="text-xs text-blue-500 hover:underline">Ver todos →</Link>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 4 faixas de urgência */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {FAIXAS.map(faixa => {
              const lista = dados[faixa.key]
              const qtd = lista.length
              return (
                <button
                  key={faixa.key}
                  onClick={() => qtd > 0 && setModalFaixa(faixa)}
                  className={`relative p-3 rounded-xl border-2 text-left transition group ${faixa.corBorda} ${faixa.corLight} ${qtd > 0 ? faixa.corHover + ' cursor-pointer' : 'cursor-default opacity-60'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <faixa.icon className={`w-4 h-4 ${faixa.corTexto}`} />
                    {qtd > 0 && (
                      <span className={`text-xs ${faixa.corTexto} group-hover:underline`}>ver →</span>
                    )}
                  </div>
                  <p className={`text-3xl font-black ${faixa.corTexto}`}>{qtd}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{faixa.label}</p>
                  <p className="text-xs text-gray-400 leading-tight">{faixa.sublabel}</p>
                </button>
              )
            })}
          </div>

          {/* Gráfico próximos 6 meses */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vencimentos por mês</p>
            <div className="flex items-end gap-1.5 h-24">
              {proximosMeses.map((m, i) => {
                const altura = Math.round((m.total / maxMes) * 100)
                const ehAtual = i === 0
                return (
                  <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${ehAtual ? 'text-blue-600' : 'text-gray-500'}`}>
                      {m.total > 0 ? m.total : ''}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: '64px' }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${ehAtual ? 'bg-blue-500' : 'bg-blue-200'}`}
                        style={{ height: `${Math.max(altura, m.total > 0 ? 8 : 2)}%` }}
                        title={`${m.total} certificados`}
                      />
                    </div>
                    <span className="text-xs text-gray-400 truncate w-full text-center">{m.mes}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-2">
              {proximosMeses[0] && (
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-blue-600">{proximosMeses[0].total}</span> vencem este mês
                  {proximosMeses[0].pf > 0 && <span className="text-gray-400"> · PF: {proximosMeses[0].pf}</span>}
                  {proximosMeses[0].pj > 0 && <span className="text-gray-400"> · PJ: {proximosMeses[0].pj}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      {modalFaixa && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-t-4 ${modalFaixa.cor.replace('bg-', 'border-')}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${modalFaixa.cor} flex items-center justify-center`}>
                  <modalFaixa.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    {modalFaixa.key === 'vencidos' ? 'Certificados Vencidos' : `Certificados — próximos ${modalFaixa.label}`}
                  </h2>
                  <p className="text-xs text-gray-400">{modalCerts.length} certificado{modalCerts.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setModalFaixa(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {modalCerts.map(cert => {
                const dias = diasRestantes(cert.dataVencimento)
                return (
                  <div key={cert.id} className="px-5 py-3 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/clientes/${cert.cliente.id}`}
                          onClick={() => setModalFaixa(null)}
                          className={`font-semibold hover:underline ${modalFaixa.corTexto}`}>
                          {cert.cliente.nome}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtDoc(cert.cliente)}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{cert.modelo.nome}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {cert.cliente.celular && (
                            <a href={`https://wa.me/55${cert.cliente.celular.replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                              <Phone className="w-3 h-3" /> {cert.cliente.celular}
                            </a>
                          )}
                          {cert.cliente.email && (
                            <a href={`mailto:${cert.cliente.email}`}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                              <Mail className="w-3 h-3" /> {cert.cliente.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${modalFaixa.corTexto}`}>
                          {dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d restantes`}
                        </p>
                        <p className="text-xs text-gray-400">{fmtData(cert.dataVencimento)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
              <Link href="/renovacoes" onClick={() => setModalFaixa(null)}
                className="text-sm text-blue-600 hover:underline">
                Ver todos no Renovações →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}