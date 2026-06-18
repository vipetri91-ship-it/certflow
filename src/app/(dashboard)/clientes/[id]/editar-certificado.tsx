'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Save, Loader2 } from 'lucide-react'

interface Modelo { id: string; nome: string }

interface CertParaEditar {
  id: string
  modeloId: string
  dataEmissao: string
  dataVencimento: string
  numeroSerie: string | null
  valorManual: number | null
}

interface Props {
  cert:    CertParaEditar
  modelos: Modelo[]
}

const cls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

export function EditarCertificado({ cert, modelos }: Props) {
  const router  = useRouter()
  const [aberto,  setAberto]  = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro,    setErro]    = useState('')

  const [form, setForm] = useState({
    modeloId:       cert.modeloId,
    dataEmissao:    cert.dataEmissao.slice(0, 10),
    dataVencimento: cert.dataVencimento.slice(0, 10),
    valor:          cert.valorManual !== null ? String(cert.valorManual) : '',
    protocolo:      cert.numeroSerie ?? '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch(`/api/certificados/${cert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modeloId:       form.modeloId,
          dataEmissao:    form.dataEmissao,
          dataVencimento: form.dataVencimento,
          numeroSerie:    form.protocolo || null,
          valorFinal:     form.valor ? Number(form.valor) : null,
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
        className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition"
        title="Editar certificado">
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Editar Certificado</h3>
              <button onClick={() => setAberto(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvar} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Modelo *</label>
                <select value={form.modeloId} onChange={e => set('modeloId', e.target.value)}
                  className={`${cls} bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white`} required>
                  {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Data de Emissão *</label>
                  <input type="date" value={form.dataEmissao} onChange={e => set('dataEmissao', e.target.value)}
                    className={`${cls} dark:bg-slate-700 dark:border-slate-600 dark:text-white`} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Vencimento *</label>
                  <input type="date" value={form.dataVencimento} onChange={e => set('dataVencimento', e.target.value)}
                    className={`${cls} dark:bg-slate-700 dark:border-slate-600 dark:text-white`} required />
                </div>
              </div>

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

              {erro && <p className="text-sm rounded-lg px-3 py-2 text-red-600 bg-red-50">{erro}</p>}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button type="button" onClick={() => setAberto(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
