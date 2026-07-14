import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarTelegram } from '@/lib/telegram'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

function fmtMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// Briefing diário em linguagem natural, no Telegram — mesmos dados do
// relatório diário por e-mail (src/app/api/jobs/relatorio-diario), só que
// falado como conversa em vez de HTML. Consultas próprias e independentes
// de propósito: relatorio-diario é um job em produção já usado todo dia
// (regra de governança 2), então evitei mexer nele para extrair lib
// compartilhada — se fizer sentido depois, revisitar.
export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const inicio = startOfDay(hoje)
  const fim = endOfDay(hoje)

  const [pedidosDia, clientesDia, receitaDia, vencendo7, vencidosNaoRenovados, pedidosTravados] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: inicio, lte: fim }, ignorarMetricasVendas: false },
      include: { cliente: { select: { nome: true } } },
    }),
    prisma.cliente.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    prisma.lancamento.aggregate({
      _sum: { valor: true },
      where: { tipo: 'RECEBER', status: 'PAGO', dataPagamento: { gte: inicio, lte: fim } },
    }),
    prisma.certificado.count({
      where: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: new Date(hoje.getTime() + 7 * 86_400_000) } },
    }),
    prisma.certificado.count({
      where: { status: 'ATIVO', dataVencimento: { lt: hoje } },
    }),
    prisma.pedido.findMany({
      where: { status: { in: ['GERADO', 'VERIFICADO'] }, createdAt: { lt: new Date(hoje.getTime() - 48 * 60 * 60 * 1000) } },
      select: { numero: true, cliente: { select: { nome: true } } },
      take: 5,
    }),
  ])

  const valorPedidosDia = pedidosDia.reduce((acc, p) => acc + Number(p.valorFinal), 0)
  const receitaTotal = Number(receitaDia._sum.valor ?? 0)
  const dataFormatada = format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })

  const partes: string[] = []
  partes.push(`👋 Boa noite! Aqui é a Secretária com o resumo de ${dataFormatada}.\n`)

  if (pedidosDia.length === 0) {
    partes.push('Hoje não fechamos nenhum pedido novo.')
  } else {
    partes.push(`Hoje fechamos ${pedidosDia.length} pedido${pedidosDia.length > 1 ? 's' : ''}, somando ${fmtMoeda(valorPedidosDia)}.`)
  }

  if (receitaTotal > 0) {
    partes.push(`Entrou ${fmtMoeda(receitaTotal)} em recebimentos hoje.`)
  }

  if (clientesDia > 0) {
    partes.push(`${clientesDia} cliente${clientesDia > 1 ? 's novos foram cadastrados' : ' novo foi cadastrado'}.`)
  }

  partes.push('')
  if (vencendo7 > 0) {
    partes.push(`⚠️ Atenção: ${vencendo7} certificado${vencendo7 > 1 ? 's vencem' : ' vence'} nos próximos 7 dias.`)
  }
  if (vencidosNaoRenovados > 0) {
    partes.push(`🔴 Temos ${vencidosNaoRenovados} certificado${vencidosNaoRenovados > 1 ? 's' : ''} vencido${vencidosNaoRenovados > 1 ? 's' : ''} e ainda ativo${vencidosNaoRenovados > 1 ? 's' : ''} no sistema (não renovado${vencidosNaoRenovados > 1 ? 's' : ''}).`)
  }
  if (pedidosTravados.length > 0) {
    partes.push(`🕐 ${pedidosTravados.length} pedido${pedidosTravados.length > 1 ? 's estão parados' : ' está parado'} há mais de 2 dias: ${pedidosTravados.map(p => `${p.numero} (${p.cliente.nome})`).join(', ')}.`)
  }
  if (vencendo7 === 0 && vencidosNaoRenovados === 0 && pedidosTravados.length === 0) {
    partes.push('✅ Nada travado, nada vencendo essa semana — sistema em dia.')
  }

  partes.push('\nOs robôs de e-mail e WhatsApp continuam rodando 24h cuidando do controle de vencimento. Qualquer coisa, é só me chamar.')

  const texto = partes.join('\n')
  const envio = await enviarTelegram(texto)

  await registrarHeartbeat('secretaria-diaria')
  return NextResponse.json({ ok: envio.ok, erro: envio.erro, resumo: { pedidos: pedidosDia.length, valorPedidosDia, receitaTotal, vencendo7, vencidosNaoRenovados, travados: pedidosTravados.length } })
}
