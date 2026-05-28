'use client'

import { Header } from '@/components/header'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { formatarMoeda } from '@/lib/utils'
import {
  TIPOS_CONTA_PAGAR, CENTROS_CUSTO, FORMAS_PAGAMENTO, BANCOS,
} from '@/lib/financeiro-config'

interface Categoria  { id: string; nome: string; cor: string; tipo: string }
interface Fornecedor { id: string; nome: string }

// ─── Helpers ────────────────────────────────────────────────────────────────

async function uploadArquivo(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Erro no upload')
  const { url } = await res.json()
  return url
}

function calcularParcelas(total: number, n: number): number[] {
  const cent = Math.round(total * 100)
  const base = Math.floor(cent / n)
  const resto = cent - base * (n - 1)
  return [...Array(n - 1).fill(base / 100), resto / 100]
}

function addMeses(dataIso: string, meses: number): string {
  const d = new Date(dataIso + 'T00:00:00')
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().slice(0, 10)
}

function fmtData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function NovaCongasPagarPage() {
  const router = useRouter()

  const [categorias,   setCategorias]   = useState<Categoria[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [salvando,     setSalvando]     = useState(false)
  const [erro,         setErro]         = useState('')

  // ── Form principal ──────────────────────────────────────────────────────
  const [fornecedorId,   setFornecedorId]   = useState('')
  const [categoriaId,    setCategoriaId]    = useState('')
  const [centroCusto,    setCentroCusto]    = useState('')
  const [tipoConta,      setTipoConta]      = useState('')
  const [valor,          setValor]          = useState('')
  const [nParcelas,      setNParcelas]      = useState(2)
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10))
  const [descricao,      setDescricao]      = useState('')
  const [referencia,     setReferencia]     = useState('')
  const [quitado,        setQuitado]        = useState('Não')
  const [dataPagamento,  setDataPagamento]  = useState(new Date().toISOString().slice(0, 10))
  const [formaPagamento, setFormaPagamento] = useState('')
  const [banco,          setBanco]          = useState('')

  const [fileBoleto,      setFileBoleto]      = useState<File | null>(null)
  const [fileNotaFiscal,  setFileNotaFiscal]  = useState<File | null>(null)
  const [fileComprovante, setFileComprovante] = useState<File | null>(null)

  // ── Modal: novo fornecedor ───────────────────────────────────────────────
  const [showModalFornecedor,  setShowModalFornecedor]  = useState(false)
  const [novoFornNome,         setNovoFornNome]         = useState('')
  const [novoFornCnpj,         setNovoFornCnpj]         = useState('')
  const [salvandoFornecedor,   setSalvandoFornecedor]   = useState(false)

  // ── Modal: nova categoria (plano de contas) ──────────────────────────────
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [novaCatNome,        setNovaCatNome]        = useState('')
  const [novaCatTipo,        setNovaCatTipo]        = useState<'DESPESA' | 'RECEITA'>('DESPESA')
  const [novaCatCor,         setNovaCatCor]         = useState('#6b7280')
  const [salvandoCategoria,  setSalvandoCategoria]  = useState(false)

  useEffect(() => {
    fetch('/api/financeiro/categorias').then(r => r.json()).then(d => setCategorias(d.categorias ?? []))
    fetch('/api/parceiros?tipo=Fornecedor').then(r => r.json()).then(d => setFornecedores(d.parceiros ?? d ?? []))
  }, [])

  // ── Preview de parcelas ──────────────────────────────────────────────────
  const previewParcelas = useMemo(() => {
    if (tipoConta !== 'Parcelada' || !valor || Number(valor) <= 0 || nParcelas < 2) return []
    const valores = calcularParcelas(Number(valor), nParcelas)
    return valores.map((v, i) => ({
      num:  i + 1,
      data: addMeses(dataVencimento, i),
      valor: v,
    }))
  }, [tipoConta, valor, nParcelas, dataVencimento])

  // ── Criar fornecedor ─────────────────────────────────────────────────────
  async function criarFornecedor() {
    if (!novoFornNome.trim()) return
    setSalvandoFornecedor(true)
    try {
      const res = await fetch('/api/parceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoPessoa: 'PJ', nome: novoFornNome, cnpj: novoFornCnpj || undefined, tipo: 'Fornecedor' }),
      })
      if (res.ok) {
        const novo = await res.json()
        setFornecedores(prev => [...prev, { id: novo.id, nome: novo.nome }])
        setFornecedorId(novo.id)
        setNovoFornNome('')
        setNovoFornCnpj('')
        setShowModalFornecedor(false)
      }
    } finally { setSalvandoFornecedor(false) }
  }

  // ── Criar categoria ──────────────────────────────────────────────────────
  async function criarCategoria() {
    if (!novaCatNome.trim()) return
    setSalvandoCategoria(true)
    try {
      const res = await fetch('/api/financeiro/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaCatNome, tipo: novaCatTipo, cor: novaCatCor }),
      })
      if (res.ok) {
        const nova = await res.json()
        setCategorias(prev => [...prev, nova])
        setCategoriaId(nova.id)
        setNovaCatNome('')
        setShowModalCategoria(false)
      }
    } finally { setSalvandoCategoria(false) }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!valor || Number(valor) <= 0) { setErro('Informe um valor válido'); return }
    if (tipoConta === 'Parcelada' && nParcelas < 2) { setErro('Informe pelo menos 2 parcelas'); return }

    setSalvando(true)
    try {
      const [urlBoleto, urlNF, urlComp] = await Promise.all([
        fileBoleto      ? uploadArquivo(fileBoleto)      : Promise.resolve(undefined),
        fileNotaFiscal  ? uploadArquivo(fileNotaFiscal)  : Promise.resolve(undefined),
        fileComprovante ? uploadArquivo(fileComprovante) : Promise.resolve(undefined),
      ])

      const descBase = descricao || fornecedores.find(f => f.id === fornecedorId)?.nome || 'Conta a Pagar'
      const dadosComuns = {
        tipo:          'PAGAR',
        categoriaId:   categoriaId  || undefined,
        parceiroId:    fornecedorId || undefined,
        centroCusto:   centroCusto  || undefined,
        tipoConta:     tipoConta    || undefined,
        referencia:    referencia   || undefined,
        formaPagamento: quitado === 'Sim' ? formaPagamento || undefined : undefined,
        banco:          quitado === 'Sim' ? banco          || undefined : undefined,
        boleto:     urlBoleto,
        notaFiscal: urlNF,
        comprovante: urlComp,
      }

      if (tipoConta === 'Parcelada' && previewParcelas.length >= 2) {
        // Cria uma lançamento por parcela
        for (const parcela of previewParcelas) {
          const res = await fetch('/api/financeiro/lancamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...dadosComuns,
              descricao:      `${descBase} - Parcela ${parcela.num}/${previewParcelas.length}`,
              valor:          parcela.valor,
              dataVencimento: parcela.data,
              dataPagamento:  quitado === 'Sim' ? dataPagamento : undefined,
              status:         quitado === 'Sim' ? 'PAGO' : 'PENDENTE',
            }),
          })
          if (!res.ok) {
            const err = await res.json()
            setErro(`Erro na parcela ${parcela.num}: ${err.erro ?? 'Falha'}`)
            return
          }
        }
      } else {
        const res = await fetch('/api/financeiro/lancamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...dadosComuns,
            descricao:      descBase,
            valor:          Number(valor),
            dataVencimento,
            dataPagamento:  quitado === 'Sim' ? dataPagamento : undefined,
            status:         quitado === 'Sim' ? 'PAGO' : 'PENDENTE',
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          setErro(err.erro ?? 'Erro ao salvar')
          return
        }
      }

      router.push('/financeiro/contas-a-pagar')
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <Header titulo="Nova Conta a Pagar" />
      <div className="p-4 lg:p-6 max-w-3xl">

        <Link href="/financeiro/contas-a-pagar"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Identificação ───────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Identificação</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Fornecedor */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fornecedor
                  <button type="button" onClick={() => setShowModalFornecedor(true)}
                    className="ml-2 text-blue-600 hover:text-blue-800 font-bold" title="Cadastrar fornecedor">
                    <Plus className="w-3.5 h-3.5 inline" />
                  </button>
                </label>
                <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Selecionar —</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>

              {/* Plano de Contas */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Plano de Contas
                  <button type="button" onClick={() => setShowModalCategoria(true)}
                    className="ml-2 text-blue-600 hover:text-blue-800 font-bold" title="Cadastrar plano de contas">
                    <Plus className="w-3.5 h-3.5 inline" />
                  </button>
                </label>
                <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Selecionar —</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Centro de Custo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Centro de Custo</label>
                <select value={centroCusto} onChange={e => setCentroCusto(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Selecionar —</option>
                  {CENTROS_CUSTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tipo de Conta */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Conta</label>
                <select value={tipoConta} onChange={e => setTipoConta(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Selecionar —</option>
                  {TIPOS_CONTA_PAGAR.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Valor + Vencimento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor Total (R$) *</label>
                <input type="number" step="0.01" min="0" required value={valor} onChange={e => setValor(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {tipoConta === 'Parcelada' ? 'Vencimento 1ª Parcela *' : 'Data de Vencimento *'}
                </label>
                <input type="date" required value={dataVencimento} onChange={e => setDataVencimento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Nº de Parcelas — só quando Parcelada */}
            {tipoConta === 'Parcelada' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número de Parcelas *</label>
                <input type="number" min="2" max="60" value={nParcelas}
                  onChange={e => setNParcelas(Math.max(2, Number(e.target.value)))}
                  className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {/* Preview de parcelas */}
            {previewParcelas.length >= 2 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                <p className="text-xs font-semibold text-blue-700 px-4 py-2 border-b border-blue-100">
                  Preview — {previewParcelas.length} parcelas serão criadas
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-blue-600">
                        <th className="text-left px-4 py-2 font-medium">Parcela</th>
                        <th className="text-left px-4 py-2 font-medium">Vencimento</th>
                        <th className="text-right px-4 py-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewParcelas.map(p => (
                        <tr key={p.num} className="border-t border-blue-100">
                          <td className="px-4 py-1.5 text-gray-700 font-medium">{p.num}/{previewParcelas.length}</td>
                          <td className="px-4 py-1.5 text-gray-600">{fmtData(p.data)}</td>
                          <td className="px-4 py-1.5 text-right font-semibold text-red-600">{formatarMoeda(p.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Boleto upload */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Boleto (opcional)</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 transition">
                <Upload className="w-4 h-4 text-gray-400" />
                {fileBoleto ? fileBoleto.name : 'Escolher arquivo'}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setFileBoleto(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          {/* ── Detalhes ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Detalhes</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Referência</label>
              <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                placeholder="Ex: Combustível Jan/2026"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nota Fiscal</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 transition">
                  <Upload className="w-4 h-4 text-gray-400" />
                  {fileNotaFiscal ? fileNotaFiscal.name : 'Escolher arquivo'}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setFileNotaFiscal(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Comprovante de Pagamento</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 transition">
                  <Upload className="w-4 h-4 text-gray-400" />
                  {fileComprovante ? fileComprovante.name : 'Escolher arquivo'}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setFileComprovante(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>

          {/* ── Pagamento ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Pagamento</h2>
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium text-gray-600">Quitado?</label>
              {['Não', 'Sim'].map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="quitado" value={v} checked={quitado === v} onChange={() => setQuitado(v)}
                    className="accent-blue-600" />
                  <span className="text-sm text-gray-700">{v}</span>
                </label>
              ))}
            </div>
            {quitado === 'Sim' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data da Quitação</label>
                  <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
                  <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Selecionar —</option>
                    {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                  <select value={banco} onChange={e => setBanco(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Selecionar —</option>
                    {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{erro}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={salvando}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando
                ? 'Salvando...'
                : tipoConta === 'Parcelada' && previewParcelas.length >= 2
                  ? `Salvar ${previewParcelas.length} parcelas`
                  : 'Salvar'}
            </button>
            <Link href="/financeiro/contas-a-pagar"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
              Voltar
            </Link>
          </div>
        </form>
      </div>

      {/* ── Modal: Novo Fornecedor ─────────────────────────────────────────── */}
      {showModalFornecedor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Novo Fornecedor</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input type="text" value={novoFornNome} onChange={e => setNovoFornNome(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Razão Social / Nome" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ / CPF (opcional)</label>
              <input type="text" value={novoFornCnpj} onChange={e => setNovoFornCnpj(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00.000.000/0000-00" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={criarFornecedor} disabled={salvandoFornecedor || !novoFornNome}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {salvandoFornecedor ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button onClick={() => setShowModalFornecedor(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Plano de Contas ────────────────────────────────────── */}
      {showModalCategoria && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Novo Plano de Contas</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input type="text" value={novaCatNome} onChange={e => setNovaCatNome(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Manutenção, Combustível..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={novaCatTipo} onChange={e => setNovaCatTipo(e.target.value as 'DESPESA' | 'RECEITA')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cor</label>
                <input type="color" value={novaCatCor} onChange={e => setNovaCatCor(e.target.value)}
                  className="w-full h-9 border border-gray-200 rounded-lg px-1 py-1 cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={criarCategoria} disabled={salvandoCategoria || !novaCatNome}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                {salvandoCategoria ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button onClick={() => setShowModalCategoria(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
