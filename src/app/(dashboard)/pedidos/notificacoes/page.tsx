'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Search, MessageSquare, Mail, Loader2, User, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Notificacao {
  id: string
  observacao: string
  dataContato: string
  cliente: { id: string; nome: string; razaoSocial: string | null; cpf: string | null; cnpj: string | null }
  usuario: { nome: string } | null
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function tipoIcone(obs: string) {
  if (obs.toLowerCase().includes('whatsapp')) return { icone: MessageSquare, cor: 'text-green-600 bg-green-50', label: 'WhatsApp' }
  if (obs.toLowerCase().includes('e-mail') || obs.toLowerCase().includes('email')) return { icone: Mail, cor: 'text-blue-600 bg-blue-50', label: 'E-mail' }
  return { icone: Bell, cor: 'text-gray-500 bg-gray-50', label: 'Contato' }
}

function fmtHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

export default function NotificacoesPage() {
  const hoje = new Date()
  const [mes,      setMes]      = useState(hoje.getMonth() + 1)
  const [ano,      setAno]      = useState(hoje.getFullYear())
  const [busca,    setBusca]    = useState('')
  const [dados,    setDados]    = useState<Notificacao[]>([])
  const [loading,  setLoading]  = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mes: String(mes), ano: String(ano), busca })
      const res = await fetch(`/api/notificacoes?${params}`)
      const json = await res.json()
      setDados(Array.isArray(json) ? json : [])
    } finally {
      setLoading(false)
    }
  }, [mes, ano, busca])

  useEffect(() => { carregar() }, [carregar])

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }

  function mesProximo() {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  // Agrupa por dia
  const porDia = dados.reduce<Record<string, Notificacao[]>>((acc, n) => {
    const dia = fmtData(n.dataContato)
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(n)
    return acc
  }, {})

  const totalWA   = dados.filter(n => n.observacao.toLowerCase().includes('whatsapp')).length
  const totalMail = dados.filter(n => n.observacao.toLowerCase().includes('e-mail') || n.observacao.toLowerCase().includes('email')).length
  const totalOutros = dados.length - totalWA - totalMail

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notificações
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Histórico de todos os contatos e notificações enviadas</p>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <button onClick={mesAnterior} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {MESES[mes - 1]} {ano}
          </div>
          <button onClick={mesProximo} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 sm:p-4 text-center">
          <MessageSquare className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-green-700">{totalWA}</p>
          <p className="text-xs text-green-600">WhatsApp</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 text-center">
          <Mail className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-blue-700">{totalMail}</p>
          <p className="text-xs text-blue-600">E-mails</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 sm:p-4 text-center">
          <Bell className="w-5 h-5 text-gray-500 mx-auto mb-1" />
          <p className="text-xl sm:text-2xl font-bold text-gray-700">{totalOutros}</p>
          <p className="text-xs text-gray-500">Outros</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por cliente, usuário ou tipo de notificação..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      ) : dados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Nenhuma notificação encontrada</p>
          <p className="text-sm mt-1">Não há registros em {MESES[mes - 1]} {ano}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porDia).map(([dia, itens]) => (
            <div key={dia}>
              {/* Separador de dia */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{dia}</div>
                <div className="flex-1 h-px bg-gray-100" />
                <div className="text-xs text-gray-400">{itens.length} registro{itens.length !== 1 ? 's' : ''}</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {itens.map(n => {
                  const { icone: Icone, cor, label } = tipoIcone(n.observacao)
                  const nomeTitular = n.cliente.razaoSocial || n.cliente.nome
                  const isEmissao = n.observacao.toLowerCase().includes('emissão') || n.observacao.toLowerCase().includes('emiss')
                  const isRenovacao = n.observacao.toLowerCase().includes('renovação') || n.observacao.toLowerCase().includes('vencimento') || n.observacao.toLowerCase().includes('vence')

                  return (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition">
                      {/* Ícone do tipo */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cor}`}>
                        <Icone className="w-4 h-4" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/clientes/${n.cliente.id}`}
                              className="text-sm font-medium text-gray-800 hover:text-blue-600 transition truncate block"
                            >
                              {nomeTitular}
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.observacao}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs text-gray-400">{fmtHora(n.dataContato)}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isEmissao ? 'bg-green-100 text-green-700' :
                              isRenovacao ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {isEmissao ? 'Emissão' : isRenovacao ? 'Renovação' : label}
                            </span>
                          </div>
                        </div>

                        {/* Rodapé: usuário */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <User className="w-3 h-3 text-gray-300" />
                          <span className="text-[11px] text-gray-400">{n.usuario?.nome ?? 'Sistema'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
