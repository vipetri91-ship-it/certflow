'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Search, CheckCircle2, ChevronLeft, Globe, CreditCard, AlertTriangle, Info,
} from 'lucide-react'
import { mergeDadosEmissaoOnline } from './lib/merge-dados-emissao-online'

interface Modelo {
  id: string; nome: string; tipoPessoa: string; tipoCertificado: string
  suporte: string; validadeMeses: number; preco: number
}
interface Parceiro { id: string; nome: string; tipo: string }

interface Props {
  modelos: Modelo[]
  parceiros: Parceiro[]
  defaultAgr: string
}

const AGR_OPTIONS = [
  { value: 'vinicius',     label: 'Vinicius' },
  { value: 'arlen',        label: 'Arlen' },
  { value: 'ana.karolina', label: 'Ana Karolina' },
  { value: 'laryssa',      label: 'Laryssa' },
]
const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Bonificado']
const UNIDADES = ['Piracaia', 'Bragança Paulista']

const fmt     = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtCPF  = (v: string) => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4').replace(/-$/,'')
const fmtCNPJ = (v: string) => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5').replace(/-$/,'')

function extrairDados(dados: Record<string, unknown>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (dados[k] != null && dados[k] !== '') return String(dados[k])
    }
    return ''
  }
  return {
    nome:  get('Nome', 'NomeTitular', 'RazaoSocial', 'razaoSocial', 'nome'),
    cpf:   get('Cpf', 'CPF', 'cpf'),
    cnpj:  get('Cnpj', 'CNPJ', 'cnpj'),
    email: get('Email', 'email'),
  }
}

const cls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"

