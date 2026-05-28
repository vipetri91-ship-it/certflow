import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, TrendingDown, AlertCircle, Pencil, ExternalLink } from 'lucide-react'
import { formatarMoeda, formatarData } from '@/lib/utils'
import { STATUS_BADGE } from '@/lib/financeiro-config'
import { FiltroStatus } from '@/components/filtro-status'

interface Props {
  searchParams: Promise<{ mes?: string; ano?: string; status?: string }>
}

export default async function ContasPagarPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  const params = await searchParams
  const hoje   = new Date()
  const mes    = Number(params.mes    ?? hoje.getMonth() + 1)
  const ano    = Number(params.ano    ?? hoje.getFullYear())
  const status = params.status ?? ''

  const inicio = new Date(ano, mes - 1, 1)
  const fim    = new Date(ano, mes, 0)

  const contas = await prisma.lancamento.findMany({
    where: {
      tipo: 'PAGAR',
      dataVencimento: { gte: inicio, lte: fim },
      ...(status ? { status: status as 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO' } : {}),
    },
    include: {
      categoria: { select: { nome: true, cor: true } },
      parceiro:  { select: { nome: true } },
    },
    orderBy: { dataVencimento: 'asc' },
  })

  const totalPendente = contas.filter(c => c.status !== 'PAGO' && c.status !== 'CANCELADO').reduce((s, c) => s + Number(c.valor), 0)
  const totalPago     = contas.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valor), 0)
  const vencidos      = contas.filter(c => c.status === 'PENDENTE' && new Date(c.dataVencimento) < hoje)

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <div>
      <Header titulo="Contas a Pagar" />
      <div className="p-4 lg:p-6 space-y-5">

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">A Pagar</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatarMoeda(totalPendente)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Já Pago</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatarMoeda(totalPago)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Vencidos</span>
            </div>
            <p className="text-xl font-bold text-red-700">{vencidos.length}</p>
          </div>
        </div>

        {/* Barra de controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex gap-1 flex-wrap">
            {meses.map((nome, i) => {
              const m = i + 1
              return (
                <Link key={m} href={`/financeiro/contas-a-pagar?mes=${m}&ano=${ano}${status ? `&status=${status}` : ''}`}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${m === mes ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {nome}
                </Link>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <FiltroStatus basePath="/financeiro/contas-a-pagar" mes={mes} ano={ano} statusAtual={status} />
            <Link href="/financeiro/contas-a-pagar/novo"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" /> Nova Conta
            </Link>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fornecedor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plano de Contas</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Docs</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contas.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhuma conta a pagar neste mês</td></tr>
                )}
                {contas.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.parceiro?.nome ?? c.descricao}</p>
                      {c.referencia && <p className="text-xs text-gray-400">{c.referencia}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.categoria ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: c.categoria.cor ?? '#6b7280' }}>
                          {c.categoria.nome}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.tipoConta ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.centroCusto ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatarData(c.dataVencimento)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">-{formatarMoeda(Number(c.valor))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.boleto && <a href={c.boleto} target="_blank" rel="noopener noreferrer" title="Boleto" className="text-blue-500 hover:text-blue-700"><ExternalLink className="w-3.5 h-3.5" /></a>}
                        {c.notaFiscal && <a href={c.notaFiscal} target="_blank" rel="noopener noreferrer" title="NF" className="text-purple-500 hover:text-purple-700"><ExternalLink className="w-3.5 h-3.5" /></a>}
                        {c.comprovante && <a href={c.comprovante} target="_blank" rel="noopener noreferrer" title="Comprovante" className="text-green-500 hover:text-green-700"><ExternalLink className="w-3.5 h-3.5" /></a>}
                        {!c.boleto && !c.notaFiscal && !c.comprovante && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/financeiro/contas-a-pagar/${c.id}/editar`}
                        className="inline-flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
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
