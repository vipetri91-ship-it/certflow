'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/header'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft, FlaskConical } from 'lucide-react'
import Link from 'next/link'

interface Resultado {
  total:        number
  importados:   number
  pulados:      number
  totalGrupos?: number
  grupos?:      string[]
  erros:        string[]
  simulacao?:   boolean
  amostra?:     { nome: string; tipoPessoa: string; grupo?: string; cpf?: string; cnpj?: string; email?: string; cidade?: string }[]
}

export default function ImportarClientesPage() {
  const [arquivo,    setArquivo]    = useState<File | null>(null)
  const [simulacao,  setSimulacao]  = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [resultado,  setResultado]  = useState<Resultado | null>(null)
  const [erro,       setErro]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    setArquivo(e.target.files?.[0] ?? null)
    setResultado(null)
    setErro(null)
  }

  async function executar() {
    if (!arquivo) return
    setCarregando(true)
    setErro(null)
    setResultado(null)

    try {
      const fd = new FormData()
      fd.append('arquivo', arquivo)
      fd.append('simulacao', String(simulacao))
      const res = await fetch('/api/clientes/importar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? 'Erro na importação')
      setResultado(data)
    } catch (e) {
      setErro(String(e))
    } finally {
      setCarregando(false)
    }
  }

  const isSimulacao = resultado?.simulacao

  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Importar Clientes" />

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">

        <Link href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
          <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
        </Link>

        {/* Card principal */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Importar via planilha</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500">Formato compatível com exportação do Controller (.xlsx)</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all">
            <Upload className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            {arquivo ? (
              <div>
                <p className="text-sm font-semibold text-blue-600">{arquivo.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(arquivo.size / 1024).toFixed(0)} KB — clique para trocar</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Clique para selecionar o arquivo <span className="font-semibold text-blue-600">.xlsx</span></p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Exportado do Controller sem modificações</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={onArquivo} />
          </div>

          {/* Campos importados */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/40 rounded-lg">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Campos importados:</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
              Tipo, Nome/Razão Social, Fantasia, CPF/CNPJ, CPF Responsável, Nome Responsável,
              Telefones, E-mail, Data Nascimento, PIS/NIS, Endereço completo, Observações (IE, IM, CEI, CAEPF)
            </p>
            <p className="text-xs text-orange-500 mt-1.5">
              ⚠ Clientes com CPF ou CNPJ já cadastrado serão pulados automaticamente.
            </p>
          </div>

          {/* Toggle simulação */}
          <label className="flex items-center gap-3 mt-4 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulacao}
              onChange={e => { setSimulacao(e.target.checked); setResultado(null) }}
              className="w-4 h-4 accent-amber-500"
            />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4" /> Simular antes de importar (recomendado)
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Processa o arquivo e mostra o resultado esperado <strong>sem salvar nada</strong> no sistema.
              </p>
            </div>
          </label>

          <button
            onClick={executar}
            disabled={!arquivo || carregando}
            className={`mt-4 w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition ${
              simulacao ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {carregando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {simulacao ? 'Simulando...' : 'Importando...'}</>
              : simulacao
                ? <><FlaskConical className="w-4 h-4" /> Simular importação</>
                : <><Upload className="w-4 h-4" /> Importar clientes</>}
          </button>
        </div>

        {/* Erro geral */}
        {erro && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-4">

            {/* Banner simulação */}
            {isSimulacao && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Simulação — nenhum dado foi salvo. Se estiver tudo certo, desmarque "Simular" e importe de verdade.
                </p>
              </div>
            )}

            <h3 className="text-sm font-semibold text-gray-700 dark:text-white">
              {isSimulacao ? 'Resultado da simulação' : 'Resultado da importação'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl">
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{resultado.total}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total na planilha</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{resultado.importados}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isSimulacao ? 'Seriam importados' : 'Importados'}</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-2xl font-bold text-yellow-600">{resultado.pulados}</p>
                <p className="text-xs text-gray-400 mt-0.5">Duplicatas</p>
              </div>
              {(resultado.totalGrupos ?? 0) > 0 && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{resultado.totalGrupos}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Grupos detectados</p>
                </div>
              )}
            </div>

            {/* Grupos detectados */}
            {isSimulacao && resultado.grupos && resultado.grupos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
                  Grupos que serão criados (sócios com 2+ empresas):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {resultado.grupos.map((g, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
                      {g}
                    </span>
                  ))}
                  {(resultado.totalGrupos ?? 0) > 20 && (
                    <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
                      +{(resultado.totalGrupos ?? 0) - 20} mais...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Amostra de registros (simulação) */}
            {isSimulacao && resultado.amostra && resultado.amostra.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Amostra dos primeiros registros que seriam importados:</p>
                <div className="space-y-1.5">
                  {resultado.amostra.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700/40 rounded-lg">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.tipoPessoa === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {c.tipoPessoa}
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate flex-1">{c.nome}</span>
                      <span className="text-xs text-gray-400 shrink-0">{c.cidade ?? ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Erros */}
            {resultado.erros.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{resultado.erros.length} registro(s) com problema:</p>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {resultado.erros.map((e, i) => (
                    <p key={i} className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Ação pós-simulação */}
            {isSimulacao && resultado.importados > 0 && (
              <button
                onClick={() => { setSimulacao(false); setResultado(null) }}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
                Tudo certo — importar de verdade
              </button>
            )}

            {!isSimulacao && resultado.importados > 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <Link href="/clientes" className="text-sm font-medium hover:underline">
                  {resultado.importados} clientes importados — ver lista →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}