export function EmissaoOnlineFluxo({ modelos, parceiros, defaultAgr }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<'validacao' | 'dados'>('validacao')

  // Etapa 1
  const [protocolo,     setProtocolo]     = useState('')
  const [serie,         setSerie]         = useState('')
  const [modeloId,      setModeloId]      = useState('')
  const [buscandoSerie, setBuscandoSerie] = useState(false)
  const [validando,     setValidando]     = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')

  // Etapa 2
  const [modeloNome,       setModeloNome]       = useState('')
  const [modeloPreco,      setModeloPreco]       = useState(0)
  const [nome,             setNome]             = useState('')
  const [documento,        setDocumento]        = useState('')
  const [email,            setEmail]            = useState('')
  const [valorVenda,       setValorVenda]       = useState(0)
  const [formaPagamento,   setFormaPagamento]   = useState('Pix')
  const [parceiroId,       setParceiroId]       = useState('')
  const [agr,              setAgr]              = useState(defaultAgr)
  const [unidade,          setUnidade]          = useState('')
  const [loading,          setLoading]          = useState(false)
  const [erro,             setErro]             = useState('')

  const modelosPF = modelos.filter(m => m.tipoPessoa === 'PF').sort((a, b) => a.validadeMeses - b.validadeMeses)
  const modelosPJ = modelos.filter(m => m.tipoPessoa === 'PJ').sort((a, b) => a.validadeMeses - b.validadeMeses)

  async function buscarSeriePorProtocolo(prot: string) {
    if (!prot.trim()) return
    setBuscandoSerie(true)
    try {
      const res = await fetch(`/api/pedidos/buscar-serie-a3?protocolo=${encodeURIComponent(prot.trim())}`)
      const data = await res.json()
      if (data.found && data.safewebSerieA3) setSerie(data.safewebSerieA3)
    } catch {}
    finally { setBuscandoSerie(false) }
  }

  async function validar() {
    if (!serie.trim()) { setErroValidacao('Informe o Nº de Série do certificado A3 PF'); return }
    if (!modeloId)     { setErroValidacao('Selecione o produto'); return }
    setValidando(true)
    setErroValidacao('')
    try {
      const res = await fetch(
        `/api/safeweb/validar-cert-online?serie=${encodeURIComponent(serie.trim())}&modeloId=${encodeURIComponent(modeloId)}`,
      )
      const data = await res.json()
      if (!res.ok) { setErroValidacao(data.erro ?? 'Erro ao validar certificado'); return }
      const ext = extrairDados(data.dados ?? {})
      const modelo = modelos.find(m => m.id === modeloId)
      setModeloNome(modelo?.nome ?? '')
      setModeloPreco(modelo?.preco ?? 0)
      setValorVenda(modelo?.preco ?? 0)
      const dadosCliente = mergeDadosEmissaoOnline(ext)
      setNome(dadosCliente.nome)
      setDocumento(dadosCliente.documento)
      setEmail(dadosCliente.email)
      setEtapa('dados')
    } catch {
      setErroValidacao('Erro de conexão')
    } finally {
      setValidando(false)
    }
  }

  async function gerarProtocolo() {
    if (!nome.trim())    { setErro('Nome ou Razão Social é obrigatório'); return }
    if (valorVenda <= 0) { setErro('Informe o valor da venda'); return }
    setLoading(true)
    setErro('')
    try {
      const docDigits = documento.replace(/\D/g,'')
      const isCnpj    = docDigits.length === 14
      const tipoPessoa = isCnpj ? 'PJ' : 'PF'

      const body = {
        clienteDados: {
          tipoPessoa,
          nome: nome.trim(),
          ...(isCnpj
            ? { cnpj: docDigits, razaoSocial: nome.trim() }
            : { cpf: docDigits }),
          email: email || undefined,
        },
        modeloId,
        agr,
        formaPagamento,
        tipoAtendimento:    'emissao-online',
        safewebSerieA3:     serie.trim(),
        unidadeAtendimento: unidade || undefined,
        parceiroId:         parceiroId || undefined,
        valorVenda,
        desconto:           0,
      }

      const res = await fetch('/api/pedidos/nova-venda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) { setErro(result.erro ?? 'Erro ao gerar protocolo'); return }
      router.push('/pedidos/monitoramento')
    } catch {
      setErro('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  // ── Etapa 1: Validação (estilo Controller) ──────────────────────────────────
  if (etapa === 'validacao') {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 pb-2">
          <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Emissão Online A3</h2>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-5">

          {/* Info */}
          <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>Se o certificado A3 PF foi feito por nós, informe o <strong>Protocolo</strong> que o sistema preencherá o Nº de Série automaticamente.</p>
              <p>Se foi feito fora, informe apenas o <strong>Nº de Série</strong>.</p>
            </div>
          </div>

          {/* Protocolo + Nº Série */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Protocolo</label>
              <input
                value={protocolo}
                onChange={e => setProtocolo(e.target.value)}
                onBlur={e => buscarSeriePorProtocolo(e.target.value)}
                placeholder="Ex: 1010564132"
                className={cls + ' font-mono'}
              />
              {buscandoSerie && <p className="text-xs text-gray-400 mt-1">Buscando série...</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Nº Série Certificado A3 PF <span className="text-red-500">*</span>
              </label>
              <input
                value={serie}
                onChange={e => setSerie(e.target.value)}
                placeholder="Ex: 55df7909752e10e7"
                className={cls + ' font-mono'}
              />
            </div>
          </div>

          {/* Produto */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Produto <span className="text-red-500">*</span>
            </label>
            <select
              value={modeloId}
              onChange={e => setModeloId(e.target.value)}
              className={cls + ' bg-white dark:bg-slate-700 dark:text-white'}
            >
              <option value="">— Selecionar produto —</option>
              {modelosPF.length > 0 && (
                <optgroup label="Pessoa Física">
                  {modelosPF.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} — {m.validadeMeses} meses — {fmt(m.preco)}
                    </option>
                  ))}
                </optgroup>
              )}
              {modelosPJ.length > 0 && (
                <optgroup label="Pessoa Jurídica">
                  {modelosPJ.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} — {m.validadeMeses} meses — {fmt(m.preco)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {erroValidacao && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erroValidacao}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between pb-6">
          <button onClick={() => router.push('/pedidos/nova-venda')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <button onClick={validar} disabled={validando || !serie.trim() || !modeloId}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
            {validando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {validando ? 'Validando...' : 'Validar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Etapa 2: Dados da renovação ─────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 pb-2">
        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Certificado validado</h2>
          <p className="text-xs text-gray-500">Preencha os dados de pagamento e finalize</p>
        </div>
      </div>

      {/* Banner validação */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-3 text-sm text-green-800 dark:text-green-300">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
        <div>
          <span className="font-medium">{modeloNome}</span>
          <span className="text-green-600 dark:text-green-400 ml-2 font-mono text-xs">{serie}</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
          <CreditCard className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dados da Renovação</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Nome / Razão Social <span className="text-red-500">*</span>
            </label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className={cls} placeholder="Nome completo ou Razão Social" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">CPF ou CNPJ</label>
            <input
              value={documento}
              onChange={e => {
                const d = e.target.value.replace(/\D/g,'')
                setDocumento(d.length > 11 ? fmtCNPJ(d) : fmtCPF(d))
              }}
              className={cls + ' font-mono'}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={cls} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Valor da Venda (R$) <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" min={0} value={valorVenda}
              onChange={e => setValorVenda(Number(e.target.value))} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Forma de Pagamento</label>
            <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
              className={cls + ' bg-white dark:bg-slate-700 dark:text-white'}>
              {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">AGR</label>
            <select value={agr} onChange={e => setAgr(e.target.value)}
              className={cls + ' bg-white dark:bg-slate-700 dark:text-white'}>
              {AGR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Parceiro indicador</label>
            <select value={parceiroId} onChange={e => setParceiroId(e.target.value)}
              className={cls + ' bg-white dark:bg-slate-700 dark:text-white'}>
              <option value="">Nenhum</option>
              {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Unidade de Atendimento</label>
            <select value={unidade} onChange={e => setUnidade(e.target.value)}
              className={cls + ' bg-white dark:bg-slate-700 dark:text-white'}>
              <option value="">— Selecionar —</option>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 text-sm space-y-1.5">
        {[
          ['Produto',   modeloNome],
          ['Cliente',   nome || '—'],
          ['Documento', documento || '—'],
          ['AGR',       AGR_OPTIONS.find(a => a.value === agr)?.label ?? agr],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-400">{k}:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{v}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-slate-700">
          <span>Total:</span>
          <span className="text-purple-700 dark:text-purple-400">{fmt(valorVenda)}</span>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      <div className="flex justify-between pb-6">
        <button onClick={() => setEtapa('validacao')}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <button onClick={gerarProtocolo} disabled={loading || !nome.trim() || valorVenda <= 0}
          className="flex items-center gap-2 px-8 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {loading ? 'Gerando...' : 'Gerar Protocolo'}
        </button>
      </div>
    </div>
  )
}
