'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, X, Trash2, Loader2, Phone, Users, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mergeDadosEmpresaPorCnpjSst, type CnpjEncontradoSst } from './lib/merge-dados-cnpj'
import { BuscaCancelavel } from '@/lib/busca-cancelavel'
import { mascararCNPJ as formatarCNPJ } from '@/lib/mascaras'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  nome: string
  empresa: string | null
  cnpj: string | null
  telefone: string | null
  email: string | null
  funcionarios: number | null
  laudos: string | null
  valorEstimado: string | null
  parcelas: number | null
  origem: string | null
  etapa: string
  observacoes: string | null
  responsavelNome: string | null
  createdAt: string
}

interface EntradaHistorico {
  id: string
  texto: string
  autorNome: string | null
  createdAt: string
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ETAPAS = [
  { id: 'PROSPECCAO', label: 'Prospecção',              cor: 'border-t-gray-400',   bg: 'bg-gray-50',      badge: 'bg-gray-200 text-gray-700' },
  { id: 'CONTATO',    label: 'Em Contato',              cor: 'border-t-blue-400',   bg: 'bg-blue-50/40',   badge: 'bg-blue-100 text-blue-700' },
  { id: 'ANALISE',    label: 'Em Análise SST Simples',  cor: 'border-t-violet-400', bg: 'bg-violet-50/40', badge: 'bg-violet-100 text-violet-700' },
  { id: 'PROPOSTA',   label: 'Proposta Enviada',        cor: 'border-t-yellow-400', bg: 'bg-yellow-50/40', badge: 'bg-yellow-100 text-yellow-700' },
  { id: 'FECHADO',    label: 'Fechado',                 cor: 'border-t-green-500',  bg: 'bg-green-50/40',  badge: 'bg-green-100 text-green-700' },
  { id: 'PERDIDO',    label: 'Perdido',                 cor: 'border-t-red-400',    bg: 'bg-red-50/30',    badge: 'bg-red-100 text-red-600' },
]

const LAUDOS_OPCOES = ['PGR', 'PCMSO', 'LTCAT', 'PPP', 'AET', 'Laudo de Insalubridade', 'Laudo de Periculosidade', 'PPRA', 'Outros']

const ORIGENS = ['Prospecção Ativa', 'Cliente Existente', 'Indicação de Parceiro', 'Indicação de Cliente', 'Redes Sociais', 'Outro']

const PARCELAS_OPCOES = [1, 2, 3, 4, 6, 8, 10, 12]


// ─── Formulário vazio ──────────────────────────────────────────────────────

function formVazio(etapa = 'PROSPECCAO') {
  return {
    nome: '', empresa: '', cnpj: '', telefone: '', email: '',
    funcionarios: '', laudos: [] as string[], valorEstimado: '',
    parcelas: '', origem: '', etapa, observacoes: '', responsavelNome: '',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtMoeda(v: string | null) {
  if (!v) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function SSTPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobreColuna, setSobreColuna] = useState<string | null>(null)
  const [modal, setModal] = useState<{ aberto: boolean; lead: Lead | null; etapaInicial: string }>({
    aberto: false, lead: null, etapaInicial: 'PROSPECCAO',
  })
  const [form, setForm] = useState(formVazio())
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [erroCnpj, setErroCnpj] = useState('')
  const cnpjBuscaRef = useRef(new BuscaCancelavel())

  useEffect(() => {
    return () => { cnpjBuscaRef.current.cancelar() }
  }, [])
  const [historico, setHistorico] = useState<EntradaHistorico[]>([])
  const [novaEntrada, setNovaEntrada] = useState('')
  const [salvandoEntrada, setSalvandoEntrada] = useState(false)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [primeiraAnotacao, setPrimeiraAnotacao] = useState('')

  // ── Modal de fechamento / geração de lançamentos ──────────────────────────
  const [modalFechamento, setModalFechamento] = useState<{ aberto: boolean; lead: Lead | null }>({ aberto: false, lead: null })
  const [formFechamento, setFormFechamento] = useState({
    descricao: '', valor: '', parcelas: '1', primeiroVencimento: '', formaPagamento: '',
  })
  const [gerandoLancamentos, setGerandoLancamentos] = useState(false)

  async function carregar() {
    setCarregando(true)
    const res = await fetch('/api/sst/leads')
    if (res.ok) setLeads(await res.json())
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, id: string) {
    setArrastando(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, etapa: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setSobreColuna(etapa)
  }

  function onDragLeave() {
    setSobreColuna(null)
  }

  async function onDrop(e: React.DragEvent, etapa: string) {
    e.preventDefault()
    setSobreColuna(null)
    const leadId = arrastando
    setArrastando(null)
    if (!leadId) return
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.etapa === etapa) return

    if (etapa === 'FECHADO') {
      // Intercept → abre modal de confirmação de lançamentos
      const hoje = new Date()
      const primVenc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate())
      const laudos = lead.laudos ? ` - ${lead.laudos.split(',').slice(0, 3).join(', ')}` : ''
      setFormFechamento({
        descricao: `SST - ${lead.empresa || lead.nome}${laudos}`,
        valor: lead.valorEstimado ? parseFloat(lead.valorEstimado).toFixed(2) : '',
        parcelas: lead.parcelas?.toString() ?? '1',
        primeiroVencimento: primVenc.toISOString().slice(0, 10),
        formaPagamento: '',
      })
      setModalFechamento({ aberto: true, lead })
    } else {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa } : l))
      await fetch(`/api/sst/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa }),
      })
    }
  }

  async function confirmarFechamento(gerarLancamentos: boolean) {
    const lead = modalFechamento.lead
    if (!lead) return
    setGerandoLancamentos(true)

    // Salva etapa FECHADO no lead
    await fetch(`/api/sst/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: 'FECHADO' }),
    })
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, etapa: 'FECHADO' } : l))

    if (gerarLancamentos && formFechamento.valor && formFechamento.primeiroVencimento) {
      const total   = parseFloat(formFechamento.valor)
      const nParc   = Math.max(1, parseInt(formFechamento.parcelas) || 1)
      const valorParc = total / nParc
      const [ano, mes, dia] = formFechamento.primeiroVencimento.split('-').map(Number)

      const promises = Array.from({ length: nParc }, (_, i) => {
        const venc = new Date(ano, mes - 1 + i, dia)
        const descParc = nParc > 1
          ? `${formFechamento.descricao} (${i + 1}/${nParc})`
          : formFechamento.descricao
        return fetch('/api/financeiro/lancamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'RECEBER',
            descricao: descParc,
            valor: parseFloat(valorParc.toFixed(2)),
            dataVencimento: venc.toISOString().slice(0, 10),
            status: 'PENDENTE',
            centroCusto: 'SST',
            formaPagamento: formFechamento.formaPagamento || undefined,
            observacoes: `Lead SST: ${lead.empresa || lead.nome}`,
          }),
        })
      })
      await Promise.all(promises)
    }

    setGerandoLancamentos(false)
    setModalFechamento({ aberto: false, lead: null })
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  async function buscarCnpj(cnpj: string) {
    const nums = cnpj.replace(/\D/g, '')
    if (nums.length !== 14) return

    setBuscandoCnpj(true)
    setErroCnpj('')

    // Cancela qualquer busca de CNPJ anterior ainda em andamento, evitando
    // que uma resposta obsoleta sobrescreva os dados do CNPJ atual.
    const resultado = await cnpjBuscaRef.current.executar(async (signal) => {
      const res = await fetch(`/api/cnpj/${nums}`, { signal })
      const data = await res.json()
      return { res, data }
    })

    if (resultado.cancelada) return
    setBuscandoCnpj(false)

    if (resultado.erro) {
      setErroCnpj('Erro ao consultar CNPJ.')
      setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpjSst(f, null) }))
      return
    }

    const { res, data } = resultado.dados!
    if (!res.ok) {
      setErroCnpj(data.erro ?? 'CNPJ não encontrado')
      setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpjSst(f, null) }))
      return
    }
    setForm(f => ({
      ...f,
      ...mergeDadosEmpresaPorCnpjSst(f, data as CnpjEncontradoSst),
      nome: f.nome || data.responsavel || f.nome,
    }))
  }

  async function carregarHistorico(leadId: string) {
    setCarregandoHistorico(true)
    const res = await fetch(`/api/sst/leads/${leadId}/historico`)
    if (res.ok) setHistorico(await res.json())
    setCarregandoHistorico(false)
  }

  async function registrarEntrada() {
    if (!novaEntrada.trim() || !modal.lead) return
    setSalvandoEntrada(true)
    const res = await fetch(`/api/sst/leads/${modal.lead.id}/historico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: novaEntrada }),
    })
    if (res.ok) {
      const nova = await res.json()
      setHistorico(prev => [nova, ...prev])
      setNovaEntrada('')
    }
    setSalvandoEntrada(false)
  }

  function abrirNovo(etapa: string) {
    setForm(formVazio(etapa))
    setErroCnpj('')
    setHistorico([])
    setNovaEntrada('')
    setPrimeiraAnotacao('')
    setModal({ aberto: true, lead: null, etapaInicial: etapa })
  }

  function abrirEditar(lead: Lead) {
    setErroCnpj('')
    setNovaEntrada('')
    setHistorico([])
    carregarHistorico(lead.id)
    setForm({
      nome: lead.nome,
      empresa: lead.empresa ?? '',
      cnpj: lead.cnpj ?? '',
      telefone: lead.telefone ?? '',
      email: lead.email ?? '',
      funcionarios: lead.funcionarios?.toString() ?? '',
      laudos: lead.laudos ? lead.laudos.split(',') : [],
      valorEstimado: lead.valorEstimado ?? '',
      parcelas: lead.parcelas?.toString() ?? '',
      origem: lead.origem ?? '',
      etapa: lead.etapa,
      observacoes: lead.observacoes ?? '',
      responsavelNome: lead.responsavelNome ?? '',
    })
    setModal({ aberto: true, lead, etapaInicial: lead.etapa })
  }

  function fecharModal() {
    setModal({ aberto: false, lead: null, etapaInicial: 'PROSPECCAO' })
  }

  function toggleLaudo(laudo: string) {
    setForm(f => ({
      ...f,
      laudos: f.laudos.includes(laudo) ? f.laudos.filter(l => l !== laudo) : [...f.laudos, laudo],
    }))
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)

    const payload = {
      ...form,
      laudos: form.laudos.join(','),
      funcionarios: form.funcionarios || null,
      valorEstimado: form.valorEstimado || null,
      parcelas: form.parcelas || null,
    }

    if (modal.lead) {
      const res = await fetch(`/api/sst/leads/${modal.lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const atualizado = await res.json()
        setLeads(prev => prev.map(l => l.id === modal.lead!.id ? atualizado : l))
      }
    } else {
      const res = await fetch('/api/sst/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const novo = await res.json()
        setLeads(prev => [novo, ...prev])
        if (primeiraAnotacao.trim()) {
          await fetch(`/api/sst/leads/${novo.id}/historico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: primeiraAnotacao }),
          })
        }
      }
    }

    setSalvando(false)
    fecharModal()
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este lead permanentemente?')) return
    setDeletando(id)
    await fetch(`/api/sst/leads/${id}`, { method: 'DELETE' })
    setLeads(prev => prev.filter(l => l.id !== id))
    setDeletando(null)
    if (modal.lead?.id === id) fecharModal()
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const totalValor = leads
    .filter(l => l.etapa === 'FECHADO' && l.valorEstimado)
    .reduce((s, l) => s + parseFloat(l.valorEstimado!), 0)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SST — Segurança e Saúde no Trabalho</h1>
          <p className="text-xs text-gray-500 mt-0.5">Pipeline de captação · Parceria SST Simples</p>
        </div>
        <div className="flex items-center gap-4">
          {totalValor > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Fechado</p>
              <p className="text-sm font-bold text-green-600">{fmtMoeda(totalValor.toString())}</p>
            </div>
          )}
          <button onClick={() => abrirNovo('PROSPECCAO')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full p-4 min-w-max">
            {ETAPAS.map(etapa => {
              const cards = leads.filter(l => l.etapa === etapa.id)
              const sobre = sobreColuna === etapa.id

              return (
                <div key={etapa.id}
                  className={cn(
                    'flex flex-col w-72 h-full rounded-xl border-t-4 transition-all',
                    etapa.cor, etapa.bg,
                    sobre && arrastando ? 'ring-2 ring-blue-400 ring-offset-1 scale-[1.01]' : 'border border-gray-200'
                  )}
                  onDragOver={e => onDragOver(e, etapa.id)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, etapa.id)}
                >
                  {/* Cabeçalho da coluna */}
                  <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{etapa.label}</span>
                      <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-full', etapa.badge)}>
                        {cards.length}
                      </span>
                    </div>
                    <button onClick={() => abrirNovo(etapa.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    {cards.map(lead => (
                      <div key={lead.id}
                        draggable
                        onDragStart={e => onDragStart(e, lead.id)}
                        onDragEnd={() => setArrastando(null)}
                        onClick={() => abrirEditar(lead)}
                        className={cn(
                          'bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing select-none transition-all hover:shadow-md hover:border-gray-200',
                          arrastando === lead.id && 'opacity-40 scale-95'
                        )}
                      >
                        {/* Empresa / Nome */}
                        <p className="font-semibold text-gray-900 text-sm leading-tight">
                          {lead.empresa || lead.nome}
                        </p>
                        {lead.empresa && (
                          <p className="text-xs text-gray-500 mt-0.5">{lead.nome}</p>
                        )}

                        {/* Laudos */}
                        {lead.laudos && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {lead.laudos.split(',').slice(0, 3).map(l => (
                              <span key={l} className="text-[10px] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-md">{l.trim()}</span>
                            ))}
                            {lead.laudos.split(',').length > 3 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-1.5 py-0.5 rounded-md">
                                +{lead.laudos.split(',').length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Info rodapé */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            {lead.telefone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3" />{lead.telefone}
                              </span>
                            )}
                            {lead.funcionarios && (
                              <span className="flex items-center gap-0.5">
                                <Users className="w-3 h-3" />{lead.funcionarios}
                              </span>
                            )}
                          </div>
                          {lead.valorEstimado && (
                            <div className="text-right">
                              <p className="text-[11px] font-bold text-gray-700">{fmtMoeda(lead.valorEstimado)}</p>
                              {lead.parcelas && lead.parcelas > 1 && (
                                <p className="text-[10px] text-gray-400">{lead.parcelas}x</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {cards.length === 0 && (
                      <div className={cn(
                        'flex items-center justify-center h-16 rounded-xl border-2 border-dashed text-xs text-gray-300 transition-all',
                        sobre && arrastando ? 'border-blue-300 bg-blue-50/50 text-blue-400' : 'border-gray-200'
                      )}>
                        {sobre && arrastando ? 'Soltar aqui' : 'Vazio'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal Novo / Editar ──────────────────────────────────────────── */}
      {modal.aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-900 text-base">
                {modal.lead ? 'Editar Lead' : 'Novo Lead SST'}
              </h2>
              <div className="flex items-center gap-2">
                {modal.lead && (
                  <button onClick={() => deletar(modal.lead!.id)} disabled={deletando === modal.lead.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                    {deletando === modal.lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={fecharModal} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Linha 1: Nome + CNPJ (com busca) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do Contato *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: João Silva"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">CNPJ</label>
                  <div className="flex gap-2">
                    <input
                      value={form.cnpj}
                      onChange={e => {
                        const v = formatarCNPJ(e.target.value)
                        setForm(f => ({ ...f, cnpj: v }))
                        setErroCnpj('')
                        if (v.replace(/\D/g, '').length === 14) buscarCnpj(v)
                      }}
                      placeholder="00.000.000/0001-00"
                      maxLength={18}
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button
                      type="button"
                      onClick={() => buscarCnpj(form.cnpj)}
                      disabled={buscandoCnpj || form.cnpj.replace(/\D/g, '').length !== 14}
                      className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 transition shrink-0">
                      {buscandoCnpj ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {erroCnpj && <p className="text-[11px] text-red-500 mt-1">{erroCnpj}</p>}
                </div>
              </div>

              {/* Linha 2: Empresa (auto-preenchida) + Funcionários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Empresa
                    {buscandoCnpj && <span className="ml-2 text-teal-500 font-normal">buscando...</span>}
                  </label>
                  <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                    placeholder="Preenchido automaticamente pelo CNPJ"
                    className={cn(
                      'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                      form.empresa ? 'border-teal-200 bg-teal-50/40' : 'border-gray-200'
                    )} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Nº de Funcionários</label>
                  <input type="number" value={form.funcionarios} onChange={e => setForm(f => ({ ...f, funcionarios: e.target.value }))}
                    placeholder="Ex: 25"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Linha 3: Telefone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Telefone / WhatsApp</label>
                  <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contato@empresa.com.br"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Laudos de interesse */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Laudos de Interesse</label>
                <div className="flex flex-wrap gap-2">
                  {LAUDOS_OPCOES.map(l => (
                    <button key={l} type="button" onClick={() => toggleLaudo(l)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-lg border font-medium transition',
                        form.laudos.includes(l)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Linha 4: Valor + Parcelas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Valor Estimado (R$)</label>
                  <input type="number" value={form.valorEstimado} onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))}
                    placeholder="Ex: 2500"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Parcelas</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PARCELAS_OPCOES.map(p => (
                      <button key={p} type="button" onClick={() => setForm(f => ({ ...f, parcelas: p.toString() }))}
                        className={cn(
                          'text-xs px-2 py-1 rounded-lg border font-medium transition min-w-[36px]',
                          form.parcelas === p.toString()
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        )}>
                        {p}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Linha 5: Origem + Etapa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Origem do Lead</label>
                  <select value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecionar...</option>
                    {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Etapa</label>
                  <select value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2} placeholder="Anotações gerais sobre o lead..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Histórico de contato */}
              {!modal.lead ? (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Primeira Anotação</p>
                  <p className="text-[11px] text-gray-400 mb-2">Registre aqui o contexto inicial do contato</p>
                  <textarea
                    value={primeiraAnotacao}
                    onChange={e => setPrimeiraAnotacao(e.target.value)}
                    rows={3}
                    placeholder="Ex: Cliente indicado pela Priscila, tem 30 funcionários e precisa de PGR + PCMSO. Demonstrou interesse, aguardando proposta."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-3">Histórico de Contato</p>

                  {/* Input nova entrada */}
                  <div className="flex gap-2 mb-3">
                    <textarea
                      value={novaEntrada}
                      onChange={e => setNovaEntrada(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) registrarEntrada() }}
                      rows={2}
                      placeholder="Registre aqui o que foi conversado... (Ctrl+Enter para salvar)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button
                      type="button"
                      onClick={registrarEntrada}
                      disabled={!novaEntrada.trim() || salvandoEntrada}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40 shrink-0 self-end">
                      {salvandoEntrada ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Registrar'}
                    </button>
                  </div>

                  {/* Timeline */}
                  {carregandoHistorico ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                    </div>
                  ) : historico.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhum registro ainda.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {historico.map((h, i) => (
                        <div key={h.id} className="flex gap-3">
                          {/* Linha da timeline */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1 shrink-0" />
                            {i < historico.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                          </div>
                          <div className="pb-3 flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold text-gray-500">
                                {new Date(h.createdAt).toLocaleString('pt-BR', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                              {h.autorNome && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{h.autorNome}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{h.texto}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end gap-2">
              <button onClick={fecharModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={!form.nome.trim() || salvando}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40">
                {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {modal.lead ? 'Salvar Alterações' : 'Criar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Fechamento / Geração de Lançamentos ─────────────────── */}
      {modalFechamento.aberto && modalFechamento.lead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-600 text-base">✓</span>
                </div>
                <h2 className="font-bold text-gray-900 text-base">Negócio Fechado!</h2>
              </div>
              <p className="text-sm text-gray-500 ml-11">
                Deseja gerar os lançamentos no <strong>Contas a Receber</strong>?
              </p>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {/* Descrição */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Descrição</label>
                <input
                  value={formFechamento.descricao}
                  onChange={e => setFormFechamento(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Valor + Parcelas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={formFechamento.valor}
                    onChange={e => setFormFechamento(f => ({ ...f, valor: e.target.value }))}
                    placeholder="Ex: 2500"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Parcelas</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PARCELAS_OPCOES.map(p => (
                      <button key={p} type="button"
                        onClick={() => setFormFechamento(f => ({ ...f, parcelas: p.toString() }))}
                        className={cn(
                          'text-xs px-2 py-1 rounded-lg border font-medium transition min-w-[34px]',
                          formFechamento.parcelas === p.toString()
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                        )}>
                        {p}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview do valor por parcela */}
              {formFechamento.valor && parseInt(formFechamento.parcelas) > 1 && (
                <div className="bg-green-50 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-green-700">{formFechamento.parcelas}x de</span>
                  <span className="text-sm font-bold text-green-700">
                    {(parseFloat(formFechamento.valor) / parseInt(formFechamento.parcelas))
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}

              {/* Vencimento 1ª parcela + Forma de pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    {parseInt(formFechamento.parcelas) > 1 ? 'Vencimento 1ª parcela' : 'Data de Vencimento'}
                  </label>
                  <input
                    type="date"
                    value={formFechamento.primeiroVencimento}
                    onChange={e => setFormFechamento(f => ({ ...f, primeiroVencimento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Forma de Pagamento</label>
                  <select
                    value={formFechamento.formaPagamento}
                    onChange={e => setFormFechamento(f => ({ ...f, formaPagamento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Selecionar...</option>
                    <option>PIX</option>
                    <option>Boleto</option>
                    <option>Cartão de Crédito</option>
                    <option>Transferência</option>
                    <option>Dinheiro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={() => confirmarFechamento(false)}
                disabled={gerandoLancamentos}
                className="text-sm text-gray-500 hover:text-gray-700 transition disabled:opacity-40">
                Fechar sem gerar lançamentos
              </button>
              <button
                onClick={() => confirmarFechamento(true)}
                disabled={gerandoLancamentos || !formFechamento.valor || !formFechamento.primeiroVencimento}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40">
                {gerandoLancamentos && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Gerar {formFechamento.parcelas !== '1' ? `${formFechamento.parcelas} lançamentos` : 'lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
