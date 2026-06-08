'use client'

import { useState, useRef } from 'react'
import { Header } from '@/components/header'
import {
  Upload, FileText, FileSpreadsheet, CheckCircle2, XCircle,
  Loader2, Scale, AlertTriangle, ChevronRight, RefreshCw,
} from 'lucide-react'

interface RegistroController {
  protocolo: string; data: string; nome: string; modelo: string; valor: string; agr: string
}
interface RegistroVG {
  protocolo: string; cliente: string; produto: string; data: string; valor: string; agr: string
}
interface Resultado {
  controller:      { total: number }
  vg:              { total: number }
  naoNaVG:         RegistroController[]
  naoNoController: RegistroVG[]
}

export function ConciliacoesClient() {
  const [controllerFile, setControllerFile] = useState<File | null>(null)
  const [vgFile,         setVgFile]         = useState<File | null>(null)
  const [carregando,     setCarregando]     = useState(false)
  const [resultado,      setResultado]      = useState<Resultado | null>(null)
  const [erro,           setErro]           = useState<string | null>(null)

  const controllerRef = useRef<HTMLInputElement>(null)
  const vgRef         = useRef<HTMLInputElement>(null)

  async function conciliar() {
    if (!controllerFile || !vgFile) return
    setCarregando(true)
    setErro(null)
    setResultado(null)

    try {
      const fd = new FormData()
      fd.append('controllerFile', controllerFile)
      fd.append('vgFile', vgFile)
      const res = await fetch('/api/financeiro/conciliacoes', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na conciliação')
      setResultado(data)
    } catch (e) {
      setErro(String(e instanceof Error ? e.message : e))
    } finally {
      setCarregando(false)
    }
  }

  function limpar() {
    setControllerFile(null)
    setVgFile(null)
    setResultado(null)
    setErro(null)
  }

  const ambosCarregados = !!controllerFile && !!vgFile

  const naoNaVGComValor = resultado?.naoNaVG.filter(r => r.valor && r.valor !== 'R$ 0,00' && r.valor !== '') ?? []
  const naoNaVGZero     = resultado?.naoNaVG.filter(r => !r.valor || r.valor === 'R$ 0,00' || r.valor === '') ?? []
  const diferenca       = resultado ? resultado.controller.total - resultado.vg.total : 0

  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Conciliações" />

      <div className="flex-1 p-4 lg:p-6 max-w-5xl mx-auto w-full space-y-5">

        {/* Cabeçalho descritivo */}
        <div className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Conciliação V&G × Controller</h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5 leading-relaxed">
              Faça o upload dos dois arquivos e o sistema identifica automaticamente o que a V&G está cobrando a mais ou a menos em relação ao seu Controller.
            </p>
          </div>
        </div>

        {/* Uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Controller */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-semibold text-gray-700 dark:text-white">1. Relatório do Controller</p>
            </div>
            <div
              onClick={() => controllerRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                controllerFile
                  ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 hover:bg-blue-50/20 dark:hover:bg-blue-900/10'
              }`}
            >
              {controllerFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-7 h-7 text-blue-500" />
                  <p className="text-xs font-semibold text-blue-600 break-all">{controllerFile.name}</p>
                  <p className="text-[11px] text-gray-400">{(controllerFile.size / 1024).toFixed(0)} KB — clique para trocar</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-7 h-7 text-gray-300 dark:text-slate-600" />
                  <p className="text-xs text-gray-500 dark:text-slate-400">Clique para selecionar</p>
                  <p className="text-[11px] text-gray-400">Produção Detalhada exportada do Controller <span className="font-semibold">.xls</span></p>
                </div>
              )}
              <input ref={controllerRef} type="file" accept=".xls,.xlsx,.html,.htm" className="hidden"
                onChange={e => { setControllerFile(e.target.files?.[0] ?? null); setResultado(null); setErro(null) }} />
            </div>
          </div>

          {/* V&G */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-semibold text-gray-700 dark:text-white">2. Fatura da V&G</p>
            </div>
            <div
              onClick={() => vgRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                vgFile
                  ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/10'
                  : 'border-gray-200 dark:border-slate-600 hover:border-emerald-300 hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10'
              }`}
            >
              {vgFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-600 break-all">{vgFile.name}</p>
                  <p className="text-[11px] text-gray-400">{(vgFile.size / 1024).toFixed(0)} KB — clique para trocar</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-7 h-7 text-gray-300 dark:text-slate-600" />
                  <p className="text-xs text-gray-500 dark:text-slate-400">Clique para selecionar</p>
                  <p className="text-[11px] text-gray-400">Arquivo <span className="font-semibold">FATURA_AAAA-MM_xxx.xlsx</span> recebido da V&G</p>
                </div>
              )}
              <input ref={vgRef} type="file" accept=".xlsx" className="hidden"
                onChange={e => { setVgFile(e.target.files?.[0] ?? null); setResultado(null); setErro(null) }} />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={conciliar}
            disabled={!ambosCarregados || carregando}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
          >
            {carregando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              : <><Scale className="w-4 h-4" /> Conciliar agora</>}
          </button>
          {(controllerFile || vgFile || resultado) && (
            <button onClick={limpar}
              className="flex items-center gap-1.5 px-4 py-3 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition">
              <RefreshCw className="w-4 h-4" /> Limpar
            </button>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="space-y-5">

            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{resultado.controller.total}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">No Controller</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{resultado.vg.total}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Na Fatura V&G</p>
              </div>
              <div className={`rounded-2xl border shadow-sm p-4 text-center ${
                diferenca === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
              }`}>
                <p className={`text-2xl font-bold ${diferenca === 0 ? 'text-green-600' : 'text-red-600'}`}>{diferenca}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Diferença</p>
              </div>
            </div>

            {/* Seção: Não cobrado pela V&G */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className={`px-5 py-4 flex items-center justify-between ${
                resultado.naoNaVG.length === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {resultado.naoNaVG.length === 0
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <p className={`text-sm font-semibold ${resultado.naoNaVG.length === 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    No Controller mas não na fatura V&G
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  resultado.naoNaVG.length === 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}>{resultado.naoNaVG.length}</span>
              </div>

              {resultado.naoNaVG.length === 0 ? (
                <p className="px-5 py-4 text-sm text-green-600 dark:text-green-400">
                  Todos os certificados do Controller estão na fatura V&G.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Protocolo</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Data</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Cliente</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Produto</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Valor</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">AGR</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.naoNaVG.map((r, i) => {
                        const isZero = !r.valor || r.valor === 'R$ 0,00' || r.valor === ''
                        return (
                          <tr key={r.protocolo} className={`border-b border-gray-50 dark:border-slate-700/50 last:border-0 ${
                            i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-700/20'
                          }`}>
                            <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-slate-300 whitespace-nowrap">{r.protocolo}</td>
                            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.data}</td>
                            <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 max-w-[160px] truncate">{r.nome}</td>
                            <td className="px-4 py-2.5 text-gray-500 max-w-[180px] truncate hidden sm:table-cell">{r.modelo}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">{r.valor || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{r.agr}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                isZero
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                <ChevronRight className="w-2.5 h-2.5" />
                                {isZero ? 'Verificar' : 'V&G deve cobrar'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Rodapé com contagens */}
                  {(naoNaVGComValor.length > 0 || naoNaVGZero.length > 0) && (
                    <div className="flex flex-wrap gap-3 px-4 py-3 bg-gray-50 dark:bg-slate-700/20 border-t border-gray-100 dark:border-slate-700">
                      {naoNaVGComValor.length > 0 && (
                        <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                          {naoNaVGComValor.length} com valor — V&G deve incluir na próxima fatura
                        </span>
                      )}
                      {naoNaVGZero.length > 0 && (
                        <span className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">
                          {naoNaVGZero.length} com R$0 — verificar se são cancelamentos ou cortesia
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seção: Na V&G sem Controller */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className={`px-5 py-4 flex items-center justify-between ${
                resultado.naoNoController.length === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800'
              }`}>
                <div className="flex items-center gap-2">
                  {resultado.naoNoController.length === 0
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  <p className={`text-sm font-semibold ${resultado.naoNoController.length === 0 ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                    Na fatura V&G mas não no Controller
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  resultado.naoNoController.length === 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                }`}>{resultado.naoNoController.length}</span>
              </div>

              {resultado.naoNoController.length === 0 ? (
                <p className="px-5 py-4 text-sm text-green-600 dark:text-green-400">
                  A V&G não cobrou nada além do que está no seu Controller.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/40">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Protocolo</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Data</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Cliente</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Produto</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Valor V&G</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">AGR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.naoNoController.map((r, i) => (
                        <tr key={r.protocolo} className={`border-b border-gray-50 dark:border-slate-700/50 last:border-0 ${
                          i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-700/20'
                        }`}>
                          <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-slate-300 whitespace-nowrap">{r.protocolo}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.data}</td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300 max-w-[160px] truncate">{r.cliente}</td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-[180px] truncate hidden sm:table-cell">{r.produto}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">{r.valor}</td>
                          <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{r.agr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
