import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { PainelAGR } from './painel-agr'
import { VencimentosWidget } from './vencimentos-widget'
import { CalendarioMini } from './calendario-mini'
import { PedidosAbertos } from './pedidos-abertos'
import { KpiCarousel } from './kpi-carousel'
import { WidgetFinanceiro } from './widget-financeiro'
import { Header } from '@/components/header'
import { MetaCelebracao } from '@/components/meta-celebracao'

const AGR_KEYS = ['ana.karolina', 'arlen', 'vinicius', 'laryssa']

async function getDashboardData() {
  const hoje = new Date()
  const inicioDia   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimDia      = new Date(inicioDia.getTime() + 86400000 - 1)
  const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 })
  const fimSemana   = endOfWeek(hoje, { weekStartsOn: 0 })
  const inicioMes   = startOfMonth(hoje)
  const fimMes      = endOfMonth(hoje)
  const inicioAno   = startOfYear(hoje)
  const fimAno      = endOfYear(hoje)

  // Helper para buscar pedidos detalhados de um período
  async function buscarPedidos(gte: Date, lte: Date, limite = 500) {
    const pedidos = await prisma.pedido.findMany({
      where: { createdAt: { gte, lte }, status: { not: 'CANCELADO' } },
      include: {
        cliente: { select: { nome: true, cpf: true, cnpj: true } },
        parceiro: { select: { nome: true } },
        itens: { include: { modelo: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
    })
    return pedidos.map(p => ({
      ...p,
      valorFinal: Number(p.valorFinal),
      cliente: { ...p.cliente, cpf: p.cliente.cpf ?? undefined, cnpj: p.cliente.cnpj ?? undefined },
      parceiro: p.parceiro ?? undefined,
    }))
  }

  const [
    pedidosDia, pedidosSemana, pedidosMes, pedidosAno,
    vencendo7,
    emissoesDia, emissoesSemana, emissoesMes, emissoesAno,
    fatDia, fatSemana, fatMes, fatAno,
    detalheDia, detalheSemana, detalheMes, detalheAno,
    aReceberAgg,
  ] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: inicioDia,   lte: fimDia   }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { createdAt: { gte: inicioSemana,lte: fimSemana}, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { createdAt: { gte: inicioMes,   lte: fimMes   }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { createdAt: { gte: inicioAno,   lte: fimAno   }, status: { not: 'CANCELADO' } } }),
    prisma.certificado.count({ where: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: addDays(hoje, 7) } } }),
    prisma.pedido.count({ where: { emitidoEm: { gte: inicioDia,    lte: fimDia    } } }),
    prisma.pedido.count({ where: { emitidoEm: { gte: inicioSemana, lte: fimSemana } } }),
    prisma.pedido.count({ where: { emitidoEm: { gte: inicioMes,    lte: fimMes    } } }),
    prisma.pedido.count({ where: { emitidoEm: { gte: inicioAno,    lte: fimAno    } } }),
    prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicioDia,    lte: fimDia    }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicioSemana, lte: fimSemana }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicioMes,    lte: fimMes    }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicioAno,    lte: fimAno    }, status: { not: 'CANCELADO' } } }),
    buscarPedidos(inicioDia,    fimDia,    200),
    buscarPedidos(inicioSemana, fimSemana, 500),
    buscarPedidos(inicioMes,    fimMes,    500),
    buscarPedidos(inicioAno,    fimAno,    1000),
    prisma.lancamento.aggregate({ _sum: { valor: true }, where: { tipo: 'RECEBER', status: 'PENDENTE', dataVencimento: { gte: inicioMes, lte: fimMes } } }),
  ])

  const diasDecorridos = Math.max(1, hoje.getDate())
  const performanceAgr = await Promise.all(
    AGR_KEYS.map(async (agr) => {
      const pedidos = await prisma.pedido.findMany({
        where: { agr, createdAt: { gte: inicioMes, lte: fimMes }, status: { not: 'CANCELADO' } },
        select: { valorFinal: true, emitidoEm: true },
      })
      return {
        agr,
        vendas: pedidos.length,
        valorVendas: pedidos.reduce((acc, p) => acc + Number(p.valorFinal), 0),
        emissoes: pedidos.filter(p => p.emitidoEm).length,
        mediadiaria: pedidos.length / diasDecorridos,
      }
    })
  )

  return {
    slides: [
      { label: 'Vendas Hoje',     vendas: pedidosDia,    emissoes: emissoesDia,    faturamento: Number(fatDia._sum.valorFinal    ?? 0), periodo: 'dia'    as const, pedidos: detalheDia    },
      { label: 'Vendas na Semana',vendas: pedidosSemana, emissoes: emissoesSemana, faturamento: Number(fatSemana._sum.valorFinal ?? 0), periodo: 'semana' as const, pedidos: detalheSemana },
      { label: 'Vendas no Mês',   vendas: pedidosMes,    emissoes: emissoesMes,    faturamento: Number(fatMes._sum.valorFinal    ?? 0), periodo: 'mês'    as const, pedidos: detalheMes    },
      { label: 'Vendas no Ano',   vendas: pedidosAno,    emissoes: emissoesAno,    faturamento: Number(fatAno._sum.valorFinal    ?? 0), periodo: 'ano'    as const, pedidos: detalheAno    },
    ],
    performanceAgr,
    vencendo7,
    mediaDiaria:    pedidosMes / diasDecorridos,
    projecaoMensal: (pedidosMes / diasDecorridos) * 30,
    vendasHoje:     pedidosDia,
    vendasMes:      pedidosMes,
    faturamentoMes: Number(fatMes._sum.valorFinal ?? 0),
    emissoesMes,
    aReceber:       Number(aReceberAgg._sum.valor ?? 0),
  }
}

