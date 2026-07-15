'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { GaugeICF } from '@/components/performance/gauge-icf'

interface Resultado {
  producao: { pontuacao: number; status: string }
  qualidade: { pontuacao: number; status: string }
  renovacao: { percentual: number; status: string }
  icf: number
  classificacao: { emoji: string; label: string; cor: 'verde' | 'azul' | 'amarelo' | 'laranja' | 'vermelho' }
}

const CENARIOS = [
  { label: 'Meta batida, sem erros', producaoResultado: 350, qualidadeErroPequeno: 0, qualidadeRetrabalho: 0, qualidadeErroGrave: 0, renovacaoTaxaContato: 100 },
  { label: 'Produção estável, alguns retrabalhos', producaoResultado: 300, qualidadeErroPequeno: 2, qualidadeRetrabalho: 1, qualidadeErroGrave: 0, renovacaoTaxaContato: 90 },
  { label: 'Mês difícil', producaoResultado: 220, qualidadeErroPequeno: 3, qualidadeRetrabalho: 2, qualidadeErroGrave: 1, renovacaoTaxaContato: 60 },
]

export function SimuladorForm({ metaAtual }: { metaAtual: number }) {
  const [producaoResultado, setProducaoResultado] = useState(metaAtual)
  const [qualidadeErroPequeno, setQualidadeErroPequeno] = useState(0)
  const [qualidadeRetrabalho, setQualidadeRetrabalho] = useState(0)
  const [qualidadeErroGrave, setQualidadeErroGrave] = useState(0)
  const [qualidadeRevogacao, setQualidadeRevogacao] = useState(false)
  const [renovacaoTaxaContato, setRenovacaoTaxaContato] = useState(90)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [carregando, setCarregando] = useState(false)

  const simular = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/performance/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producaoResultado, qualidadeErroPequeno, qualidadeRetrabalho, qualidadeErroGrave, qualidadeRevogacao, renovacaoTaxaContato,
        }),
      })
      if (res.ok) setResultado(await res.json())
    } finally {
      setCarregando(false)
    }
  }, [producaoResultado, qualidadeErroPequeno, qualidadeRetrabalho, qualidadeErroGrave, qualidadeRevogacao, renovacaoTaxaContato])

  useEffect(() => {
    const t = setTimeout(simular, 350)
    return () => clearTimeout(t)
  }, [simular])

  function aplicarCenario(c: typeof CENARIOS[number]) {
    setProducaoResultado(c.producaoResultado)
    setQualidadeErroPequeno(c.qualidadeErroPequeno)
    setQualidadeRetrabalho(c.qualidadeRetrabalho)
    setQualidadeErroGrave(c.qualidadeErroGrave)
    setQualidadeRevogacao(false)
    setRenovacaoTaxaContato(c.renovacaoTaxaContato)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {CENARIOS.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => aplicarCenario(c)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              {c.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-white">
            Produção: {producaoResultado} certificados <span className="text-gray-400 font-normal">(meta atual: {metaAtual})</span>
          </label>
          <input
            type="range" min={0} max={500} value={producaoResultado}
            onChange={e => setProducaoResultado(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-white">Ocorrências de qualidade</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400">Erro pequeno</label>
              <input type="number" min={0} value={qualidadeErroPequeno} onChange={e => setQualidadeErroPequeno(Number(e.target.value))}
                className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400">Retrabalho</label>
              <input type="number" min={0} value={qualidadeRetrabalho} onChange={e => setQualidadeRetrabalho(Number(e.target.value))}
                className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400">Erro grave</label>
              <input type="number" min={0} value={qualidadeErroGrave} onChange={e => setQualidadeErroGrave(Number(e.target.value))}
                className="w-full mt-1 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-1.5 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 mt-1">
            <input type="checkbox" checked={qualidadeRevogacao} onChange={e => setQualidadeRevogacao(e.target.checked)} />
            Houve uma revogação (zera a qualidade do mês)
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-white">
            Renovação: {renovacaoTaxaContato}% dos clientes contactados
          </label>
          <input
            type="range" min={0} max={100} value={renovacaoTaxaContato}
            onChange={e => setRenovacaoTaxaContato(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col items-center justify-center gap-3">
        {carregando && !resultado ? (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        ) : resultado ? (
          <>
            <GaugeICF valor={resultado.icf} cor={resultado.classificacao.cor} tamanho={220} />
            <p className="text-xl font-bold text-gray-900 dark:text-white -mt-2">
              {resultado.classificacao.emoji} {resultado.classificacao.label}
            </p>
            <div className="grid grid-cols-3 gap-3 w-full mt-2 text-center text-xs">
              <div>
                <p className="text-gray-400">Produção</p>
                <p className="font-semibold text-gray-800 dark:text-white">{resultado.producao.pontuacao}%</p>
              </div>
              <div>
                <p className="text-gray-400">Qualidade</p>
                <p className="font-semibold text-gray-800 dark:text-white">{Math.round(resultado.qualidade.pontuacao)}%</p>
              </div>
              <div>
                <p className="text-gray-400">Renovação</p>
                <p className="font-semibold text-gray-800 dark:text-white">{Math.round(resultado.renovacao.percentual)}%</p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
