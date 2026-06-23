import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Handshake, AlertTriangle, ExternalLink } from 'lucide-react'
import { formatarMoeda, formatarData } from '@/lib/utils'
import { calcularComissoesPeriodo } from '@/lib/comissoes'
import { prisma } from '@/lib/prisma'
import { ComissaoPagarButton } from '@/components/comissao-pagar-button'

interface Props {
  searchParams: Promise<{ mes?: string; ano?: string }>
}

export default async function ComissoesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  const params = await searchParams
  const hoje = new Date()
  const mes = Number(params.mes ?? hoje.getMonth() + 1)
  const ano = Number(params.ano ?? hoje.getFullYear())

  const resumos = await calcularComissoesPeriodo(mes, ano)

  const fechamentos = await prisma.comissaoFechamento.findMany({
    where: { mes, ano, parceiroId: { in: resumos.map(r => r.parceiroId) } },
  })
  const statusPorParceiro = new Map(fechamentos.map(f => [f.parceiroId, f]))

  const totalGeral = resumos.reduce((s, r) => s + r.valorTotal, 0)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div>
      <Header titulo="Comissões de Parceiros" />
      <div className="p-4 lg:p-6 space-y-5">

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Handshake className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Total do Período</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatarMoeda(totalGeral)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Handshake className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Parceiros</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{resumos.length}</p>
          </div>
        </div>

        {/* Seletor de mês */}
        <div className="flex flex-wrap items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          {meses.map((nome, i) => {
            const m = i + 1
            return (
              <Link key={m} href={`/financeiro/comissoes?mes=${m}&ano=${ano}`}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${m === mes ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {nome}
              </Link>
            )
          })}
        </div>

        {resumos.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            Nenhum certificado emitido com comissão configurada neste período.
          </div>
        )}

        {/* Por parceiro */}
        {resumos.map(r => {
          const fechamento = statusPorParceiro.get(r.parceiroId)
          const pago = fechamento?.status === 'PAGO'
          return (
            <div key={r.parceiroId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-900">{r.parceiroNome}</p>
                  <p className="text-xs text-gray-500">{r.qtdPedidos} certificado{r.qtdPedidos !== 1 ? 's' : ''} emitido{r.qtdPedidos !== 1 ? 's' : ''}</p>
                  {r.pedidosSemComissaoConfigurada > 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      {r.pedidosSemComissaoConfigurada} pedido(s) sem valor de custo/cliente configurado — não entraram no total
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-orange-700">{formatarMoeda(r.valorTotal)}</p>
                  {pago ? (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg">
                      Pago em {fechamento?.pagoEm ? formatarData(fechamento.pagoEm) : '—'}
                    </span>
                  ) : (
                    <ComissaoPagarButton parceiroId={r.parceiroId} mes={mes} ano={ano} valorTotal={r.valorTotal} />
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Pedido</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Cliente</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Modelo</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Custo</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Venda</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Comissão</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {r.pedidos.map(p => (
                      <tr key={p.pedidoId}>
                        <td className="px-4 py-2 text-xs text-gray-600">{p.numero}</td>
                        <td className="px-4 py-2 text-gray-800">{p.clienteNome}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">{p.modeloNome}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatarMoeda(p.valorCusto)}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatarMoeda(p.valorCliente)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-orange-700">{formatarMoeda(p.comissao)}</td>
                        <td className="px-4 py-2 text-center">
                          <Link href={`/pedidos/${p.pedidoId}`} className="text-blue-500 hover:text-blue-700">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
