import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatarMoeda, formatarData } from '@/lib/utils'

interface Props {
  searchParams: Promise<{ tipo?: string; status?: string; mes?: string; ano?: string }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = new Date()
  const mes = Number(params.mes ?? hoje.getMonth() + 1)
  const ano = Number(params.ano ?? hoje.getFullYear())

  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 0)

  const lancamentos = await prisma.lancamento.findMany({
    where: { dataVencimento: { gte: inicio, lte: fim } },
    include: { categoria: { select: { nome: true, cor: true } } },
    orderBy: { dataVencimento: 'asc' },
  })

  const totalReceber = lancamentos
    .filter((l) => l.tipo === 'RECEBER')
    .reduce((acc, l) => acc + Number(l.valor), 0)

  const totalPagar = lancamentos
    .filter((l) => l.tipo === 'PAGAR')
    .reduce((acc, l) => acc + Number(l.valor), 0)

  const totalPago = lancamentos
    .filter((l) => l.status === 'PAGO')
    .reduce((acc, l) => acc + (l.tipo === 'RECEBER' ? Number(l.valor) : -Number(l.valor)), 0)

  const vencidos = lancamentos.filter(
    (l) => l.status === 'PENDENTE' && new Date(l.dataVencimento) < hoje
  )

  const statusBadge: Record<string, string> = {
    PENDENTE: 'bg-yellow-100 text-yellow-700',
    PAGO: 'bg-green-100 text-green-700',
    VENCIDO: 'bg-red-100 text-red-700',
    CANCELADO: 'bg-gray-100 text-gray-500',
  }

  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div>
      <Header titulo="Financeiro" />
      <div className="p-6 space-y-5">
        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">A Receber</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatarMoeda(totalReceber)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">A Pagar</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatarMoeda(totalPagar)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Saldo</span>
            </div>
            <p className={`text-xl font-bold ${totalPago >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatarMoeda(totalPago)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Vencidos</span>
            </div>
            <p className="text-xl font-bold text-red-700">{vencidos.length}</p>
          </div>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex gap-1 flex-wrap">
            {mesesNomes.map((nome, i) => {
              const m = i + 1
              return (
                <Link
                  key={m}
                  href={`/financeiro?mes=${m}&ano=${ano}`}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    m === mes ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {nome}
                </Link>
              )
            })}
          </div>
          <Link
            href="/financeiro/novo"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Lançamento
          </Link>
        </div>

        {/* Tabela de lançamentos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lancamentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhum lançamento neste mês
                    </td>
                  </tr>
                )}
                {lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{l.descricao}</td>
                    <td className="px-4 py-3">
                      {l.categoria ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: l.categoria.cor ?? '#6b7280' }}
                        >
                          {l.categoria.nome}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.tipo === 'RECEBER' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {l.tipo === 'RECEBER' ? '↑ Receber' : '↓ Pagar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatarData(l.dataVencimento)}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        l.tipo === 'RECEBER' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {l.tipo === 'RECEBER' ? '+' : '-'}
                      {formatarMoeda(Number(l.valor))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}