'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, ChevronDown, ChevronUp, Plus, Loader2, Send, MessageSquare,
  Phone, Mail, Building2, RefreshCw, Calendar, User, Clock, CheckCircle2
} from 'lucide-react'

interface Certificado {
  id: string
  dataVencimento: string
  diasRestantes: number
  modelo: { nome: string; tipoCertificado: string }
  pedido?: { agr: string | null; numero: string } | null
  cliente: {
    id: string; nome: string; email: string | null; celular: string | null
    telefone: string | null; cpf: string | null; cnpj: string | null
    razaoSocial: string | null; responsavel: string | null; tipoPessoa: string; grupo?: string | null
    parceiro?: { nome: string; celular: string | null; telefone: string | null; razaoSocial: string | null } | null
  }
}

interface HistoricoItem {
  id: string
  observacao: string
  dataContato: string
  proximoContato: string | null
  createdAt: string
  usuario: { nome: string } | null
}

interface Props {
  cert: Certificado
  onFechar: () => void
}

function fmtData(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function fmtDataHora(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Secao({ titulo, children, defaultOpen = false }: { titulo: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [aberta, setAberta] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setAberta(v => !v)}
        className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-gray-50 transition text-left">
        <span className="font-semibold text-gray-800 text-sm">{titulo}</span>
        {aberta ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {aberta && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium truncate">{value || '—'}</p>
    </div>
  )
}

export function DetalheRenovacao({ cert, onFechar }: Props) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [carregandoHist, setCarregandoHist] = useState(false)
  const [novaObs, setNovaObs] = useState('')
  const [proximoContato, setProximoContato] = useState('')
  const [salvandoObs, setSalvandoObs] = useState(false)

  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [erroEmail, setErroEmail] = useState('')

  const [enviandoWA, setEnviandoWA] = useState(false)
  const [waEnviado, setWaEnviado] = useState(false)
  const [erroWA, setErroWA] = useState('')

  const vencido = cert.diasRestantes < 0
  const corFaixa = vencido ? 'bg-red-600' : cert.diasRestantes <= 7 ? 'bg-orange-500' : cert.diasRestantes <= 15 ? 'bg-yellow-500' : 'bg-green-600'

  const carregarHistorico = useCallback(async () => {
    setCarregandoHist(true)
    try {
      const res = await fetch(`/api/renovacoes/historico?clienteId=${cert.cliente.id}`)
      const data = await res.json()
      setHistorico(Array.isArray(data) ? data : [])
    } catch {}
    finally { setCarregandoHist(false) }
  }, [cert.cliente.id])

  useEffect(() => { carregarHistorico() }, [carregarHistorico])

  async function salvarHistorico() {
    if (!novaObs.trim()) return
    setSalvandoObs(true)
    try {
      const res = await fetch('/api/renovacoes/historico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cert.cliente.id,
          certificadoId: cert.id,
          observacao: novaObs,
          proximoContato: proximoContato || undefined,
        }),
      })
      if (res.ok) {
        setNovaObs('')
        setProximoContato('')
        carregarHistorico()
      }
    } catch {}
    finally { setSalvandoObs(false) }
  }

  async function enviarWA() {
    const telefone = cert.cliente.celular ?? cert.cliente.telefone
    if (!telefone) { setErroWA('Cliente sem telefone cadastrado'); return }
    setEnviandoWA(true)
    setErroWA('')
    try {
      const res = await fetch('/api/renovacoes/notificar-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificadoId: cert.id,
          telefone,
          nomeCliente: cert.cliente.nome,
          modeloCertificado: cert.modelo.nome,
          dataVencimento: fmtData(cert.dataVencimento),
          diasRestantes: cert.diasRestantes,
        }),
      })
      const data = await res.json()
      if (res.ok) { setWaEnviado(true); carregarHistorico() }
      else setErroWA(data.erro ?? 'Erro ao enviar')
    } catch { setErroWA('Erro de conexão') }
    finally { setEnviandoWA(false) }
  }

  async function enviarEmail() {
    if (!cert.cliente.email) { setErroEmail('Cliente sem e-mail cadastrado'); return }
    setEnviandoEmail(true)
    setErroEmail('')
    try {
      const res = await fetch('/api/renovacoes/notificar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificadoId: cert.id,
          emailDestino: cert.cliente.email,
          nomeCliente: cert.cliente.nome,
          modeloCertificado: cert.modelo.nome,
          dataVencimento: fmtData(cert.dataVencimento),
          diasRestantes: cert.diasRestantes,
        }),
      })
      const data = await res.json()
      if (res.ok) { setEmailEnviado(true); carregarHistorico() }
      else setErroEmail(data.erro ?? 'Erro ao enviar')
    } catch { setErroEmail('Erro de conexão') }
    finally { setEnviandoEmail(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[85vh] overflow-hidden">

        {/* Header colorido */}
        <div className={`${corFaixa} text-white p-4 shrink-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs font-medium">Vencimento: {fmtData(cert.dataVencimento)}</p>
              <h2 className="font-bold text-lg truncate">{cert.cliente.nome}</h2>
              <p className="text-white/80 text-sm">{cert.modelo.nome} · {vencido ? `${Math.abs(cert.diasRestantes)}d vencido` : `${cert.diasRestantes}d restantes`}</p>
            </div>
            <button onClick={onFechar} className="p-1.5 rounded-full hover:bg-white/20 transition shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2 mt-3">
            <a href={`/pedidos/nova-venda?clienteId=${cert.cliente.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition">
              <RefreshCw className="w-3.5 h-3.5" /> Renovar
            </a>

            {/* WhatsApp via Digisac — envia e registra no histórico */}
            <button onClick={enviarWA} disabled={enviandoWA || (!cert.cliente.celular && !cert.cliente.telefone)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition disabled:opacity-50">
              {enviandoWA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : waEnviado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
              {waEnviado ? 'WhatsApp enviado!' : enviandoWA ? 'Enviando...' : 'WhatsApp'}
            </button>

            <button onClick={enviarEmail} disabled={enviandoEmail || !cert.cliente.email}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition disabled:opacity-50">
              {enviandoEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : emailEnviado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
              {emailEnviado ? 'E-mail enviado!' : 'E-mail'}
            </button>
          </div>
          {erroWA    && <p className="text-xs text-white/80 mt-1">⚠️ WhatsApp: {erroWA}</p>}
          {erroEmail && <p className="text-xs text-white/80 mt-1">⚠️ E-mail: {erroEmail}</p>}
          {!cert.cliente.celular && !cert.cliente.telefone && <p className="text-xs text-white/60 mt-1">⚠️ Sem telefone cadastrado</p>}
          {!cert.cliente.email && <p className="text-xs text-white/60 mt-1">⚠️ Sem e-mail cadastrado</p>}
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

          <Secao titulo="Cliente" defaultOpen>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <Campo label="Nome" value={cert.cliente.nome} />
              <Campo label="CPF / CNPJ" value={cert.cliente.cpf ?? cert.cliente.cnpj} />
              {cert.cliente.razaoSocial && <Campo label="Razão Social" value={cert.cliente.razaoSocial} />}
              {cert.cliente.responsavel && <Campo label="Responsável" value={cert.cliente.responsavel} />}
              {cert.cliente.grupo && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Grupo</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                    {cert.cliente.grupo}
                  </span>
                </div>
              )}
              <Campo label="Celular" value={cert.cliente.celular} />
              <Campo label="E-mail" value={cert.cliente.email} />
            </div>
            {(cert.cliente.celular || cert.cliente.email) && (
              <div className="flex gap-2 mt-3">
                {cert.cliente.celular && (
                  <a href={`tel:${cert.cliente.celular.replace(/\D/g,'')}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition">
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>
                )}
                {cert.cliente.email && (
                  <a href={`mailto:${cert.cliente.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition">
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </a>
                )}
              </div>
            )}
          </Secao>

          <Secao titulo="Contabilidade / Parceiro">
            {cert.cliente.parceiro ? (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <Campo label="Nome" value={cert.cliente.parceiro.razaoSocial ?? cert.cliente.parceiro.nome} />
                <Campo label="Celular" value={cert.cliente.parceiro.celular ?? cert.cliente.parceiro.telefone} />
              </div>
            ) : (
              <p className="text-sm text-gray-400 pt-1">Nenhum parceiro vinculado</p>
            )}
          </Secao>

          <Secao titulo="Informações Gerais">
            <div className="grid grid-cols-2 gap-4 pt-1">
              <Campo label="Certificado" value={cert.modelo.nome} />
              <Campo label="Tipo" value={cert.modelo.tipoCertificado} />
              <Campo label="Vencimento" value={fmtData(cert.dataVencimento)} />
              <Campo label="AGR" value={cert.pedido?.agr ?? '—'} />
              {cert.pedido?.numero && <Campo label="Nº Pedido" value={cert.pedido.numero} />}
            </div>
          </Secao>

          {/* Histórico de Contatos — mais importante */}
          <Secao titulo={`Histórico de Contatos${historico.length > 0 ? ` (${historico.length})` : ''}`} defaultOpen>
            {/* Nova observação */}
            <div className="space-y-2 pt-1 mb-4">
              <textarea value={novaObs} onChange={e => setNovaObs(e.target.value)} rows={3}
                placeholder="Registre o contato: o que foi falado, o que ficou combinado..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Próximo contato</label>
                  <input type="date" value={proximoContato} onChange={e => setProximoContato(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={salvarHistorico} disabled={!novaObs.trim() || salvandoObs}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition self-end">
                  {salvandoObs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>

            {/* Lista */}
            {carregandoHist ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : historico.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum contato registrado ainda</p>
            ) : (
              <div className="space-y-3">
                {historico.map(h => (
                  <div key={h.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-sm text-gray-800 leading-relaxed">{h.observacao}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {h.usuario?.nome ?? 'Sistema'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDataHora(h.createdAt)}</span>
                      {h.proximoContato && (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Calendar className="w-3 h-3" /> Próximo: {fmtData(h.proximoContato)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Secao>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onFechar} className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}