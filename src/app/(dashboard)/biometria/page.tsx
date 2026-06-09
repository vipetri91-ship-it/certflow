'use client'

import { Header } from '@/components/header'
import { useState } from 'react'
import { Fingerprint, Search, CheckCircle2, XCircle, Loader2, AlertCircle, MinusCircle } from 'lucide-react'

function fmtCpf(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`
}

interface ResultadoBio {
  validacao: boolean | null
  local:     boolean | null
  global:    boolean | null
  erros: { validacao: string | null; local: string | null; global: string | null }
}

function Cartao({ titulo, descricao, resultado, erro, loading }: {
  titulo: string; descricao: string
  resultado: boolean | null; erro: string | null; loading: boolean
}) {
  const idle = resultado === null && !loading

  const borda = loading ? 'border-gray-200 bg-white'
    : resultado === true  ? 'border-green-300 bg-green-50'
    : resultado === false ? 'border-red-300 bg-red-50'
    : 'border-gray-200 bg-white'

  const Icone = loading ? Loader2
    : resultado === true  ? CheckCircle2
    : resultado === false ? XCircle
    : MinusCircle

  const iconeCor = loading ? 'text-purple-500 animate-spin'
    : resultado === true  ? 'text-green-600'
    : resultado === false ? 'text-red-500'
    : 'text-gray-300'

  const label = loading ? 'Consultando...'
    : resultado === true  ? 'Encontrado'
    : resultado === false ? 'Não encontrado'
    : '—'

  const labelCor = loading ? 'text-purple-600'
    : resultado === true  ? 'text-green-700'
    : resultado === false ? 'text-red-600'
    : 'text-gray-400'

  return (
    <div className={`rounded-xl border-2 ${borda} p-5 flex flex-col items-center text-center gap-3 transition-all min-h-[160px] justify-center`}>
      <Icone className={`w-9 h-9 ${iconeCor}`} />
      <div>
        <p className="font-semibold text-gray-900 text-sm">{titulo}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{descricao}</p>
      </div>
      {!idle && <span className={`text-sm font-bold ${labelCor}`}>{label}</span>}
      {erro && <p className="text-xs text-red-600 mt-1 max-w-[180px]">{erro}</p>}
    </div>
  )
}

export default function BiometriaPage() {
  const [cpf, setCpf]          = useState('')
  const [loading, setLoading]  = useState(false)
  const [resultado, setResult] = useState<ResultadoBio | null>(null)
  const [erro, setErro]        = useState('')

  async function consultar() {
    const nums = cpf.replace(/\D/g, '')
    if (nums.length !== 11) { setErro('CPF inválido'); return }
    setLoading(true); setErro(''); setResult(null)
    try {
      const res  = await fetch('/api/biometria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: nums }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao consultar'); return }
      setResult(data)
    } catch { setErro('Erro de conexão') }
    finally   { setLoading(false) }
  }

  const cartoes = [
    {
      titulo:    'Validação Safeweb',
      descricao: 'Apto para emissão de 1ª via',
      resultado: resultado?.validacao ?? null,
      erro:      resultado?.erros.validacao ?? null,
    },
    {
      titulo:    'PSBio LOCAL',
      descricao: 'Biometria cadastrada na base Safeweb',
      resultado: resultado?.local ?? null,
      erro:      resultado?.erros.local ?? null,
    },
    {
      titulo:    'PSBio GLOBAL',
      descricao: 'Biometria cadastrada na rede PSBio',
      resultado: resultado?.global ?? null,
      erro:      resultado?.erros.global ?? null,
    },
  ]

  return (
    <div>
      <Header titulo="Consultar Biometria PSBio" />
      <div className="max-w-2xl mx-auto mt-8 px-4 space-y-6">

        {/* Card de entrada */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-purple-100">
              <Fingerprint className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Verificação Biométrica</h2>
              <p className="text-sm text-gray-500">Consulta ValidateBiometry, PSBio LOCAL e GLOBAL via Safeweb</p>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">CPF do titular</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={e => { setCpf(fmtCpf(e.target.value)); setResult(null); setErro('') }}
              onKeyDown={e => e.key === 'Enter' && consultar()}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={consultar}
            disabled={loading || cpf.replace(/\D/g,'').length !== 11}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Consultar Biometria
          </button>

          {erro && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{erro}
            </p>
          )}
        </div>

        {/* Resultados */}
        {(loading || resultado) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cartoes.map(c => (
              <Cartao key={c.titulo} {...c} loading={loading} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}