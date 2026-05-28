import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

function fmtData(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function diasRestantes(vencimento: Date | string) {
  const diff = new Date(vencimento).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / 86400000)
}

interface Props { searchParams: Promise<{ mes?: string; ano?: string }> }

export default async function RelatoriosPage({ searchParams }: Props) {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')

  const params = await searchParams
  const hoje = new Date()
  const mes = Number(params.mes ?? hoje.getMonth() + 1)
  const ano = Number(params.ano ?? hoje.getFullYear())

  const inicio = new Date(ano, mes - 1, 1)
  const fim    = new Date(ano, mes, 0, 23, 59, 59)

  // Certificados dos clientes deste parceiro que vencem neste mês
  const certificados = await prisma.certificado.findMany({
    where: {
      status: 'ATIVO',
      dataVencimento: { gte: inicio, lte: fim },
      cliente: { parceiroId: parceiro.id },
    },
    include: {
      cliente: { select: { nome: true, razaoSocial: true, cnpj: true, cpf: true, email: true, celular: true } },
      modelo:  { select: { nome: true } },
    },
    orderBy: { dataVencimento: 'asc' },
  })

  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' }),
  }))
  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relatório de Vencimentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Certificados dos seus clientes que vencem no período selecionado</p>
        </div>
        <form className="flex gap-2">
          <select name="mes" defaultValue={mes}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</option>
            ))}
          </select>
          <select name="ano" defaultValue={ano}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
            Filtrar
          </button>
        </form>
      </div>

      {certificados.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
          <span className="text-amber-700 text-sm font-semibold">{certificados.length} certificado{certificados.length !== 1 ? 's' : ''} vencem neste período</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {certificados.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Nenhum certificado vencendo neste período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Cliente', 'CNPJ/CPF', 'Modelo', 'Vencimento', 'Dias restantes', 'E-mail'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {certificados.map(c => {
                  const dias = diasRestantes(c.dataVencimento)
                  const nomeCliente = c.cliente.razaoSocial || c.cliente.nome
                  const docCliente = c.cliente.cnpj || c.cliente.cpf || '—'
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{nomeCliente}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{docCliente}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.modelo.nome}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtData(c.dataVencimento)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          dias < 0 ? 'bg-red-100 text-red-700' :
                          dias <= 7 ? 'bg-orange-100 text-orange-700' :
                          dias <= 15 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {dias < 0 ? `${Math.abs(dias)}d em atraso` : `${dias} dias`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.cliente.email ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
