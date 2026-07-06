'use client'

import { useState, useEffect } from 'react'
import { Send, Users, AlertTriangle, CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import type { FiltroMarketing } from '@/app/api/marketing/destinatarios/route'

const FILTROS: { valor: FiltroMarketing; label: string; desc: string }[] = [
  { valor: 'todos_clientes_ativos', label: 'Clientes com certificado ativo', desc: 'Clientes que possuem ao menos 1 certificado ativo hoje' },
  { valor: 'vencendo_30', label: 'Vencendo nos próximos 30 dias', desc: 'Certificados ativos que vencem em até 30 dias' },
  { valor: 'vencendo_60', label: 'Vencendo nos próximos 60 dias', desc: 'Certificados ativos que vencem em até 60 dias' },
  { valor: 'vencendo_90', label: 'Vencendo nos próximos 90 dias', desc: 'Certificados ativos que vencem em até 90 dias' },
  { valor: 'todos_clientes', label: 'Todos os clientes (com e-mail)', desc: 'Todos os clientes cadastrados que possuem e-mail' },
]

type Step = 'compose' | 'confirm' | 'sending' | 'done'

export function MarketingDisparar() {
  const [filtro, setFiltro]     = useState<FiltroMarketing>('todos_clientes_ativos')
  const [assunto, setAssunto]   = useState('')
  const [corpo, setCorpo]       = useState('')
  const [step, setStep]         = useState<Step>('compose')
  const [preview, setPreview]   = useState<{ total: number; preview: string[] } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [resultado, setResultado] = useState<{ enviados: number; erros: number } | null>(null)
  const [erro, setErro]         = useState('')

  useEffect(() => {
    setPreview(null)
    setErro('')
  }, [filtro])

  async function carregarPreview() {
    setLoadingPreview(true)
    setErro('')
    try {
      const res = await fetch(`/api/marketing/destinatarios?filtro=${filtro}`)
      const json = await res.json()
      setPreview(json)
    } catch {
      setErro('Erro ao carregar destinatários')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function disparar() {
    setStep('sending')
    setErro('')
    try {
      const res = await fetch('/api/marketing/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filtro, assunto, corpo }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.erro ?? 'Erro ao disparar campanha')
        setStep('confirm')
        return
      }
      setResultado({ enviados: json.enviados, erros: json.erros })
      setStep('done')
    } catch {
      setErro('Erro de conexão ao disparar campanha')
      setStep('confirm')
    }
  }

  function resetar() {
    setStep('compose')
    setAssunto('')
    setCorpo('')
    setPreview(null)
    setResultado(null)
    setErro('')
    setFiltro('todos_clientes_ativos')
  }

  if (step === 'done' && resultado) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Campanha enviada!</h3>
        <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
          <span className="font-semibold text-green-600">{resultado.enviados} enviados</span>
          {resultado.erros > 0 && <span className="text-red-500 ml-2">· {resultado.erros} com erro</span>}
        </p>
        <button onClick={resetar}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
          Nova campanha
        </button>
      </div>
    )
  }

  if (step === 'sending') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-8 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-slate-400 font-medium">Enviando campanha…</p>
        <p className="text-xs text-gray-400 mt-1">Não feche esta página</p>
      </div>
    )
  }

  if (step === 'confirm' && preview) {
    const filtroLabel = FILTROS.find(f => f.valor === filtro)?.label ?? filtro
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Confirmar disparo</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
            Você está prestes a enviar um e-mail para <strong>{preview.total} destinatários</strong>.
            Esta ação não pode ser desfeita.
          </div>
          <div className="text-sm space-y-1.5 text-gray-600 dark:text-slate-400">
            <div><span className="font-medium text-gray-700 dark:text-gray-300">Segmento:</span> {filtroLabel}</div>
            <div><span className="font-medium text-gray-700 dark:text-gray-300">Assunto:</span> {assunto}</div>
          </div>
          {preview.preview.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Primeiros destinatários:</p>
              <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-0.5">
                {preview.preview.map((nome, i) => (
                  <li key={i} className="truncate">• {nome}</li>
                ))}
                {preview.total > 10 && (
                  <li className="text-gray-400">… e mais {preview.total - 10}</li>
                )}
              </ul>
            </div>
          )}
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">{erro}</p>
          )}
        </div>
        <div className="px-5 pb-4 flex gap-3">
          <button onClick={() => { setStep('compose'); setErro('') }}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition">
            Voltar e editar
          </button>
          <button onClick={disparar}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
            <Send className="w-4 h-4" />
            Confirmar envio
          </button>
        </div>
      </div>
    )
  }

  // step === 'compose'
  const podeAvancar = assunto.trim().length >= 5 && corpo.trim().length >= 10

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <Send className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Disparar campanha</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* Filtro de destinatários */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
            Destinatários
          </label>
          <div className="relative">
            <select
              value={filtro}
              onChange={e => setFiltro(e.target.value as FiltroMarketing)}
              className="w-full appearance-none border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 pr-8 text-sm bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FILTROS.map(f => (
                <option key={f.valor} value={f.valor}>{f.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {FILTROS.find(f => f.valor === filtro)?.desc}
          </p>
          <button
            onClick={carregarPreview}
            disabled={loadingPreview}
            className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition disabled:opacity-50"
          >
            {loadingPreview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
            {preview ? `${preview.total} destinatários selecionados — recarregar` : 'Ver quantos serão impactados'}
          </button>
          {preview && (
            <div className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
              {preview.preview.slice(0, 5).join(', ')}
              {preview.total > 5 && ` … +${preview.total - 5}`}
            </div>
          )}
        </div>

        {/* Assunto */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
            Assunto do e-mail
          </label>
          <input
            type="text"
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            placeholder="Ex: Seu certificado vence em breve — renove agora!"
            maxLength={200}
            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Corpo */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
            Corpo da mensagem
            <span className="text-gray-400 font-normal ml-1">(texto simples — quebras de linha são preservadas)</span>
          </label>
          <textarea
            value={corpo}
            onChange={e => setCorpo(e.target.value)}
            rows={7}
            placeholder={`Prezado cliente,\n\nSeu certificado digital está próximo do vencimento. Renove agora e garanta a continuidade das suas operações.\n\nClique no link abaixo para iniciar o processo.`}
            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">{corpo.length} caracteres</p>
        </div>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{erro}</p>
        )}

        <button
          onClick={() => {
            if (!preview) { carregarPreview().then(() => setStep('confirm')); return }
            setStep('confirm')
          }}
          disabled={!podeAvancar}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition"
        >
          <Send className="w-4 h-4" />
          Revisar e enviar
        </button>
      </div>
    </div>
  )
}