async function getVencimentosData() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const d7  = new Date(hoje); d7.setDate(hoje.getDate() + 7)
  const d15 = new Date(hoje); d15.setDate(hoje.getDate() + 15)
  const d30 = new Date(hoje); d30.setDate(hoje.getDate() + 30)

  const include = {
    cliente: { select: { id: true, nome: true, cpf: true, cnpj: true, celular: true, email: true } },
    modelo: { select: { nome: true } },
  }

  const [vencidos, em7, em15, em30] = await Promise.all([
    prisma.certificado.findMany({ where: { status: 'ATIVO', dataVencimento: { lt: hoje } }, include, orderBy: { dataVencimento: 'asc' }, take: 200 }),
    prisma.certificado.findMany({ where: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: d7 } }, include, orderBy: { dataVencimento: 'asc' }, take: 200 }),
    prisma.certificado.findMany({ where: { status: 'ATIVO', dataVencimento: { gt: d7, lte: d15 } }, include, orderBy: { dataVencimento: 'asc' }, take: 200 }),
    prisma.certificado.findMany({ where: { status: 'ATIVO', dataVencimento: { gt: d15, lte: d30 } }, include, orderBy: { dataVencimento: 'asc' }, take: 200 }),
  ])

  // Próximos 6 meses
  const proximosMeses = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 0, 23, 59, 59)
      return prisma.certificado.findMany({
        where: { status: 'ATIVO', dataVencimento: { gte: d, lte: fim } },
        include: { cliente: { select: { tipoPessoa: true } } },
      }).then(certs => ({
        mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total: certs.length,
        pf: certs.filter(c => c.cliente.tipoPessoa === 'PF').length,
        pj: certs.filter(c => c.cliente.tipoPessoa === 'PJ').length,
      }))
    })
  )

  return {
    vencidos: vencidos.map(c => ({ ...c, dataVencimento: c.dataVencimento.toISOString() })),
    em7:      em7.map(c => ({ ...c, dataVencimento: c.dataVencimento.toISOString() })),
    em15:     em15.map(c => ({ ...c, dataVencimento: c.dataVencimento.toISOString() })),
    em30:     em30.map(c => ({ ...c, dataVencimento: c.dataVencimento.toISOString() })),
    proximosMeses,
  }
}

interface Props { searchParams: Promise<{ tab?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const tab = params.tab ?? 'producao'

  const [dados, vencimentos, calendarConfig] = await Promise.all([
    getDashboardData(),
    getVencimentosData(),
    prisma.configuracao.findUnique({ where: { chave: 'google_calendar_embed_url' } }),
  ])

  const isAdmin = ['ADMIN', 'GERENTE'].includes(session.user.role)

  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">

      <MetaCelebracao vendasMes={dados.vendasMes} />
      <Header titulo="Dashboard" />

      {/* Aviso de vencimentos */}
      {dados.vencendo7 > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-5 py-2 flex items-center">
          <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">
            ⚠ {dados.vencendo7} certificado{dados.vencendo7 !== 1 ? 's' : ''} vencem em 7 dias
          </span>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col xl:flex-row gap-4 p-4 lg:p-5">

          {/* ── Coluna principal ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* AGR mobile */}
            <div className="xl:hidden">
              <PainelAGR
                performanceAgr={dados.performanceAgr}
                isAdmin={isAdmin}
                userName={session.user.name ?? ''}
                userAgr={null}
                compact
              />
            </div>

            {/* ── 6 widgets iguais 3×2 ──────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              style={{ gridAutoRows: '288px' }}>

              {/* 1 — Carrossel de vendas (azul, com setas) */}
              <KpiCarousel
                slides={dados.slides}
                mediaDiaria={dados.mediaDiaria}
                projecaoMensal={dados.projecaoMensal}
              />

              {/* 2 — Financeiro */}
              <WidgetFinanceiro
                faturamentoMes={dados.faturamentoMes}
                aReceber={dados.aReceber}
                vencendo7={dados.vencendo7}
              />

              {/* 3 — Agenda */}
              <CalendarioMini calendarUrl={calendarConfig?.valor ?? undefined} />

              {/* 4 — Pedidos em Aberto */}
              <PedidosAbertos />

              {/* 5 e 6 — a definir */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center px-4">Widget 5<br/><span className="text-xs">A definir</span></p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center px-4">Widget 6<br/><span className="text-xs">A definir</span></p>
              </div>
            </div>

            {/* ── Controle de Vencimentos (full width) ───────────── */}
            <VencimentosWidget
              vencidos={vencimentos.vencidos}
              em7={vencimentos.em7}
              em15={vencimentos.em15}
              em30={vencimentos.em30}
              proximosMeses={vencimentos.proximosMeses}
            />
          </div>

          {/* ── AGR lateral desktop ───────────────────────────────── */}
          <div className="hidden xl:block shrink-0">
            <PainelAGR
              performanceAgr={dados.performanceAgr}
              isAdmin={isAdmin}
              userName={session.user.name ?? ''}
              userAgr={null}
            />
          </div>

        </div>
      </div>
    </div>
  )
}