'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/header'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Resultado {
  total:      number
  importados: number
  pulados:    number
  erros:      string[]
}

export default function ImportarClientesPage() {
  const [arquivo,     setArquivo]     = useState<File | null>(null)
  const [carregando,  setCarregando]  = useState(false)
  const [resultado,   setResultado]   = useState<Resultado | null>(null)
  const [erro,        setErro]        = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setArquivo(f)
    setResultado(null)
    setErro(null)
  }

  async function importar() {
    if (!arquivo) return
    setCarregando(true)
    setErro(null)
    setResultado(null)

    try {
      const fd = new FormData()
      fd.append('arquivo', arquivo)
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

  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Importar Clientes" />

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">

        <Link href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
          <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
        </Link>

        {/* Card de upload */}
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

          {/* Legenda de campos */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/40 rounded-lg">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Campos importados automaticamente:</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
              Tipo, Nome/Razão Social, Fantasia, CPF/CNPJ, CPF Responsável, Nome Responsável,
              Telefones, E-mail, Data Nascimento, PIS/NIS, Endereço completo, Observações (IE, IM, CEI, CAEPF)
            </p>
            <p className="text-xs text-orange-500 dark:text-orange-400 mt-1.5">
              ⚠ Clientes com CPF ou CNPJ já cadastrado serão pulados automaticamente.
            </p>
          </div>

          <button
            onClick={importar}
            disabled={!arquivo || carregando}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {carregando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white">Resultado da importação</h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl">
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{resultado.total}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total na planilha</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{resultado.importados}</p>
                <p className="text-xs text-gray-400 mt-0.5">Importados</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-2xl font-bold text-yellow-600">{resultado.pulados}</p>
                <p className="text-xs text-gray-400 mt-0.5">Duplicatas puladas</p>
              </div>
            </div>

            {resultado.importados === resultado.total && resultado.erros.length === 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm font-medium">Todos os clientes foram importados com sucesso!</p>
              </div>
            )}

            {resultado.erros.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{resultado.erros.length} registro(s) com erro:</p>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {resultado.erros.map((e, i) => (
                    <p key={i} className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {resultado.importados > 0 && (
              <Link href="/clientes"
                className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline">
                Ver clientes importados →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}