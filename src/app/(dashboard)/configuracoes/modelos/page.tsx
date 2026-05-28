'use client'

import { Header } from '@/components/header'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

interface Modelo {
  id: string; nome: string; tipoPessoa: string; tipoCertificado: string
  suporte: string; validadeMeses: number; preco: number
  ativo: boolean; codigoSafeweb: string | null
}

const TIPOS_PESSOA = ['PF', 'PJ']
const TIPOS_CERT   = ['A1', 'A3']
const SUPORTES     = ['ARQUIVO', 'CARTAO', 'TOKEN', 'NUVEM']

// Ordem de exibição dos grupos
const GRUPO_ORDEM = [
  'A1 - Software',
  'A3 - em Cartão',
  'A3 - em Token',
  'A3 - Sem Mídia',
  'A3 - Cartão + Leitora',
  'A3 - em Nuvem',
]

function getGrupo(nome: string): string {
  if (nome.includes('A1'))               return 'A1 - Software'
  if (nome.includes('Cartão + Leitora')) return 'A3 - Cartão + Leitora'
  if (nome.includes('em Cartão'))        return 'A3 - em Cartão'
  if (nome.includes('em Token'))         return 'A3 - em Token'
  if (nome.includes('Sem Mídia'))        return 'A3 - Sem Mídia'
  if (nome.includes('em Nuvem'))         return 'A3 - em Nuvem'
  return 'Outros'
}

function ordenarModelos(lista: Modelo[]): Modelo[] {
  return [...lista].sort((a, b) => {
    const ga = GRUPO_ORDEM.indexOf(getGrupo(a.nome))
    const gb = GRUPO_ORDEM.indexOf(getGrupo(b.nome))
    if (ga !== gb) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb)
    return a.validadeMeses - b.validadeMeses
  })
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const NOVO_MODELO = (): Partial<Modelo> => ({
  nome: '', tipoPessoa: 'PJ', tipoCertificado: 'A3', suporte: 'TOKEN', validadeMeses: 12, preco: 0, codigoSafeweb: '',
})

export default function ModelosPage() {
  const [modelos,   setModelos]   = useState<Modelo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando,  setEditando]  = useState<Partial<Modelo> | null>(null)
  const [isNovo,    setIsNovo]    = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [erro,      setErro]      = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const res = await fetch('/api/configuracoes/modelos')
    const data = await res.json()
    setModelos(data.modelos ?? [])
    setCarregando(false)
  }

  function abrirNovo() {
    setEditando(NOVO_MODELO())
    setIsNovo(true)
    setErro('')
  }

  function abrirEditar(m: Modelo) {
    setEditando({ ...m })
    setIsNovo(false)
    setErro('')
  }

  function cancelar() { setEditando(null); setIsNovo(false); setErro('') }

  async function salvar() {
    if (!editando?.nome || !editando.preco === undefined) return
    setSalvando(true); setErro('')
    try {
      const url    = isNovo ? '/api/configuracoes/modelos' : `/api/configuracoes/modelos/${editando.id}`
      const method = isNovo ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando),
      })
      if (!res.ok) { const d = await res.json(); setErro(d.erro ?? 'Erro ao salvar'); return }
      await carregar()
      cancelar()
    } finally { setSalvando(false) }
  }

  async function toggleAtivo(m: Modelo) {
    await fetch(`/api/configuracoes/modelos/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !m.ativo }),
    })
    setModelos(prev => prev.map(x => x.id === m.id ? { ...x, ativo: !x.ativo } : x))
  }

  async function deletar(id: string) {
    if (!confirm('Deletar este modelo? Pedidos existentes não serão afetados.')) return
    setDeletando(id)
    await fetch(`/api/configuracoes/modelos/${id}`, { method: 'DELETE' })
    setModelos(prev => prev.filter(m => m.id !== id))
    setDeletando(null)
  }

  // Agrupa por tipoPessoa e ordena internamente
  const pj = ordenarModelos(modelos.filter(m => m.tipoPessoa === 'PJ'))
  const pf = ordenarModelos(modelos.filter(m => m.tipoPessoa === 'PF'))

  return (
    <div>
      <Header titulo="Modelos de Certificado" />
      <div className="p-4 lg:p-6 space-y-5 max-w-5xl">

        {/* Modal de criação/edição */}
        {editando && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                {isNovo ? 'Novo Modelo' : 'Editar Modelo'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome *</label>
                  <input value={editando.nome ?? ''}
                    onChange={e => setEditando(p => ({ ...p, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: E-CNPJ A3 em Token - 12 Meses" />
                </div>

                {[
                  { label: 'Tipo Pessoa', field: 'tipoPessoa', options: TIPOS_PESSOA },
                  { label: 'Tipo Certificado', field: 'tipoCertificado', options: TIPOS_CERT },
                ].map(({ label, field, options }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
                    <select value={(editando as Record<string, string>)[field] ?? ''}
                      onChange={e => setEditando(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Suporte</label>
                  <select value={editando.suporte ?? ''}
                    onChange={e => setEditando(p => ({ ...p, suporte: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {SUPORTES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Validade (meses)</label>
                  <input type="number" min={1} value={editando.validadeMeses ?? 12}
                    onChange={e => setEditando(p => ({ ...p, validadeMeses: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Preço (R$) *</label>
                  <input type="number" step="0.01" min={0} value={editando.preco ?? 0}
                    onChange={e => setEditando(p => ({ ...p, preco: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Código Safeweb</label>
                  <input value={editando.codigoSafeweb ?? ''}
                    onChange={e => setEditando(p => ({ ...p, codigoSafeweb: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opcional" />
                </div>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={salvar} disabled={salvando || !editando.nome}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={cancelar}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botão novo */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">{modelos.length} modelos cadastrados</p>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Novo Modelo
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          [{ label: 'E-CNPJ — Pessoa Jurídica', items: pj }, { label: 'E-CPF — Pessoa Física', items: pf }].map(({ label, items }) => (
            items.length > 0 && (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        {['Nome', 'Tipo', 'Validade', 'Preço', 'Status', ''].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                      {items.map(m => (
                        <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 transition ${!m.ativo ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.nome}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                            {m.tipoCertificado} · {m.suporte}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{m.validadeMeses} meses</td>
                          <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-400">{fmt(m.preco)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleAtivo(m)} title={m.ativo ? 'Desativar' : 'Ativar'}
                              className="flex items-center gap-1 text-xs font-medium transition">
                              {m.ativo
                                ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600 dark:text-green-400">Ativo</span></>
                                : <><ToggleLeft  className="w-5 h-5 text-gray-400"  /><span className="text-gray-400">Inativo</span></>}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => abrirEditar(m)} title="Editar"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-blue-600 transition">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deletar(m.id)} title="Deletar" disabled={deletando === m.id}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition disabled:opacity-50">
                                {deletando === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  )
}
