'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Loader2, Save, X } from 'lucide-react'

interface TemplateData {
  tipo: string
  label: string
  desc: string
  icone: string
  assunto: string
  corpo: string
  ativo: boolean
  existe: boolean
  enviados?: number
  erros?: number
  taxaAbertura?: number | null
}

interface Props {
  template: TemplateData
}

const VARS_AJUDA = [
  { var: '{{nomeCliente}}', desc: 'Nome do cliente' },
  { var: '{{modeloCertificado}}', desc: 'Modelo do certificado' },
  { var: '{{dataVencimento}}', desc: 'Data de vencimento (dd/mm/yyyy)' },
  { var: '{{diasRestantes}}', desc: 'Dias restantes para vencer' },
  { var: '{{linkRenovacao}}', desc: 'Link para renovação' },
]

export function EmailEditor({ template }: Props) {
  const router = useRouter()
  const [expandido, setExpandido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [togglingAtivo, setTogglingAtivo] = useState(false)
  const [ativo, setAtivo] = useState(template.ativo)
  const [assunto, setAssunto] = useState(template.assunto)
  const [corpo, setCorpo] = useState(template.corpo)
  const [salvo, setSalvo] = useState(false)

  async function toggleAtivo() {
    setTogglingAtivo(true)
    try {
      const res = await fetch(`/api/configuracoes/emails/${template.tipo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !ativo }),
      })
      if (res.ok) {
        setAtivo(v => !v)
        router.refresh()
      }
    } finally {
      setTogglingAtivo(false)
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await fetch(`/api/configuracoes/emails/${template.tipo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assunto, corpo }),
      })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xl shrink-0">{template.icone}</span>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{template.label}</p>
            <p className="text-xs text-gray-400">{template.desc}</p>
            {assunto && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Assunto: <span className="text-gray-700">{assunto}</span>
              </p>
            )}
            {template.enviados !== undefined && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                <span>📤 {template.enviados} enviado{template.enviados !== 1 ? 's' : ''}</span>
                <span>👁️ {template.taxaAbertura !== null && template.taxaAbertura !== undefined ? `${template.taxaAbertura}% abertura` : '—'}</span>
                {!!template.erros && (
                  <span className="text-red-500 font-medium">⚠️ {template.erros} {template.erros !== 1 ? 'falharam' : 'falhou'}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* Toggle ativo */}
          <button
            type="button"
            onClick={toggleAtivo}
            disabled={togglingAtivo}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${ativo ? 'bg-green-500' : 'bg-gray-200'}`}
            title={ativo ? 'Desativar' : 'Ativar'}
          >
            {togglingAtivo ? (
              <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
            ) : (
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
            )}
          </button>

          <span className={`text-xs font-medium w-12 ${ativo ? 'text-green-700' : 'text-gray-400'}`}>
            {ativo ? 'Ativo' : 'Inativo'}
          </span>

          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
          >
            {expandido ? <><ChevronUp className="w-3.5 h-3.5" /> Fechar</> : <><ChevronDown className="w-3.5 h-3.5" /> Editar</>}
          </button>
        </div>
      </div>

      {/* Editor expandido */}
      {expandido && (
        <div className="border-t border-gray-100 p-5 bg-gray-50">
          <form onSubmit={salvar} className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assunto do e-mail</label>
              <input
                value={assunto}
                onChange={e => setAssunto(e.target.value)}
                required
                placeholder="Ex: ⚠️ Seu certificado digital vence em {{diasRestantes}} dias"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Corpo do e-mail (HTML)</label>
              <textarea
                value={corpo}
                onChange={e => setCorpo(e.target.value)}
                required
                rows={12}
                placeholder="<h2>Olá, {{nomeCliente}}!</h2>&#10;<p>Seu certificado...</p>"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Variáveis disponíveis */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                {VARS_AJUDA.map(v => (
                  <button
                    key={v.var}
                    type="button"
                    title={v.desc}
                    onClick={() => setCorpo(c => c + v.var)}
                    className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100 transition"
                  >
                    {v.var}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Clique em uma variável para inserir no corpo do e-mail.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar Template'}
              </button>
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <X className="w-4 h-4" /> Fechar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
