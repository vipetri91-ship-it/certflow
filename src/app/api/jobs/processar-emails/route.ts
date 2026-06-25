import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarEmail } from '@/lib/email/enviar'
import { templateVencimento, templateVencido, templatePosEmissao, templateNutricao } from '@/lib/email/templates'
import { marcoMaisUrgenteAplicavel, type Marco } from '@/lib/marco-mais-urgente'
import type { TipoEmailAutomatico } from '@/generated/prisma/client'
import { addDays, addMonths, differenceInCalendarDays, differenceInMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Protege o endpoint com um secret de job (cron externo ou chamada interna)
function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

// Marcos ordenados do mais urgente para o menos urgente. Se um certificado
// "pula" direto pra uma janela mais urgente (ex.: importado já perto do
// vencimento), dispara só o marco mais urgente aplicável — nunca todos de
// uma vez, e nunca um marco menos urgente se um mais urgente já se aplica.
const MARCOS_ANTES: Marco<TipoEmailAutomatico>[] = [
  { limite: 7, tipo: 'VENCIMENTO_7' },
  { limite: 15, tipo: 'VENCIMENTO_15' },
  { limite: 30, tipo: 'VENCIMENTO_30' },
  { limite: 60, tipo: 'VENCIMENTO_60' },
]

const MARCOS_DEPOIS: Marco<TipoEmailAutomatico>[] = [
  { limite: 7, tipo: 'VENCIDO_7' },
  { limite: 1, tipo: 'VENCIDO_1' },
]

const MARCOS_NUTRICAO: { marco: Marco<TipoEmailAutomatico>; trimestre: 1 | 2 | 3 }[] = [
  { marco: { limite: 9, tipo: 'NUTRICAO_9M' }, trimestre: 3 },
  { marco: { limite: 6, tipo: 'NUTRICAO_6M' }, trimestre: 2 },
  { marco: { limite: 3, tipo: 'NUTRICAO_3M' }, trimestre: 1 },
]

export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  // Início do dia de hoje — usado como referência em todas as comparações de
  // data, para não depender da hora exata em que o robô roda (ex.: um
  // certificado que vence hoje de madrugada não pode "escapar" da régua só
  // porque o job roda à tarde).
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const resultado = { vencimentos: 0, vencidos: 0, posEmissao: 0, nutricao: 0, erros: 0 }

  // ── 1. E-mails de pré-vencimento (60, 30, 15, 7 dias antes) ───────────────
  const candidatosAntes = await prisma.certificado.findMany({
    where: {
      status: 'ATIVO',
      dataVencimento: { gte: inicioHoje, lt: addDays(inicioHoje, 61) },
      cliente: { email: { not: null } },
    },
    include: {
      cliente: {
        select: { id: true, nome: true, email: true, parceiroId: true },
        include: { parceiro: { select: { emailVencimentoAtivo: true } } },
      },
      modelo: { select: { nome: true } },
      emailsEnviados: { select: { tipo: true } },
    },
  })

  for (const cert of candidatosAntes) {
    if (!cert.cliente.email) continue
    if (cert.cliente.parceiro?.emailVencimentoAtivo === false) continue

    const diasRestantes = differenceInCalendarDays(cert.dataVencimento, hoje)
    const jaEnviados = new Set(cert.emailsEnviados.map((e) => e.tipo))
    const tipo = marcoMaisUrgenteAplicavel(MARCOS_ANTES, (limite) => diasRestantes <= limite, jaEnviados)
    if (!tipo) continue

    try {
      const { assunto, html } = templateVencimento(
        {
          nomeCliente: cert.cliente.nome,
          modeloCertificado: cert.modelo.nome,
          dataVencimento: format(cert.dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
          diasRestantes,
        },
        diasRestantes
      )
      await enviarEmail({
        clienteId: cert.cliente.id,
        certificadoId: cert.id,
        tipo,
        destinatario: cert.cliente.email,
        assunto,
        html,
      })
      resultado.vencimentos++
    } catch {
      resultado.erros++
    }
  }

  // ── 2. E-mails de pós-vencimento (1 e 7 dias depois — reforço de renovação) ─
  const candidatosDepois = await prisma.certificado.findMany({
    where: {
      status: { in: ['ATIVO', 'VENCIDO'] },
      dataVencimento: { gte: addDays(inicioHoje, -7), lt: inicioHoje },
      cliente: { email: { not: null } },
    },
    include: {
      cliente: {
        select: { id: true, nome: true, email: true, parceiroId: true },
        include: { parceiro: { select: { emailVencimentoAtivo: true } } },
      },
      modelo: { select: { nome: true } },
      emailsEnviados: { select: { tipo: true } },
    },
  })

  for (const cert of candidatosDepois) {
    if (!cert.cliente.email) continue
    if (cert.cliente.parceiro?.emailVencimentoAtivo === false) continue

    const diasVencido = differenceInCalendarDays(hoje, cert.dataVencimento)
    const jaEnviados = new Set(cert.emailsEnviados.map((e) => e.tipo))
    const tipo = marcoMaisUrgenteAplicavel(MARCOS_DEPOIS, (limite) => diasVencido >= limite, jaEnviados)
    if (!tipo) continue

    try {
      const { assunto, html } = templateVencido(
        {
          nomeCliente: cert.cliente.nome,
          modeloCertificado: cert.modelo.nome,
          dataVencimento: format(cert.dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        },
        diasVencido
      )
      await enviarEmail({
        clienteId: cert.cliente.id,
        certificadoId: cert.id,
        tipo,
        destinatario: cert.cliente.email,
        assunto,
        html,
      })
      resultado.vencidos++
    } catch {
      resultado.erros++
    }
  }

  // ── 3. E-mail pós-emissão (certificados emitidos hoje) ────────────────────
  const novos = await prisma.certificado.findMany({
    where: {
      dataEmissao: { gte: inicioHoje, lt: addDays(inicioHoje, 1) },
      cliente: { email: { not: null } },
      emailsEnviados: { none: { tipo: 'POS_EMISSAO' } },
    },
    include: {
      cliente: { select: { id: true, nome: true, email: true } },
      modelo: { select: { nome: true } },
    },
  })

  for (const cert of novos) {
    if (!cert.cliente.email) continue
    try {
      const { assunto, html } = templatePosEmissao({
        nomeCliente: cert.cliente.nome,
        modeloCertificado: cert.modelo.nome,
      })
      await enviarEmail({
        clienteId: cert.cliente.id,
        certificadoId: cert.id,
        tipo: 'POS_EMISSAO',
        destinatario: cert.cliente.email,
        assunto,
        html,
      })
      resultado.posEmissao++
    } catch {
      resultado.erros++
    }
  }

  // ── 4. E-mails de nutrição (3, 6, 9 meses após emissão) ───────────────────
  const candidatosNutricao = await prisma.certificado.findMany({
    where: {
      status: 'ATIVO',
      dataEmissao: { gte: addMonths(inicioHoje, -9), lt: addDays(inicioHoje, 1) },
      cliente: { email: { not: null } },
    },
    include: {
      cliente: { select: { id: true, nome: true, email: true } },
      modelo: { select: { nome: true } },
      emailsEnviados: { select: { tipo: true } },
    },
  })

  for (const cert of candidatosNutricao) {
    if (!cert.cliente.email) continue

    const mesesPassados = differenceInMonths(hoje, cert.dataEmissao)
    const jaEnviados = new Set(cert.emailsEnviados.map((e) => e.tipo))
    const marcos = MARCOS_NUTRICAO.map((m) => m.marco)
    const tipo = marcoMaisUrgenteAplicavel(marcos, (limite) => mesesPassados >= limite, jaEnviados)
    if (!tipo) continue
    const trimestre = MARCOS_NUTRICAO.find((m) => m.marco.tipo === tipo)!.trimestre

    try {
      const { assunto, html } = templateNutricao({ nomeCliente: cert.cliente.nome }, trimestre)
      await enviarEmail({
        clienteId: cert.cliente.id,
        certificadoId: cert.id,
        tipo,
        destinatario: cert.cliente.email,
        assunto,
        html,
      })
      resultado.nutricao++
    } catch {
      resultado.erros++
    }
  }

  return NextResponse.json({ ok: true, resultado, processadoEm: new Date().toISOString() })
}
