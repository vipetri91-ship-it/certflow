import { prisma } from '@/lib/prisma'
import type { TipoEmailAutomatico } from '@/generated/prisma/client'
import { format } from 'date-fns'
import { MARCA_NPS_ENVIADA } from '@/lib/robo/nps'

// Setor "AGR Digital" = robôs de e-mail e WhatsApp automáticos ligados ao
// controle de vencimento (pré-vencimento, vencido, nutrição pós-venda).
// Não inclui POS_EMISSAO, COBRANCA_FINANCEIRA nem CAMPANHA_MARKETING —
// esses não fazem parte do "controle de vencimento" que o Vinicius pediu.
const TIPOS_EMAIL_VENCIMENTO: TipoEmailAutomatico[] = [
  'VENCIMENTO_60', 'VENCIMENTO_30', 'VENCIMENTO_15', 'VENCIMENTO_7',
  'VENCIDO_1', 'VENCIDO_7',
]
const TIPOS_EMAIL_NUTRICAO: TipoEmailAutomatico[] = ['NUTRICAO_3M', 'NUTRICAO_6M', 'NUTRICAO_9M']

export interface RelatorioAgrDigital {
  inicio: Date
  fim: Date
  emailsVencimento: number
  emailsNutricao: number
  whatsappVencimento: number
  whatsappNutricao: number
  renovacoesConvertidas: number
  renovacoesTotais: number
  aniversariosClientes: number
  lembretesAgendamento: number
  reativacoesEnviadas: number
  npsEnviados: number
  npsRespondidos: number
  npsNotaMedia: number | null
}

export async function buscarRelatorioAgrDigital(inicio: Date, fim: Date): Promise<RelatorioAgrDigital> {
  const [
    emailsVencimento, emailsNutricao, historicoWpp, renovacoes,
    aniversariosClientes, lembretesAgendamento, reativacoesEnviadas,
    npsEnviados, npsRespondidos,
  ] = await Promise.all([
    prisma.emailLog.count({
      where: { status: 'ENVIADO', tipo: { in: TIPOS_EMAIL_VENCIMENTO }, enviadoEm: { gte: inicio, lte: fim } },
    }),
    prisma.emailLog.count({
      where: { status: 'ENVIADO', tipo: { in: TIPOS_EMAIL_NUTRICAO }, enviadoEm: { gte: inicio, lte: fim } },
    }),
    prisma.historicoContato.findMany({
      where: {
        createdAt: { gte: inicio, lte: fim },
        OR: [
          { observacao: { startsWith: 'WhatsApp automático' } },
          { observacao: { startsWith: 'WhatsApp nutrição' } },
        ],
      },
      select: { observacao: true },
    }),
    // Certificados novos criados no período que são renovação de um anterior
    // (certificadoAnteriorId preenchido) — para cada um, verifica se o
    // certificado anterior chegou a receber pelo menos um alerta automático
    // (e-mail ou WhatsApp) de vencimento em algum momento.
    prisma.certificado.findMany({
      where: { certificadoAnteriorId: { not: null }, createdAt: { gte: inicio, lte: fim } },
      select: { certificadoAnteriorId: true },
    }),
    prisma.historicoContato.count({
      where: { createdAt: { gte: inicio, lte: fim }, observacao: { startsWith: 'Aniversário do cliente' } },
    }),
    prisma.historicoContato.count({
      where: { createdAt: { gte: inicio, lte: fim }, observacao: { startsWith: 'Lembrete de agendamento enviado' } },
    }),
    prisma.historicoContato.count({
      where: { createdAt: { gte: inicio, lte: fim }, observacao: { startsWith: 'WhatsApp reativação' } },
    }),
    prisma.historicoContato.count({
      where: { createdAt: { gte: inicio, lte: fim }, observacao: MARCA_NPS_ENVIADA },
    }),
    prisma.historicoContato.findMany({
      where: { createdAt: { gte: inicio, lte: fim }, observacao: { startsWith: 'Pesquisa NPS respondida' } },
      select: { observacao: true },
    }),
  ])

  const whatsappVencimento = historicoWpp.filter(h => h.observacao.startsWith('WhatsApp automático')).length
  const whatsappNutricao = historicoWpp.filter(h => h.observacao.startsWith('WhatsApp nutrição')).length

  let renovacoesConvertidas = 0
  for (const r of renovacoes) {
    if (!r.certificadoAnteriorId) continue
    const [emailAlerta, wppAlerta] = await Promise.all([
      prisma.emailLog.findFirst({
        where: { certificadoId: r.certificadoAnteriorId, status: 'ENVIADO', tipo: { in: TIPOS_EMAIL_VENCIMENTO } },
        select: { id: true },
      }),
      prisma.historicoContato.findFirst({
        where: { certificadoId: r.certificadoAnteriorId, observacao: { startsWith: 'WhatsApp automático' } },
        select: { id: true },
      }),
    ])
    if (emailAlerta || wppAlerta) renovacoesConvertidas++
  }

  const notas = npsRespondidos
    .map(r => Number(r.observacao.match(/nota (\d+)/)?.[1]))
    .filter((n): n is number => !Number.isNaN(n))
  const npsNotaMedia = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null

  return {
    inicio, fim,
    emailsVencimento, emailsNutricao,
    whatsappVencimento, whatsappNutricao,
    renovacoesConvertidas, renovacoesTotais: renovacoes.length,
    aniversariosClientes, lembretesAgendamento, reativacoesEnviadas,
    npsEnviados, npsRespondidos: npsRespondidos.length, npsNotaMedia,
  }
}

export function formatarRelatorioAgrDigital(r: RelatorioAgrDigital): string {
  const periodo = `${format(r.inicio, 'dd/MM')} a ${format(r.fim, 'dd/MM')}`
  const totalEmails = r.emailsVencimento + r.emailsNutricao
  const totalWpp = r.whatsappVencimento + r.whatsappNutricao

  // Texto simples (sem markdown): enviarTelegram() não usa parse_mode, então
  // asteriscos/underscores apareceriam literalmente na mensagem.
  return (
    `🏢 Setor AGR Digital — relatório de ${periodo}\n\n` +
    `📧 E-mails automáticos enviados: ${totalEmails}\n` +
    `   • ${r.emailsVencimento} de controle de vencimento\n` +
    `   • ${r.emailsNutricao} de pós-venda (nutrição)\n\n` +
    `💬 WhatsApp automáticos enviados: ${totalWpp}\n` +
    `   • ${r.whatsappVencimento} de controle de vencimento\n` +
    `   • ${r.whatsappNutricao} de pós-venda (nutrição)\n\n` +
    `🔁 Renovações fechadas no período: ${r.renovacoesTotais}\n` +
    `   • ${r.renovacoesConvertidas} vieram de cliente que recebeu alerta de vencimento (e-mail ou WhatsApp)\n\n` +
    `🎂 Aniversários de clientes celebrados: ${r.aniversariosClientes}\n` +
    `📅 Lembretes de agendamento enviados: ${r.lembretesAgendamento}\n` +
    `🔄 Campanha de reativação enviada: ${r.reativacoesEnviadas}\n` +
    `⭐ Pesquisa NPS: ${r.npsEnviados} enviada(s), ${r.npsRespondidos} respondida(s)` +
    (r.npsNotaMedia !== null ? ` — nota média ${r.npsNotaMedia.toFixed(1)}` : '') + `\n\n` +
    (totalEmails === 0 && totalWpp === 0
      ? 'Nenhum envio automático de vencimento/nutrição neste período — normal se a base ainda é recente.'
      : 'Time AGR Digital trabalhando 24h por vocês. 🤖')
  )
}
