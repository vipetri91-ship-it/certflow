import { auth } from '@/lib/auth'
import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { DashboardCharts } from './charts'
import {
  Users,
  Award,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
  Handshake,
} from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { addDays } from 'date-fns'

async function getDashboardData() {
  const hoje = new Date()
  const em30dias = addDays(hoje, 30)
  const em60dias = addDays(hoje, 60)
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

  const [
    totalClientes,
    totalCertificadosAtivos,
    vencendo30,
    vencendo60,
    pedidosMes,
    receitaMes,
    totalParceiros,
    contasVencidas,
    ultimosPedidos,
  ] = await Promise.all([
    prisma.cliente.count({ where: { ativo: true } }),
    prisma.certificado.count({ where: { status: 'ATIVO' } }),
    prisma.certificado.count({
      where: {
        status: 'ATIVO',
        dataVencimento: { gte: hoje, lte: em30dias },
      },
    }),
    prisma.certificado.count({
      where: {
        status: 'ATIVO',
        dataVencimento: { gte: hoje, lte: em60dias },
      },
    }),
    prisma.pedido.count({
      where: {
        createdAt: { gte: inicioMes, lte: fimMes },
        status: { not: 'CANCELADO' },
      },
    }),
    prisma.lancamento.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEBER',
        status: 'PAGO',
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
    }),
    prisma.parceiro.count({ where: { ativo: true } }),
    prisma.lancamento.count({
      where: {
        status: 'PENDENTE',
        dataVencimento: { lt: hoje },
      },
    }),
    prisma.pedido.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { nome: true } } },
    }),
  ])

  return {
    totalClientes,
    totalCertificadosAtivos,
    vencendo30,
    vencendo60,
    pedidosMes,
    receitaMes: Number(receitaMes._sum.valor ?? 0),
    totalParceiros,
    contasVencidas,
    ultimosPedidos,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const dados = await getDashboardData()

  const cards = [
    {
      titulo: 'Clientes Ativos',
      valor: dados.totalClientes.toLocaleString('pt-BR'),
      icon: Users,
      cor: 'blue',
      descricao: 'total cadastrado',
    },
    {
      titulo: 'Certificados Ativos',
      valor: dados.totalCertificadosAtivos.toLocaleString('pt-BR'),
      icon: Award,
      cor: 'green',
      descricao: 'em vigência',
    },
    {
      titulo: 'Vencem em 30 dias',
      valor: dados.vencendo30.toLocaleString('pt-BR'),
      icon: AlertTriangle,
      cor: dados.vencendo30 > 0 ? 'yellow' : 'green',
      descricao: 'requerem atenção',
    },
    {
      titulo: 'Pedidos no Mês',
      valor: dados.pedidosMes.toLocaleString('pt-BR'),
      icon: ShoppingCart,
      cor: 'purple',
      descricao: new Date().toLocaleString('pt-BR', { month: 'long' }),
    },
    {
      titulo: 'Receita do Mês',
      valor: formatarMoeda(dados.receitaMes),
      icon: DollarSign,
      cor: 'emerald',
      descricao: 'pagamentos recebidos',
    },
    {
      titulo: 'Parceiros Ativos',
      valor: dados.totalParceiros.toLocaleString('pt-BR'),
      icon: Handshake,
      cor: 'indigo',
      descricao: 'indicadores cadastrados',
    },
    {
      titulo: 'Contas Vencidas',
      valor: dados.contasVencidas.toLocaleString('pt-BR'),
      icon: Clock,
      cor: dados.contasVencidas > 0 ? 'red' : 'green',
      descricao: 'a receber/pagar',
    },
    {
      titulo: 'Vencem em 60 dias',
      valor: dados.vencendo60.toLocaleString('pt-BR'),
      icon: TrendingUp,
      cor: 'orange',
      descricao: 'oportunidades de renovação',
    },
  ]

  const corMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    purple: 'bg-purple-100 text-purple-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
  }

  return (
    <div>
      <Header titulo="Dashboard" />

      <div className="p-6 space-y-6">
        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.titulo}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {card.titulo}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.valor}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.descricao}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${corMap[card.cor]}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <DashboardCharts />

        {/* Últimos pedidos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Últimos Pedidos</h2>
            <a href="/pedidos" className="text-sm text-blue-600 hover:underline">
              Ver todos
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {dados.ultimosPedidos.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                Nenhum pedido encontrado
              </p>
            )}
            {dados.ultimosPedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{pedido.numero}</p>
                  <p className="text-xs text-gray-500">{pedido.cliente.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatarMoeda(Number(pedido.valorFinal))}
                  </p>
                  <span
                    className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                      pedido.status === 'CONCLUIDO'
                        ? 'bg-green-100 text-green-700'
                        : pedido.status === 'PENDENTE'
                          ? 'bg-yellow-100 text-yellow-700'
                          : pedido.status === 'CANCELADO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {pedido.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}