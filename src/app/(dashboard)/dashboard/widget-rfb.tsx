'use client'

import { useState } from 'react'
import { Search, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react'

type Resultado = {
  nome?:     string
  empresa?:  string
  cargo?:    string
  erro?:     string
  permitido: boolean
}

function mascaraCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function mascaraCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

function mascaraData(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
}

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-slate-500'

export function WidgetRFB() {
  const [cnpj,    setCnpj]    = useState('')
  const [cpf,     setCpf]     = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function consultar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResultado(null)
    try {
      const res = await fetch('/api/rfb/responsavel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj, cpf, dataNascimento: dataNasc }),
      })
      setResultado(await res.json())
    } catch {
      setResultado({ permitido: false, erro: 'Erro de conexão' })
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setCnpj(''); setCpf(''); setDataNasc(''); setResultado(null)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Responsável RFB</p>
        </div>
        {resultado && (
          <button onClick={limpar} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition">
            Limpar
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={consultar} className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
        <input
          value={cnpj}
          onChange={e => setCnpj(mascaraCNPJ(e.target.value))}
          placeholder="CNPJ da empresa"
          className={inp}
          required
        />
        <input
          value={cpf}
          onChange={e => setCpf(mascaraCPF(e.target.value))}
          placeholder="CPF do responsável"
          className={inp}
          required
        />
        <input
          value={dataNasc}
          onChange={e => setDataNasc(mascaraData(e.target.value))}
          placeholder="Data de nascimento (DD/MM/AAAA)"
          className={inp}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando RFB...</>
            : <><Search className="w-4 h-4" /> Consultar</>}
        </button>

        {/* Resultado */}
        {resultado && (
          <div className={`rounded-xl p-3 text-sm shrink-0 ${
            resultado.permitido
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className={`flex items-center gap-2 font-semibold mb-1.5 ${resultado.permitido ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {resultado.permitido
                ? <CheckCircle className="w-4 h-4" />
                : <XCircle className="w-4 h-4" />}
              {resultado.permitido ? 'Emissão permitida!' : 'Não autorizado'}
            </div>
            {resultado.nome    && <p className="text-xs text-gray-700 dark:text-slate-300">Nome: <strong>{resultado.nome}</strong></p>}
            {resultado.empresa && <p className="text-xs text-gray-700 dark:text-slate-300">Empresa: <strong>{resultado.empresa}</strong></p>}
            {resultado.cargo   && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{resultado.cargo}</p>}
            {resultado.erro    && <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">{resultado.erro}</p>}
          </div>
        )}
      </form>
    </div>
  )
}