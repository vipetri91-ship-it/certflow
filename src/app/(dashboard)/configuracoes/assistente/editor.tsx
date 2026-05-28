'use client'

import { useState } from 'react'
import { Sparkles, Save, Info, BookOpen, FileUp, Loader2, FileText, AlertTriangle, Trash2 } from 'lucide-react'

interface PdfMeta { nome: string; data: string; chars: number }

interface Props {
  conhecimentoInicial: string
  pdfsAdicionados: PdfMeta[]
}

export function AssistenteEditor({ conhecimentoInicial, pdfsAdicionados: pdfsIniciais }: Props) {
  const [conhecimento, setConhecimento] = useState(conhecimentoInicial)
  const [salvando,     setSalvando]     = useState(false)
  const [mensagem,     setMensagem]     = useState('')
  const [extraindo,    setExtraindo]    = useState(false)
  const [pdfs,         setPdfs]         = useState<PdfMeta[]>(pdfsIniciais)

  async function salvar() {
    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/assistente/conhecimento', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ conhecimento }),
      })
      setMensagem(res.ok ? '✓ Salvo com sucesso!' : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Avisa se já foi adicionado antes
    const jaExiste = pdfs.some(p => p.nome === file.name)
    if (jaExiste) {
      const continuar = window.confirm(`"${file.name}" já foi adicionado antes.\n\nDeseja adicionar novamente mesmo assim?`)
      if (!continuar) return
    }

    setExtraindo(true)
    setMensagem('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/assistente/extrair-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setMensagem(data.erro ?? 'Erro ao extrair PDF'); return }

      setConhecimento(prev => prev + data.texto)
      setPdfs(prev => [...prev, { nome: file.name, data: new Date().toISOString(), chars: data.chars }])
      setMensagem(`✓ "${file.name}" extraído e adicionado. Revise o conteúdo e clique em Salvar.`)
    } finally {
      setExtraindo(false)
    }
  }

  function fmtData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const chars  = conhecimento.length
  const tokens = Math.round(chars / 4)

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">

      {/* Intro */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">Como funciona a ZOE</p>
          <p>O conteúdo abaixo é injetado como contexto em cada conversa. Quanto mais completo, melhores serão as respostas. Use Markdown para organizar com títulos (##), listas (-) e negrito (**texto**).</p>
        </div>
      </div>

      {/* Dicas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: BookOpen, title: 'Processos internos', desc: 'Fluxo de emissão, verificação, protocolos' },
          { icon: Info,     title: 'Produtos e preços',  desc: 'Tipos de certificado, validades, valores' },
          { icon: Sparkles, title: 'Dúvidas frequentes', desc: 'FAQ dos clientes, problemas comuns, soluções' },
        ].map(item => (
          <div key={item.title} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3.5 flex gap-2.5">
            <item.icon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PDFs adicionados */}
      {pdfs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <FileText className="w-4 h-4 text-purple-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              PDFs adicionados à base
            </p>
            <span className="ml-auto text-xs text-gray-400">{pdfs.length} arquivo{pdfs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {pdfs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                  <p className="text-xs text-gray-400">{fmtData(p.data)} · {p.chars.toLocaleString()} caracteres extraídos</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Para remover o conteúdo de um PDF, edite manualmente a área de texto abaixo e salve.
            </p>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Conteúdo da Base de Conhecimento</p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">
              {chars.toLocaleString()} caracteres · ~{tokens.toLocaleString()} tokens
            </p>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              extraindo
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}>
              {extraindo
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraindo...</>
                : <><FileUp className="w-3.5 h-3.5" /> Adicionar PDF</>}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                disabled={extraindo}
                onChange={handlePdf}
              />
            </label>
          </div>
        </div>
        <textarea
          value={conhecimento}
          onChange={e => setConhecimento(e.target.value)}
          placeholder="Cole aqui os manuais, processos, FAQ e informações da V&G..."
          rows={28}
          className="w-full px-4 py-4 text-sm font-mono text-gray-800 dark:text-gray-200 dark:bg-slate-800 resize-none focus:outline-none border-0"
        />
      </div>

      {mensagem && (
        <p className={`text-sm px-4 py-2 rounded-lg ${
          mensagem.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>{mensagem}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Conteúdo enviado à ZOE com <strong>prompt caching</strong> ativo — mais rápido após a primeira mensagem.
        </p>
        <button onClick={salvar} disabled={salvando}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
