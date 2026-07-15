'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Printer } from 'lucide-react'

interface LinhaHistorico {
  label: string
  mes: number
  ano: number
  icf: number
  producao: number
  qualidade: number
  renovacao: number
  producaoResultado: number
  producaoMeta: number
  qualidadeOcorrencias: number
}

export function HistoricoClient({ dados }: { dados: LinhaHistorico[] }) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #historico-print, #historico-print * { visibility: visible !important; }
          #historico-print {
            position: fixed !important;
            top: 0; left: 0; right: 0;
            width: 100%; margin: 0; padding: 24px;
            background: white !important;
          }
        }
      `}</style>

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5" id="historico-print">
        <div className="flex items-center justify-between no-print">
          <p className="text-sm text-gray-500 dark:text-slate-400">Evolução mensal do Índice CertFlow, calculada pelo robô diário.</p>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Printer className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>

        {dados.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 italic bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            Ainda não há histórico — o robô diário grava o primeiro registro no fim do dia de hoje.
          </p>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <p className="font-semibold text-gray-700 dark:text-white text-sm mb-4">ICF ao longo do tempo</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dados}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="icf" name="ICF" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="producao" name="Produção" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="qualidade" name="Qualidade" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="renovacao" name="Renovação" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Mês</th>
                    <th className="text-right px-4 py-2 font-medium">Produção</th>
                    <th className="text-right px-4 py-2 font-medium">Qualidade</th>
                    <th className="text-right px-4 py-2 font-medium">Renovação</th>
                    <th className="text-right px-4 py-2 font-medium">ICF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {[...dados].reverse().map(d => (
                    <tr key={`${d.mes}-${d.ano}`}>
                      <td className="px-4 py-2 text-gray-800 dark:text-white capitalize">{d.label}</td>
                      <td className="px-4 py-2 text-right text-gray-600 dark:text-slate-300">{d.producaoResultado}/{d.producaoMeta}</td>
                      <td className="px-4 py-2 text-right text-gray-600 dark:text-slate-300">{Math.round(d.qualidade)} ({d.qualidadeOcorrencias} ocor.)</td>
                      <td className="px-4 py-2 text-right text-gray-600 dark:text-slate-300">{Math.round(d.renovacao)}%</td>
                      <td className="px-4 py-2 text-right font-semibold text-blue-600">{d.icf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
