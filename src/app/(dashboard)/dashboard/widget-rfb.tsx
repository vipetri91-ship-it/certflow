'use client'

import { useState } from 'react'
import { Search, CheckCircle, XCircle, Loader2, ShieldCheck, X } from 'lucide-react'

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
  const [cnpj,      setCnpj]      = useState('')
  const [cpf,       setCpf]       = useState('')
  const [dataNasc,  setDataNasc]  = useState('')
  const [loading,   setLoading]   = useState(false)
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

  function fechar() { setResultado(null) }
  function limpar() { setCnpj(''); setCpf(''); setDataNasc(''); setResultado(null) }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden" style={{ height: '100%' }}>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Responsável RFB</p>
        </div>

        {/* Form */}
        <form onSubmit={consultar} className="flex-1 flex flex-col gap-2 min-h-0">
          <input value={cnpj} onChange={e => setCnpj(mascaraCNPJ(e.target.value))}
            placeholder="CNPJ da empresa" className={inp} required />
          <input value={cpf} onChange={e => setCpf(mascaraCPF(e.target.value))}
            placeholder="CPF do responsável" className={inp} required />
          <input value={dataNasc} onChange={e => setDataNasc(mascaraData(e.target.value))}
            placeholder="Data de nascimento (DD/MM/AAAA)" className={inp} required />
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando...</>
              : <><Search className="w-4 h-4" /> Consultar</>}
          </button>
        </form>
      </div>

      {/* Modal de resultado */}
      {resultado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fechar}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Faixa colorida */}
            <div className={`px-6 py-5 ${resultado.permitido ? 'bg-green-500' : 'bg-red-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {resultado.permitido
                    ? <CheckCircle className="w-7 h-7 text-white" />
                    : <XCircle    className="w-7 h-7 text-white" />}
                  <div>
                    <p className="text-white font-bold text-lg leading-tight">
                      {resultado.permitido ? 'Emissão permitida!' : 'Não autorizado'}
                    </p>
                    <p className="text-white/80 text-xs mt-0.5">
                      Consulta Receita Federal
                    </p>
                  </div>
                </div>
                <button onClick={fechar} className="p-1.5 rounded-lg hover:bg-white/20 transition">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Dados */}
            <div className="px-6 py-5 space-y-3">
              {resultado.nome && (
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Responsável</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{resultado.nome}</p>
                </div>
              )}
              {resultado.empresa && (
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Empresa</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{resultado.empresa}</p>
                </div>
              )}
              {resultado.cargo && (
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Qualificação</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{resultado.cargo}</p>
                </div>
              )}
              {resultado.erro && (
                <p className="text-sm text-gray-600 dark:text-slate-400">{resultado.erro}</p>
              )}
            </div>

            {/* Rodapé */}
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={fechar}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                Fechar
              </button>
              <button onClick={limpar}
                className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                Nova Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}