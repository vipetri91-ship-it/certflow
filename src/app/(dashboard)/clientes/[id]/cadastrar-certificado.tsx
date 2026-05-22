'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Save, Loader2 } from 'lucide-react'

interface Modelo { id: string; nome: string }

interface Props {
  clienteId: string
  modelos:   Modelo[]
}

const AGR_OPTIONS = [
  { value: 'vinicius',     label: 'Vinicius' },
  { value: 'arlen',       label: 'Arlen' },
  { value: 'ana.karolina', label: 'Ana Karolina' },
  { value: 'laryssa',     label: 'Laryssa' },
]

const cls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

export function CadastrarCertificado({ clienteId, modelos }: Props) {
  const router  = useRouter()
  const [aberto,  setAberto]  = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro,    setErro]    = useState('')

  const hoje = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    modeloId:      '',
    dataEmissao:   hoje,
    dataVencimento: '',
    valor:         '',
    protocolo:     '',
    agr:           'vinicius',
    status:        'ATIVO' as 'ATIVO' | 'VENCIDO' | 'RENOVADO' | 'CANCELADO',
  })

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Ao selecionar o modelo, tenta auto-calcular o vencimento
  function selecionarModelo(modeloId: string) {
    set('modeloId', modeloId)
    const modelo = modelos.find(m => m.id === modeloId)
    if (modelo && form.dataEmissao) {
      const meses = extrairMeses(modelo.nome)
      if (meses > 0) {
        const venc = new Date(form.dataEmissao)
        venc.setMonth(venc.getMonth() + meses)
        set('dataVencimento', venc.toISOString().split('T')[0])
      }
    }
  }

  function extrairMeses(nome: string): number {
    const m = nome.match(/(\d+)\s*[Mm]es/)
    if (m) return parseInt(m[1])
    if (nome.includes('24')) return 24
    if (nome.includes('12')) return 12
    if (nome.includes('36')) return 36
    return 0
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.modeloId || !form.dataEmissao || !form.dataVencimento) {
      setErro('Modelo, data de emissão e vencimento são obrigatórios')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/certificados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          modeloId:      form.modeloId,
          dataEmissao:   form.dataEmissao,
          dataVencimento: form.dataVencimento,
          valorFinal:    form.valor ? Number(form.valor) : undefined,
          numeroSerie:   form.protocolo || undefined,
          agr:           form.agr,
          status:        form.status,
          origemManual:  true,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao salvar'); return }
      setAberto(false)
      router.refresh()
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
        <Plus className="w-3.5 h-3.5" /> Cadastrar Certificado
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Cadastrar Certificado Existente</h3>
              <button onClick={() => setAberto(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={salvar} className="p-5 space-y-4">

              {/* Modelo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Modelo *</label>
                <select value={form.modeloId} onChange={e => selecionarModelo(e.target.value)}
                  className={`${cls} bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white`} required>
                  <option value="">— Selecionar modelo —</option>
                  {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Data de Emissão *</label>
                  <input type="date" value={form.dataEmissao}
                    onChange={e => { set('dataEmissao', e.target.value); selecionarModelo(form.modeloId) }}
                    className={`${cls} dark:bg-slate-700 dark:border-slate-600 dark:text-white`} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Vencimento *</label>
                  <input type="date" value={form.dataVencimento} onChange={e => set('dataVencimento', e.target.value)}
                    className={`${cls} dark:bg-slate-700 dark:border-slate-600 dark:text-white`} required />
                </div>
              </div>

              {/* Valor + Protocolo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.valor} onChange={e => set('valor', e.target.value)}
                    placeholder="0,00"
                    className={`${cls} dark:bg-slate-700 dark:border-slate-600 dark:text-white`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Protocolo Safeweb</label>
                  <input type="text" value={form.protocolo} onChange={e => set('protocolo', e.target.value)}
                    placeholder="Ex: 1010564132"
                    className={`${cls} font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white`} />
                </div>
              </div>

              {/* AGR + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">AGR</label>
                  <select value={form.agr} onChange={e => set('agr', e.target.value)}
                    className={`${cls} bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white`}>
                    {AGR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value as typeof form.status)}
                    className={`${cls} bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white`}>
                    <option value="ATIVO">Ativo</option>
                    <option value="VENCIDO">Vencido</option>
                    <option value="RENOVADO">Renovado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {salvando ? 'Salvando...' : 'Salvar Certificado'}
                </button>
                <button type="button" onClick={() => setAberto(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
