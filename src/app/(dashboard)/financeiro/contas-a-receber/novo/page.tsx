'use client'

import { Header } from '@/components/header'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import {
  TIPOS_CONTA_RECEBER, CENTROS_CUSTO, FORMAS_PAGAMENTO, BANCOS,
} from '@/lib/financeiro-config'

interface Categoria { id: string; nome: string; cor: string }
interface Parceiro  { id: string; nome: string }
interface PedidoBusca {
  id: string
  numero: string
  valorFinal: number
  cliente: { nome: string }
}

async function uploadArquivo(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Erro no upload')
  const { url } = await res.json()
  return url
}

export default function NovaContaReceberPage() {
  const router = useRouter()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [parceiros,  setParceiros]  = useState<Parceiro[]>([])
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')

  // Form state
  const [tipoConta,      setTipoConta]      = useState('Certificado')
  const [parceiroId,     setParceiroId]     = useState('')
  const [categoriaId,    setCategoriaId]    = useState('')
  const [centroCusto,    setCentroCusto]    = useState('')
  const [valor,          setValor]          = useState('')
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10))
  const [descricao,      setDescricao]      = useState('')
  const [referencia,     setReferencia]     = useState('')
  const [recebido,       setRecebido]       = useState('Não')
  const [dataPagamento,  setDataPagamento]  = useState(new Date().toISOString().slice(0, 10))
  const [formaPagamento, setFormaPagamento] = useState('')
  const [banco,          setBanco]          = useState('')

  const [fileNotaFiscal,  setFileNotaFiscal]  = useState<File | null>(null)
  const [fileComprovante, setFileComprovante] = useState<File | null>(null)

  // Vínculo opcional com Pedido (cobrança antes da emissão do certificado)
  const [pedidoBusca,       setPedidoBusca]       = useState('')
  const [pedidoResultados,  setPedidoResultados]  = useState<PedidoBusca[]>([])
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoBusca | null>(null)
  const [buscandoPedido,    setBuscandoPedido]    = useState(false)

  useEffect(() => {
    fetch('/api/financeiro/categorias').then(r => r.json()).then(d => setCategorias(d.categorias ?? []))
    fetch('/api/parceiros').then(r => r.json()).then(d => setParceiros(d.parceiros ?? d ?? []))
  }, [])

  useEffect(() => {
    if (pedidoSelecionado || pedidoBusca.trim().length < 2) { setPedidoResultados([]); return }
    const timer = setTimeout(() => {
      setBuscandoPedido(true)
      fetch(`/api/pedidos?q=${encodeURIComponent(pedidoBusca.trim())}&limit=8`)
        .then(r => r.json())
        .then(d => setPedidoResultados(d.pedidos ?? []))
        .finally(() => setBuscandoPedido(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [pedidoBusca, pedidoSelecionado])

  function selecionarPedido(p: PedidoBusca) {
    setPedidoSelecionado(p)
    setPedidoBusca('')
    setPedidoResultados([])
    if (!valor) setValor(String(p.valorFinal))
    if (!descricao) setDescricao(`${p.cliente.nome} — Pedido ${p.numero}`)
    if (!referencia) setReferencia(p.numero)
    // Cobrança antecipada: vencimento padrão de 3 dias (ajustável)
    const em3dias = new Date()
    em3dias.setDate(em3dias.getDate() + 3)
    setDataVencimento(em3dias.toISOString().slice(0, 10))
  }

  function removerPedidoVinculado() {
    setPedidoSelecionado(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!valor || Number(valor) <= 0) { setErro('Informe um valor válido'); return }
    setSalvando(true)
    try {
      const [urlNF, urlComp] = await Promise.all([
        fileNotaFiscal  ? uploadArquivo(fileNotaFiscal)  : Promise.resolve(undefined),
        fileComprovante ? uploadArquivo(fileComprovante) : Promise.resolve(undefined),
      ])

      const res = await fetch('/api/financeiro/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo:          'RECEBER',
          descricao:     descricao || referencia || 'Conta a Receber',
          valor:         Number(valor),
          dataVencimento,
          dataPagamento: recebido === 'Sim' ? dataPagamento : undefined,
          status:        recebido === 'Sim' ? 'PAGO' : 'PENDENTE',
          categoriaId:   categoriaId  || undefined,
          parceiroId:    parceiroId   || undefined,
          pedidoId:      pedidoSelecionado?.id || undefined,
          centroCusto:   centroCusto  || undefined,
          tipoConta:     tipoConta    || undefined,
          referencia:    referencia   || undefined,
          formaPagamento: recebido === 'Sim' ? formaPagamento || undefined : undefined,
          banco:          recebido === 'Sim' ? banco          || undefined : undefined,
          notaFiscal:     urlNF,
          comprovante:    urlComp,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setErro(err.erro ?? 'Erro ao salvar')
        return
      }
      router.push('/financeiro/contas-a-receber')
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <Header titulo="Nova Conta a Receber" />
      <div className="p-4 lg:p-6 max-w-3xl">

        <Link href="/financeiro/contas-a-receber"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Vínculo com Pedido — para cobrança antes da emissão do certificado */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Vincular a um Pedido (opcional)</h2>
            <p className="text-xs text-gray-500">
              Use quando precisar cobrar o cliente antes da emissão do certificado.
              Ao emitir o certificado depois, o sistema não duplica este lançamento.
            </p>

            {pedidoSelecionado ? (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-sm text-blue-800">
                  Pedido <strong>{pedidoSelecionado.numero}</strong> — {pedidoSelecionado.cliente.nome}
                </span>
                <button type="button" onClick={removerPedidoVinculado}
                  className="text-xs text-blue-700 hover:text-blue-900 underline">
                  Remover
                </button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={pedidoBusca} onChange={e => setPedidoBusca(e.target.value)}
                  placeholder="Buscar pedido por número ou nome do cliente..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {buscandoPedido && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
                {pedidoResultados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {pedidoResultados.map(p => (
                      <button key={p.id} type="button" onClick={() => selecionarPedido(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                        <span className="font-medium">{p.numero}</span> — {p.cliente.nome}
                        <span className="text-gray-400"> · R$ {Number(p.valorFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Identificação */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Identificação</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipo de Conta */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Conta</label>
                <select value={tipoConta} onChange={e => setTipoConta(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Selecionar —</option>
                  {TIPOS_CONTA_RECEBER.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Parceiro */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Parceiro / Contabilidade</label>
                <select value={parceiroId} onChange={e => setParceiroId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Selecionar —</option>
                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* Plano de Contas */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plano de Contas</label>
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
            </div>

            {/* Valor + Vencimento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" min="0" required value={valor} onChange={e => setValor(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data de Vencimento *</label>
                <input type="date" required value={dataVencimento} onChange={e => setDataVencimento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Nota Fiscal */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota Fiscal (opcional)</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 transition">
                <Upload className="w-4 h-4 text-gray-400" />
                {fileNotaFiscal ? fileNotaFiscal.name : 'Escolher arquivo'}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setFileNotaFiscal(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          {/* Detalhes */}
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
                placeholder="Ex: Pedido #PED-202601-12345"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Recebido */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Recebimento</h2>
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium text-gray-600">Já recebido?</label>
              {['Não', 'Sim'].map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="recebido" value={v} checked={recebido === v} onChange={() => setRecebido(v)}
                    className="accent-blue-600" />
                  <span className="text-sm text-gray-700">{v}</span>
                </label>
              ))}
            </div>

            {recebido === 'Sim' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data do Recebimento</label>
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
            )}
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{erro}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={salvando}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <Link href="/financeiro/contas-a-receber"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
              Voltar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
