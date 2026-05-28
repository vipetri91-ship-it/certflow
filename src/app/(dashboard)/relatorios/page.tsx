import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatarMoeda } from '@/lib/utils'
import { RelatoriosFiltros } from './filtros'

interface SearchParams {
  de?: string
  ate?: string
  tipo?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

  const dataInicio = sp.de ? new Date(sp.de + 'T00:00:00') : inicioMes
  const dataFim = sp.ate ? new Date(sp.ate + 'T23:59:59') : fimMes

  const [pedidos, certificadosVencendo, top5Clientes, parceirosComissao] = await Promise.all([
    // Pedidos no período
    prisma.pedido.findMany({
      where: {
        createdAt: { gte: dataInicio, lte: dataFim },
        status: { not: 'CANCELADO' },
      },
      include: {
        cliente: { select: { nome: true } },
        usuario: { select: { nome: true } },
        itens: { include: { modelo: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Certificados vencendo em 60 dias
    prisma.certificado.findMany({
      where: {
        status: 'ATIVO',
        dataVencimento: {
          gte: new Date(),
          lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        cliente: { select: { nome: true, email: true, celular: true } },
        modelo: { select: { nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
    }),

    // Top 5 clientes por valor
    prisma.pedido.groupBy({
      by: ['clienteId'],
      where: {
        createdAt: { gte: dataInicio, lte: dataFim },
        status: { not: 'CANCELADO' },
      },
      _sum: { valorFinal: true },
      _count: true,
      orderBy: { _sum: { valorFinal: 'desc' } },
      take: 5,
    }),

    // Parceiros com mais pedidos no período
    prisma.pedido.groupBy({
      by: ['parceiroId'],
      where: {
        createdAt: { gte: dataInicio, lte: dataFim },
        status: { not: 'CANCELADO' },
        parceiroId: { not: null },
      },
      _sum: { valorFinal: true },
      _count: true,
      orderBy: { _count: { parceiroId: 'desc' } },
      take: 5,
    }),
  ])

  // Buscar nomes dos top clientes
  const clienteIds = top5Clientes.map(c => c.clienteId)
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nome: true },
  })
  const clienteMap = Object.fromEntries(clientes.map(c => [c.id, c.nome]))

  // Buscar nomes dos parceiros
  const parceiroIds = parceirosComissao.map(p => p.parceiroId).filter(Boolean) as string[]
  const parceiros = await prisma.parceiro.findMany({
    where: { id: { in: parceiroIds } },
    select: { id: true, nome: true },
  })
  const parceiroMap = Object.fromEntries(parceiros.map(p => [p.id, p.nome]))

  // Métricas gerais
  const totalPedidos = pedidos.length
  const totalEmitidos = pedidos.filter(p => p.status === 'EMITIDO').length
  const faturamento = pedidos.reduce((acc, p) => acc + Number(p.valorFinal), 0)
  const ticketMedio = totalPedidos > 0 ? faturamento / totalPedidos : 0

  // Por AGR
  const porAgr: Record<string, { pedidos: number; faturamento: number }> = {}
  for (const p of pedidos) {
    const agr = p.agr ?? 'Sem AGR'
    if (!porAgr[agr]) porAgr[agr] = { pedidos: 0, faturamento: 0 }
    porAgr[agr].pedidos++
    porAgr[agr].faturamento += Number(p.valorFinal)
  }

  // Por modelo
  const porModelo: Record<string, { qtd: number; faturamento: number }> = {}
  for (const p of pedidos) {
    for (const item of p.itens) {
      const nome = item.modelo.nome
      if (!porModelo[nome]) porModelo[nome] = { qtd: 0, faturamento: 0 }
      porModelo[nome].qtd += item.quantidade
      porModelo[nome].faturamento += Number(item.subtotal)
    }
  }

  return (
    <div>
      <Header titulo="Relatórios" />
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">

        {/* Filtros */}
        <RelatoriosFiltros de={sp.de ?? ''} ate={sp.ate ?? ''} />

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Pedidos', valor: totalPedidos.toString(), sub: 'no período' },
            { label: 'Pedidos Emitidos', valor: totalEmitidos.toString(), sub: `${totalPedidos > 0 ? Math.round(totalEmitidos / totalPedidos * 100) : 0}% do total` },
            { label: 'Faturamento', valor: formatarMoeda(faturamento), sub: 'pedidos não cancelados' },
            { label: 'Ticket Médio', valor: formatarMoeda(ticketMedio), sub: 'por pedido' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.valor}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Performance por AGR */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Performance por AGR</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {Object.entries(porAgr)
                .sort((a, b) => b[1].faturamento - a[1].faturamento)
                .map(([agr, dados]) => (
                  <div key={agr} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{agr}</p>
                      <p className="text-xs text-gray-400">{dados.pedidos} pedido{dados.pedidos !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-700">{formatarMoeda(dados.faturamento)}</span>
                  </div>
                ))}
              {Object.keys(porAgr).length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Nenhum pedido no período</p>
              )}
            </div>
          </div>

          {/* Certificados mais vendidos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Certificados Mais Vendidos</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {Object.entries(porModelo)
                .sort((a, b) => b[1].qtd - a[1].qtd)
                .map(([nome, dados]) => (
                  <div key={nome} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{nome}</p>
                      <p className="text-xs text-gray-400">{dados.qtd} unidade{dados.qtd !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{formatarMoeda(dados.faturamento)}</span>
                  </div>
                ))}
              {Object.keys(porModelo).length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Nenhum item no período</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Clientes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Top 5 Clientes</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {top5Clientes.map((c, i) => (
                <div key={c.clienteId} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{clienteMap[c.clienteId] ?? '—'}</p>
                      <p className="text-xs text-gray-400">{c._count} pedido{c._count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">{formatarMoeda(Number(c._sum.valorFinal ?? 0))}</span>
                </div>
              ))}
              {top5Clientes.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Nenhum pedido no período</p>
              )}
            </div>
          </div>

          {/* Parceiros */}
          {parceirosComissao.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Parceiros Ativos</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {parceirosComissao.map((p) => (
                  <div key={p.parceiroId} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{parceiroMap[p.parceiroId ?? ''] ?? '—'}</p>
                      <p className="text-xs text-gray-400">{p._count} pedido{p._count !== 1 ? 's' : ''} indicados</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{formatarMoeda(Number(p._sum.valorFinal ?? 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Certificados vencendo */}
        {certificadosVencendo.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Certificados Vencendo em 60 dias</h2>
              <p className="text-xs text-gray-400 mt-0.5">{certificadosVencendo.length} certificado{certificadosVencendo.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {certificadosVencendo.map(cert => {
                    const diasRestantes = Math.ceil((new Date(cert.dataVencimento).getTime() - Date.now()) / 86400000)
                    const cor = diasRestantes <= 7 ? 'text-red-600' : diasRestantes <= 30 ? 'text-orange-500' : 'text-yellow-600'
                    return (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{cert.cliente.nome}</td>
                        <td className="px-4 py-3 text-gray-600">{cert.modelo.nome}</td>
                        <td className={`px-4 py-3 font-medium ${cor}`}>
                          {new Date(cert.dataVencimento).toLocaleDateString('pt-BR')}
                          <span className="ml-2 text-xs">({diasRestantes}d)</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {cert.cliente.email && <div>{cert.cliente.email}</div>}
                          {cert.cliente.celular && <div>{cert.cliente.celular}</div>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
