import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarTelegram } from '@/lib/telegram'
import { registrarHeartbeat, buscarUltimaExecucao } from '@/lib/robo/heartbeat'
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

  const [pedidosDia, clientesDia, receitaDia, vencendo7, vencidosNaoRenovados, pedidosTravados, ultimaEmail, ultimaWhats, emailsHoje] = await Promise.all([
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
    buscarUltimaExecucao('processar-emails'),
    buscarUltimaExecucao('processar-whatsapp'),
    prisma.emailLog.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
  ])

  const valorPedidosDia = pedidosDia.reduce((acc, p) => acc + Number(p.valorFinal), 0)
  const receitaTotal = Number(receitaDia._sum.valor ?? 0)
  const dataFormatada = format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })

  // Antes "Boa noite!" era texto fixo — sempre a mesma saudação, não olhava
  // a hora real nenhuma. Só coincidia de fazer sentido porque o job normalmente
  // só roda às 18h05 BRT; qualquer disparo fora do horário (manual, catch-up
  // do robô de verificação leve) mandava a saudação errada (achado
  // 17/07/2026). Railway roda em UTC — converte pra BRT (UTC-3) antes de
  // decidir bom dia / boa tarde / boa noite.
  const horaBRT = (hoje.getUTCHours() - 3 + 24) % 24
  const saudacao = horaBRT < 12 ? 'Bom dia' : horaBRT < 18 ? 'Boa tarde' : 'Boa noite'

  const partes: string[] = []
  partes.push(`👋 ${saudacao}! Aqui é a Secretária com o resumo de ${dataFormatada}.\n`)

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

  // Antes essa linha era um texto fixo ("os robôs continuam rodando 24h,
  // tudo funcionando") que aparecia todo dia sem checar nada de verdade —
  // diria "tudo perfeito" mesmo se os robôs estivessem parados. Achado
  // 17/07/2026, a pedido do Vinicius, depois de receber essa mensagem
  // repetidamente enquanto investigava se e-mails estavam mesmo saindo.
  // Agora é status real, batido contra o heartbeat de cada robô.
  const rodouEmailHoje = ultimaEmail !== null && ultimaEmail >= inicio
  const rodouWhatsHoje = ultimaWhats !== null && ultimaWhats >= inicio
  if (rodouEmailHoje && rodouWhatsHoje) {
    partes.push(`\n✅ Robô de e-mail rodou hoje às ${format(ultimaEmail!, 'HH:mm')} (${emailsHoje} e-mail${emailsHoje !== 1 ? 's' : ''} processado${emailsHoje !== 1 ? 's' : ''} no dia) e o robô de WhatsApp rodou às ${format(ultimaWhats!, 'HH:mm')}.`)
  } else {
    const faltando = [
      !rodouEmailHoje && 'e-mail',
      !rodouWhatsHoje && 'WhatsApp',
    ].filter(Boolean).join(' e ')
    partes.push(`\n🚨 O robô de ${faltando} de vencimento NÃO rodou hoje — precisa verificar.`)
  }
  partes.push('Qualquer coisa, é só me chamar.')

  const texto = partes.join('\n')
  const envio = await enviarTelegram(texto)

  await registrarHeartbeat('secretaria-diaria')
  return NextResponse.json({ ok: envio.ok, erro: envio.erro, resumo: { pedidos: pedidosDia.length, valorPedidosDia, receitaTotal, vencendo7, vencidosNaoRenovados, travados: pedidosTravados.length } })
}
