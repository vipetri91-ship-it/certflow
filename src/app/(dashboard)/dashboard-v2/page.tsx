import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { addDays, startOfMonth, endOfMonth } from 'date-fns'
import { Header } from '@/components/header'
import { StatusOperacional, type IndicadorStatus, type StatusNivel } from './status-operacional'
import { CertflowAI, type Insight } from './certflow-ai'
import './dashboard-v2.css'

const META_MENSAL = 300

async function getStatusData() {
  const hoje = new Date()
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimDia    = new Date(inicioDia.getTime() + 86400000 - 1)
  const inicioMes = startOfMonth(hoje)
  const fimMes    = endOfMonth(hoje)
  const diasDecorridos = Math.max(1, hoje.getDate())

  const [vendasHoje, vendasMes, vencendo7, aReceberVencidosAgg, aReceberVencidosQtd] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: inicioDia, lte: fimDia }, status: { not: 'CANCELADO' } } }),
    prisma.pedido.count({ where: { createdAt: { gte: inicioMes, lte: fimMes }, status: { not: 'CANCELADO' } } }),
    prisma.certificado.count({ where: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: addDays(hoje, 7) } } }),
    prisma.lancamento.aggregate({ _sum: { valor: true }, where: { tipo: 'RECEBER', status: 'PENDENTE', dataVencimento: { lt: hoje } } }),
    prisma.lancamento.count({ where: { tipo: 'RECEBER', status: 'PENDENTE', dataVencimento: { lt: hoje } } }),
  ])

  return {
    vendasHoje,
    vendasMes,
    mediaDiaria: vendasMes / diasDecorridos,
    vencendo7,
    aReceberVencidos: Number(aReceberVencidosAgg._sum.valor ?? 0),
    aReceberVencidosQtd,
    meta: META_MENSAL,
  }
}

const fmtMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const ORDEM_STATUS: Record<StatusNivel, number> = { ok: 0, atencao: 1, critico: 2 }
const piorStatus = (a: StatusNivel, b: StatusNivel) => (ORDEM_STATUS[b] > ORDEM_STATUS[a] ? b : a)

const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 }

export default async function DashboardV2Page() {
  const session = await auth()
  if (!session) redirect('/login')

  const dados = await getStatusData()

  // ── Status Operacional ────────────────────────────────────────────────
  const indicadores: IndicadorStatus[] = [
    {
      label: 'Vendas hoje',
      valor: `${dados.vendasHoje}`,
      detalhe: `Média diária do mês: ${dados.mediaDiaria.toFixed(1)}`,
      status: dados.vendasHoje >= dados.mediaDiaria
        ? 'ok'
        : dados.vendasHoje >= dados.mediaDiaria * 0.5 ? 'atencao' : 'critico',
    },
    {
      label: 'Vencimentos (7 dias)',
      valor: `${dados.vencendo7}`,
      detalhe: 'certificados a vencer',
      status: dados.vencendo7 === 0 ? 'ok' : dados.vencendo7 <= 5 ? 'atencao' : 'critico',
    },
    {
      label: 'Contas vencidas',
      valor: fmtMoeda(dados.aReceberVencidos),
      detalhe: `${dados.aReceberVencidosQtd} conta${dados.aReceberVencidosQtd !== 1 ? 's' : ''} em atraso`,
      status: dados.aReceberVencidosQtd === 0 ? 'ok' : dados.aReceberVencidosQtd <= 3 ? 'atencao' : 'critico',
    },
  ]

  const statusGeral = indicadores.reduce<StatusNivel>((acc, ind) => piorStatus(acc, ind.status), 'ok')

  // ── CertFlow AI — insights baseados em regras ───────────────────────────
  const insights: Insight[] = []

  if (dados.vencendo7 > 0) {
    insights.push({
      texto: `${dados.vencendo7} certificado${dados.vencendo7 !== 1 ? 's' : ''} vence${dados.vencendo7 !== 1 ? 'm' : ''} nos próximos 7 dias. Priorize o contato com ${dados.vencendo7 !== 1 ? 'esses clientes' : 'esse cliente'}.`,
      prioridade: dados.vencendo7 > 5 ? 'alta' : 'media',
    })
  }

  if (dados.aReceberVencidosQtd > 0) {
    insights.push({
      texto: `${dados.aReceberVencidosQtd} conta${dados.aReceberVencidosQtd !== 1 ? 's' : ''} a receber está${dados.aReceberVencidosQtd !== 1 ? 'ão' : ''} em atraso, totalizando ${fmtMoeda(dados.aReceberVencidos)}.`,
      prioridade: dados.aReceberVencidosQtd > 3 ? 'alta' : 'media',
    })
  }

  if (dados.mediaDiaria > 0 && dados.vendasHoje < dados.mediaDiaria * 0.5) {
    insights.push({
      texto: `As vendas de hoje (${dados.vendasHoje}) estão abaixo da média diária do mês (${dados.mediaDiaria.toFixed(1)}).`,
      prioridade: 'media',
    })
  }

  const faltamMeta = Math.max(dados.meta - dados.vendasMes, 0)
  insights.push(
    faltamMeta > 0
      ? { texto: `Faltam ${faltamMeta} venda${faltamMeta !== 1 ? 's' : ''} para bater a meta do mês (${dados.vendasMes}/${dados.meta}).`, prioridade: 'baixa' }
      : { texto: `Meta mensal já atingida! ${dados.vendasMes}/${dados.meta} vendas.`, prioridade: 'baixa' }
  )

  insights.sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade])

  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Dashboard 2.0" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 lg:p-5 space-y-4">
          <StatusOperacional indicadores={indicadores} statusGeral={statusGeral} />
          <CertflowAI insights={insights} />
        </div>
      </div>
    </div>
  )
}