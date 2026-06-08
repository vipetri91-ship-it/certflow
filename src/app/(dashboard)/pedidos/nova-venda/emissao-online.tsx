'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Search, CheckCircle2, Award, ChevronLeft, Globe, CreditCard, AlertTriangle,
} from 'lucide-react'

interface Modelo {
  id: string; nome: string; tipoPessoa: string; tipoCertificado: string
  suporte: string; validadeMeses: number; preco: number
}
interface Parceiro { id: string; nome: string; tipo: string }

interface Props {
  modelos: Modelo[]
  parceiros: Parceiro[]
  defaultAgr: string
  onVoltar: () => void
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
    nome:          get('Nome', 'NomeTitular', 'RazaoSocial', 'razaoSocial', 'nome'),
    cpf:           get('Cpf', 'CPF', 'cpf'),
    cnpj:          get('Cnpj', 'CNPJ', 'cnpj'),
    email:         get('Email', 'email'),
    dataNascimento: get('DataNascimento', 'dataNascimento'),
  }
}

const GRUPOS_ORDEM = [
  'A1 - Software', 'A3 - em Cartão', 'A3 - em Token',
  'A3 - Sem Mídia', 'A3 - Cartão + Leitora', 'A3 - em Nuvem',
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

const cls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"

export function EmissaoOnlineFluxo({ modelos, parceiros, defaultAgr, onVoltar }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<'validacao' | 'dados'>('validacao')

  // Etapa 1
  const [modeloId,         setModeloId]        = useState('')
  const [modeloNome,       setModeloNome]       = useState('')
  const [serie,            setSerie]            = useState('')
  const [validando,        setValidando]        = useState(false)
  const [erroValidacao,    setErroValidacao]    = useState('')

  // Etapa 2
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

  const gruposMap = modelos.reduce<Record<string, Modelo[]>>((acc, m) => {
    const key = getGrupo(m.nome)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})
  Object.values(gruposMap).forEach(items => items.sort((a, b) => a.validadeMeses - b.validadeMeses))
  const grupos = GRUPOS_ORDEM
    .filter(g => gruposMap[g])
    .map(g => [g, gruposMap[g]] as [string, Modelo[]])

  async function validar() {
    if (!modeloId) { setErroValidacao('Selecione o modelo do certificado'); return }
    if (!serie.trim()) { setErroValidacao('Informe o número de série do certificado A3 PF'); return }
    setValidando(true)
    setErroValidacao('')
    try {
      const res = await fetch(
        `/api/safeweb/validar-cert-online?serie=${encodeURIComponent(serie.trim())}&modeloId=${encodeURIComponent(modeloId)}`,
      )
      const data = await res.json()
      if (!res.ok) {
        setErroValidacao(data.erro ?? 'Erro ao validar certificado')
        return
      }
      const ext = extrairDados(data.dados ?? {})
      setNome(ext.nome)
      const docRaw = ext.cnpj || ext.cpf
      if (docRaw) {
        const digits = docRaw.replace(/\D/g,'')
        setDocumento(digits.length === 14 ? fmtCNPJ(digits) : fmtCPF(digits))
      }
      if (ext.email) setEmail(ext.email)
      const modelo = modelos.find(m => m.id === modeloId)
      if (modelo) setValorVenda(modelo.preco)
      setEtapa('dados')
    } catch {
      setErroValidacao('Erro de conexão')
    } finally {
      setValidando(false)
    }
  }

  async function gerarProtocolo() {
    if (!nome.trim()) { setErro('Nome ou Razão Social é obrigatório'); return }
    if (valorVenda <= 0) { setErro('Informe o valor da venda'); return }
    setLoading(true)
    setErro('')
    try {
      const docDigits = documento.replace(/\D/g,'')
      const isCnpj = docDigits.length === 14
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

  // ── Etapa 1: Validação ──────────────────────────────────────────────────────
  if (etapa === 'validacao') {
    return (
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Emissão Online — Passo 1 de 2</h2>
            <p className="text-sm text-gray-500">Selecione o modelo e informe o número de série do certificado A3 PF</p>
          </div>
        </div>

        {/* Modelos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Award className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Selecione o Modelo de Certificado</h3>
          </div>
          {grupos.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum modelo cadastrado.</p>
          )}
          {grupos.map(([grupo, items]) => (
            <div key={grupo}>
              <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase">{grupo}</p>
              </div>
              {items.map(m => (
                <label key={m.id}
                  className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition
                    ${modeloId === m.id ? 'bg-purple-50' : ''}`}>
                  <input type="radio" name="modelo-online" value={m.id} checked={modeloId === m.id}
                    onChange={() => { setModeloId(m.id); setModeloNome(m.nome) }}
                    className="accent-purple-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.nome}</p>
                    <p className="text-xs text-gray-400">
                      {m.tipoCertificado} · {m.tipoPessoa} · {m.validadeMeses} meses
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{fmt(m.preco)}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        {/* Número de série */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Número de Série do Certificado A3 PF
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            value={serie}
            onChange={e => setSerie(e.target.value)}
            placeholder="Ex: 55df7909752e10e7"
            className={cls + ' font-mono'}
            onKeyDown={e => e.key === 'Enter' && validar()}
          />
          <p className="text-xs text-gray-400">
            Certificado A3 PF (Safe ID em Nuvem) utilizado como chave de renovação
          </p>
        </div>

        {erroValidacao && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{erroValidacao}</span>
          </div>
        )}

        <div className="flex justify-between pb-6">
          <button onClick={onVoltar}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <button onClick={validar} disabled={validando || !modeloId || !serie.trim()}
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
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Certificado A3 PF Validado — Passo 2 de 2</h2>
          <p className="text-sm text-gray-500">Revise os dados e preencha as informações de pagamento</p>
        </div>
      </div>

      {/* Banner de validação */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-sm font-semibold text-green-800">Certificado validado com sucesso</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-green-700">
          <div><span className="text-green-600">Modelo:</span> <span className="font-medium">{modeloNome}</span></div>
          <div><span className="text-green-600">Série:</span> <span className="font-mono text-xs">{serie}</span></div>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <CreditCard className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">Dados da Renovação</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome / Razão Social <span className="text-red-500">*</span>
            </label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className={cls} placeholder="Nome completo ou Razão Social" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CPF ou CNPJ</label>
            <input
              value={documento}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g,'')
                setDocumento(digits.length > 11 ? fmtCNPJ(digits) : fmtCPF(digits))
              }}
              className={cls + ' font-mono'}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={cls} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Valor da Venda (R$) <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" min={0} value={valorVenda}
              onChange={e => setValorVenda(Number(e.target.value))} className={cls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
            <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
              className={cls + ' bg-white'}>
              {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Parceiro indicador</label>
            <select value={parceiroId} onChange={e => setParceiroId(e.target.value)}
              className={cls + ' bg-white'}>
              <option value="">Nenhum</option>
              {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">AGR</label>
            <select value={agr} onChange={e => setAgr(e.target.value)} className={cls + ' bg-white'}>
              {AGR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade de Atendimento</label>
            <select value={unidade} onChange={e => setUnidade(e.target.value)} className={cls + ' bg-white'}>
              <option value="">— Selecionar —</option>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1.5 text-sm">
        {[
          ['Modelo',     modeloNome],
          ['Cliente',    nome || '—'],
          ['Documento',  documento || '—'],
          ['AGR',        AGR_OPTIONS.find(a => a.value === agr)?.label ?? agr],
          ['Unidade',    unidade || '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-gray-500">{k}:</span>
            <span className="font-medium text-gray-800">{v}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
          <span>Total:</span>
          <span className="text-purple-700">{fmt(valorVenda)}</span>
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
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
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
