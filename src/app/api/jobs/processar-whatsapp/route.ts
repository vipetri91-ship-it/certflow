import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp, gerarMensagemWhatsApp, gerarMensagemNutricaoWhatsApp } from '@/lib/digisac'
import { marcoMaisUrgenteAplicavel, type Marco } from '@/lib/marco-mais-urgente'
import { addDays, addMonths, differenceInCalendarDays, differenceInMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'

// Mesmos marcos (ordenados do mais urgente pro menos urgente) usados em
// processar-emails/route.ts, aplicados aqui ao WhatsApp. O dedup usa
// HistoricoContato (texto), não uma coluna de enum como o EmailLog —
// por isso cada marco tem um texto fixo associado (MARCA_TEXTO).
type MarcoWpp = 'WPP_ANTES_60' | 'WPP_ANTES_30' | 'WPP_ANTES_15' | 'WPP_ANTES_7' | 'WPP_DEPOIS_7' | 'WPP_DEPOIS_1'

const MARCOS_ANTES: Marco<MarcoWpp>[] = [
  { limite: 7, tipo: 'WPP_ANTES_7' },
  { limite: 15, tipo: 'WPP_ANTES_15' },
  { limite: 30, tipo: 'WPP_ANTES_30' },
  { limite: 60, tipo: 'WPP_ANTES_60' },
]

const MARCOS_DEPOIS: Marco<MarcoWpp>[] = [
  { limite: 7, tipo: 'WPP_DEPOIS_7' },
  { limite: 1, tipo: 'WPP_DEPOIS_1' },
]

const MARCA_TEXTO: Record<MarcoWpp, string> = {
  WPP_ANTES_60: 'WhatsApp automático — 60 dias antes do vencimento',
  WPP_ANTES_30: 'WhatsApp automático — 30 dias antes do vencimento',
  WPP_ANTES_15: 'WhatsApp automático — 15 dias antes do vencimento',
  WPP_ANTES_7: 'WhatsApp automático — 7 dias antes do vencimento',
  WPP_DEPOIS_7: 'WhatsApp automático — VENCIDO há 7 dias',
  WPP_DEPOIS_1: 'WhatsApp automático — VENCIDO há 1 dia',
}
const TEXTO_PARA_MARCA = Object.fromEntries(
  Object.entries(MARCA_TEXTO).map(([marca, texto]) => [texto, marca as MarcoWpp])
) as Record<string, MarcoWpp>

const MARCOS_NUTRICAO: Marco<1 | 2 | 3>[] = [
  { limite: 9, tipo: 3 },
  { limite: 6, tipo: 2 },
  { limite: 3, tipo: 1 },
]
const MARCA_NUTRICAO: Record<1 | 2 | 3, string> = {
  1: 'WhatsApp nutrição — 3 meses',
  2: 'WhatsApp nutrição — 6 meses',
  3: 'WhatsApp nutrição — 9 meses',
}
const TEXTO_PARA_TRIMESTRE = Object.fromEntries(
  Object.entries(MARCA_NUTRICAO).map(([trimestre, texto]) => [texto, Number(trimestre) as 1 | 2 | 3])
) as Record<string, 1 | 2 | 3>

function autenticado(req: NextRequest): boolean {
  const headerToken = req.headers.get('x-job-token')
  const secret = process.env.AUTH_SECRET
  return headerToken === secret
}

// Busca, entre os textos de marca possíveis, quais já foram gravados no
// histórico de contato deste certificado — usado para não reenviar.
async function buscarMarcasJaEnviadas(certificadoId: string, textosPossiveis: string[]): Promise<Set<string>> {
  const registros = await prisma.historicoContato.findMany({
    where: { certificadoId, observacao: { in: textosPossiveis } },
    select: { observacao: true },
  })
  return new Set(registros.map((r) => r.observacao))
}

async function executarJob() {
  const hoje = new Date()
  // Início do dia de hoje — evita que a hora exata em que o robô roda
  // exclua, por horas, um certificado que vence/venceu/foi emitido hoje.
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const resultado = { enviados: 0, erros: 0, pulados: 0 }

  // ── Pré-vencimento (60, 30, 15, 7 dias antes) ─────────────────────────────
  const candidatosAntes = await prisma.certificado.findMany({
    where: {
      status: 'ATIVO',
      dataVencimento: { gte: inicioHoje, lt: addDays(inicioHoje, 61) },
      cliente: { OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
    },
    include: {
      cliente: {
        select: { id: true, nome: true, celular: true, telefone: true, parceiroId: true },
        include: { parceiro: { select: { whatsappVencimentoAtivo: true } } },
      },
      modelo: { select: { nome: true } },
    },
  })

  for (const cert of candidatosAntes) {
    const telefone = cert.cliente.celular ?? cert.cliente.telefone
    if (!telefone) { resultado.pulados++; continue }
    if (cert.cliente.parceiro?.whatsappVencimentoAtivo === false) { resultado.pulados++; continue }

    const diasRestantes = differenceInCalendarDays(cert.dataVencimento, hoje)
    const textosEnviados = await buscarMarcasJaEnviadas(cert.id, Object.values(MARCA_TEXTO))
    const jaEnviados = new Set([...textosEnviados].map((t) => TEXTO_PARA_MARCA[t]))
    const marca = marcoMaisUrgenteAplicavel(MARCOS_ANTES, (limite) => diasRestantes <= limite, jaEnviados)
    if (!marca) { resultado.pulados++; continue }

    const mensagem = gerarMensagemWhatsApp({
      nomeCliente: cert.cliente.nome,
      modeloCertificado: cert.modelo.nome,
      dataVencimento: format(cert.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
      diasRestantes,
    })

    const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: cert.cliente.nome })
    if (envio.ok) {
      await prisma.historicoContato.create({
        data: { clienteId: cert.cliente.id, certificadoId: cert.id, observacao: MARCA_TEXTO[marca] },
      })
      resultado.enviados++
    } else {
      resultado.erros++
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  // ── Pós-vencimento (1 e 7 dias depois — urgência máxima) ──────────────────
  const candidatosDepois = await prisma.certificado.findMany({
    where: {
      status: { in: ['ATIVO', 'VENCIDO'] },
      dataVencimento: { gte: addDays(inicioHoje, -7), lt: inicioHoje },
      cliente: { OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
    },
    include: {
      cliente: {
        select: { id: true, nome: true, celular: true, telefone: true, parceiroId: true },
        include: { parceiro: { select: { whatsappVencimentoAtivo: true } } },
      },
      modelo: { select: { nome: true } },
    },
  })

  for (const cert of candidatosDepois) {
    const telefone = cert.cliente.celular ?? cert.cliente.telefone
    if (!telefone) { resultado.pulados++; continue }
    if (cert.cliente.parceiro?.whatsappVencimentoAtivo === false) { resultado.pulados++; continue }

    const diasVencido = differenceInCalendarDays(hoje, cert.dataVencimento)
    const textosEnviados = await buscarMarcasJaEnviadas(cert.id, Object.values(MARCA_TEXTO))
    const jaEnviados = new Set([...textosEnviados].map((t) => TEXTO_PARA_MARCA[t]))
    const marca = marcoMaisUrgenteAplicavel(MARCOS_DEPOIS, (limite) => diasVencido >= limite, jaEnviados)
    if (!marca) { resultado.pulados++; continue }

    const mensagem = gerarMensagemWhatsApp({
      nomeCliente: cert.cliente.nome,
      modeloCertificado: cert.modelo.nome,
      dataVencimento: format(cert.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
      diasRestantes: -diasVencido,
    })

    const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: cert.cliente.nome })
    if (envio.ok) {
      await prisma.historicoContato.create({
        data: { clienteId: cert.cliente.id, certificadoId: cert.id, observacao: MARCA_TEXTO[marca] },
      })
      resultado.enviados++
    } else {
      resultado.erros++
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  // ── Nutrição por WhatsApp (3, 6, 9 meses após emissão) ────────────────────
  const candidatosNutricao = await prisma.certificado.findMany({
    where: {
      status: 'ATIVO',
      dataEmissao: { gte: addMonths(inicioHoje, -9), lt: addDays(inicioHoje, 1) },
      cliente: { OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
    },
    include: {
      cliente: {
        select: { id: true, nome: true, celular: true, telefone: true, parceiroId: true },
        include: { parceiro: { select: { whatsappVencimentoAtivo: true } } },
      },
    },
  })

  for (const cert of candidatosNutricao) {
    const telefone = cert.cliente.celular ?? cert.cliente.telefone
    if (!telefone) { resultado.pulados++; continue }
    if (cert.cliente.parceiro?.whatsappVencimentoAtivo === false) { resultado.pulados++; continue }

    const mesesPassados = differenceInMonths(hoje, cert.dataEmissao)
    const textosEnviados = await buscarMarcasJaEnviadas(cert.id, Object.values(MARCA_NUTRICAO))
    const jaEnviados = new Set([...textosEnviados].map((t) => TEXTO_PARA_TRIMESTRE[t]))
    const trimestre = marcoMaisUrgenteAplicavel(MARCOS_NUTRICAO, (limite) => mesesPassados >= limite, jaEnviados)
    if (!trimestre) { resultado.pulados++; continue }

    const mensagem = gerarMensagemNutricaoWhatsApp({ nomeCliente: cert.cliente.nome, trimestre })

    const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: cert.cliente.nome })
    if (envio.ok) {
      await prisma.historicoContato.create({
        data: { clienteId: cert.cliente.id, certificadoId: cert.id, observacao: MARCA_NUTRICAO[trimestre] },
      })
      resultado.enviados++
    } else {
      resultado.erros++
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  return resultado
}

// POST — único método aceito, exige o token de robô (ver scripts/cron-worker.js).
// O GET sem autenticação que existia aqui (herdado do Vercel Cron) foi removido
// nesta revisão: ninguém mais chama esse endpoint sem token desde que o
// certflow-cron passou a disparar tudo via POST (25/06/2026).
export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }
  const resultado = await executarJob()
  await registrarHeartbeat('processar-whatsapp')
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
