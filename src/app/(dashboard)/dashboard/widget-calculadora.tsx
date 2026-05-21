'use client'

import { useState } from 'react'
import { Car, MapPin, Fuel, Calculator, Loader2, X, Navigation } from 'lucide-react'

type Resultado = {
  origem:        string
  destino:       string
  distanciaIda:  number
  idaVolta:      number
  litros:        number
  custo:         number
  custoSugerido: number
  erro?:         string
}

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-slate-500'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function WidgetCalculadora() {
  const [endereco,  setEndereco]  = useState('')
  const [preco,     setPreco]     = useState('6,66')
  const [kml,       setKml]       = useState('10')
  const [loading,   setLoading]   = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro,      setErro]      = useState('')

  async function calcular(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setResultado(null)
    try {
      const res = await fetch('/api/calculadora/deslocamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enderecoCliente:  endereco,
          precoCombustivel: Number(preco.replace(',', '.')),
          kmPorLitro:       Number(kml.replace(',', '.')),
        }),
      })
      const data = await res.json()
      if (!res.ok || data.erro) { setErro(data.erro ?? 'Erro ao calcular'); return }
      setResultado(data)
    } catch {
      setErro('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col overflow-hidden" style={{ height: '100%' }}>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Taxa de Deslocamento</p>
        </div>

        {/* Form */}
        <form onSubmit={calcular} className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Origem fixa */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <p className="text-xs text-gray-400 dark:text-slate-500 truncate">Piracaia/SP (origem fixa)</p>
          </div>

          <input value={endereco} onChange={e => setEndereco(e.target.value)}
            placeholder="Endereço do cliente (ex: Bragança Paulista/SP)"
            className={inp} required />

          {/* Combustível + km/l */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Fuel className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={preco} onChange={e => setPreco(e.target.value)}
                placeholder="6,66" className={`${inp} pl-8`} />
            </div>
            <div className="relative">
              <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={kml} onChange={e => setKml(e.target.value)}
                placeholder="10 km/l" className={`${inp} pl-8`} />
            </div>
          </div>

          {erro && <p className="text-xs text-red-500 dark:text-red-400">{erro}</p>}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando rota...</>
              : <><Calculator className="w-4 h-4" /> Calcular</>}
          </button>
        </form>
      </div>

      {/* Modal de resultado */}
      {resultado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResultado(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Header laranja */}
            <div className="bg-orange-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car className="w-7 h-7 text-white" />
                <div>
                  <p className="text-white font-bold text-lg leading-tight">Taxa de Deslocamento</p>
                  <p className="text-white/80 text-xs mt-0.5">Cálculo de rota real</p>
                </div>
              </div>
              <button onClick={() => setResultado(null)} className="p-1.5 rounded-lg hover:bg-white/20 transition">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Rota */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
                <Navigation className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-500" />
                <p className="leading-relaxed line-clamp-2">{resultado.destino}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-3 grid grid-cols-3 gap-3">
              {[
                { label: 'Distância ida',  valor: `${resultado.distanciaIda} km` },
                { label: 'Ida + volta',    valor: `${resultado.idaVolta} km` },
                { label: 'Combustível',    valor: `${resultado.litros} L` },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{s.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{s.valor}</p>
                </div>
              ))}
            </div>

            {/* Valores */}
            <div className="px-6 pb-2 space-y-2">
              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-slate-700">
                <span className="text-sm text-gray-500 dark:text-slate-400">Custo calculado</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{fmt(resultado.custo)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-slate-700">
                <span className="text-sm font-bold text-gray-800 dark:text-white">Valor sugerido</span>
                <span className="text-xl font-black text-orange-500">{fmt(resultado.custoSugerido)}</span>
              </div>
            </div>

            {/* Rodapé */}
            <div className="px-6 pb-5 pt-2 flex gap-2">
              <button onClick={() => setResultado(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                Fechar
              </button>
              <button onClick={() => { setResultado(null); setEndereco('') }}
                className="flex-1 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition">
                Novo Cálculo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}