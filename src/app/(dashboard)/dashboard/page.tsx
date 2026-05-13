import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { ProducaoTab } from './producao-tab'
import { FinanceiroTab } from './financeiro-tab'
import { AgendaTabDash } from './agenda-tab'
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

async function getDashboardData() {
  const hoje = new Date()
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimDia = new Date(inicioDia.getTime() + 86400000 - 1)
  const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 })
  const fimSemana = endOfWeek(hoje, { weekStartsOn: 0 })
  const inicioMes = startOfMonth(hoje)
  const fimMes = endOfMonth(hoje)

  const [pedidosDia, pedidosSemana, pedidosMes, pedidosDetalhes, vencendo7] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: inicioDia, lte: fimDia }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { createdAt: { gte: inicioSemana, lte: fimSemana }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { createdAt: { gte: inicioMes, lte: fimMes }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.findMany({
      where: { createdAt: { gte: inicioDia, lte: fimDia }, status: { not: 'CANCELADO' } },
      include: {
        cliente: { select: { nome: true, cpf: true, cnpj: true, tipoPessoa: true } },
        parceiro: { select: { nome: true } },
        itens: { include: { modelo: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.certificado.count({
      where: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: addDays(hoje, 7) } },
    }),
  ])

  // Emissões = pedidos com status EMITIDO
  const emissoesDia = await prisma.pedido.count({ where: { emitidoEm: { gte: inicioDia, lte: fimDia } } })
  const emissoesSemana = await prisma.pedido.count({ where: { emitidoEm: { gte: inicioSemana, lte: fimSemana } } })
  const emissoesMes = await prisma.pedido.count({ where: { emitidoEm: { gte: inicioMes, lte: fimMes } } })

  // Performance por AGR no mês
  const agrs = ['ana.karolina', 'arlen', 'vinicius', 'laryssa']
  const performanceAgr = await Promise.all(
    agrs.map(async (agr) => {
      const pedidos = await prisma.pedido.findMany({
        where: { agr, createdAt: { gte: inicioMes, lte: fimMes }, status: { not: 'CANCELADO' } },
        select: { valorFinal: true, emitidoEm: true },
      })
      const emissoes = pedidos.filter(p => p.emitidoEm)
      const valorTotal = pedidos.reduce((acc, p) => acc + Number(p.valorFinal), 0)
      const diasDecorridos = Math.max(1, hoje.getDate())
      return {
        agr,
        vendas: pedidos.length,
        valorVendas: valorTotal,
        emissoes: emissoes.length,
        mediadiaria: pedidos.length / diasDecorridos,
      }
    })
  )

  return {
    pedidosDia, pedidosSemana, pedidosMes,
    emissoesDia, emissoesSemana, emissoesMes,
    pedidosDetalhes: pedidosDetalhes.map(p => ({
      ...p,
      valorFinal: Number(p.valorFinal),
      cliente: {
        ...p.cliente,
        cpf: p.cliente.cpf ?? undefined,
        cnpj: p.cliente.cnpj ?? undefined,
      },
      parceiro: p.parceiro ?? undefined,
    })),
    performanceAgr,
    vencendo7,
    mediaDiaria: pedidosMes / Math.max(1, hoje.getDate()),
    projecaoMensal: (pedidosMes / Math.max(1, hoje.getDate())) * 30,
  }
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams
  const tab = params.tab ?? 'agenda'
  const dados = await getDashboardData()

  // URL do Google Calendar configurada no banco
  const calendarConfig = await prisma.configuracao.findUnique({
    where: { chave: 'google_calendar_embed_url' },
  })

  const tabs = [
    { id: 'agenda', label: 'Agenda' },
    { id: 'producao', label: 'Produção' },
    { id: 'financeiro', label: 'Financeiro' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Dashboard" />

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <a
              key={t.id}
              href={`/dashboard?tab=${t.id}`}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'producao' && <ProducaoTab dados={dados} />}
        {tab === 'agenda' && <AgendaTabDash calendarUrl={calendarConfig?.valor ?? undefined} />}
        {tab === 'financeiro' && <FinanceiroTab />}
      </div>
    </div>
  )
}