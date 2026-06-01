import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarEmail } from '@/lib/email/enviar'
import { templateVencimento, templatePosEmissao, templateNutricao } from '@/lib/email/templates'
import { addDays, addMonths, differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Protege o endpoint com um secret de job (cron externo ou chamada interna)
function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token')
  return token === process.env.AUTH_SECRET
}

export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const resultado = { vencimentos: 0, posEmissao: 0, nutricao: 0, erros: 0 }

  // ── 1. E-mails de vencimento (60, 30, 15, 7 dias) ─────────────────────────
  const prazos = [
    { dias: 60, tipo: 'VENCIMENTO_60' as const },
    { dias: 30, tipo: 'VENCIMENTO_30' as const },
    { dias: 15, tipo: 'VENCIMENTO_15' as const },
    { dias: 7, tipo: 'VENCIMENTO_7' as const },
  ]

  for (const { dias, tipo } of prazos) {
    const dataAlvo = addDays(hoje, dias)
    const inicioDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate())
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000 - 1)

    const certificados = await prisma.certificado.findMany({
      where: {
        status: 'ATIVO',
        dataVencimento: { gte: inicioDia, lte: fimDia },
        cliente: { email: { not: null } },
        // evitar reenvio
        emailsEnviados: { none: { tipo } },
      },
      include: {
        cliente: {
          select: { id: true, nome: true, email: true, parceiroId: true },
          include: { parceiro: { select: { emailVencimentoAtivo: true } } },
        },
        modelo: { select: { nome: true } },
      },
    })

    for (const cert of certificados) {
      if (!cert.cliente.email) continue
      if (cert.cliente.parceiro?.emailVencimentoAtivo === false) continue
      try {
        const { assunto, html } = templateVencimento(
          {
            nomeCliente: cert.cliente.nome,
            modeloCertificado: cert.modelo.nome,
            dataVencimento: format(cert.dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            diasRestantes: dias,
          },
          dias
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
  }

  // ── 2. E-mail pós-emissão (certificados emitidos hoje) ────────────────────
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000 - 1)

  const novos = await prisma.certificado.findMany({
    where: {
      dataEmissao: { gte: inicioDia, lte: fimDia },
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

  // ── 3. E-mails de nutrição (3, 6, 9 meses após emissão) ───────────────────
  const nutricoes = [
    { meses: 3, tipo: 'NUTRICAO_3M' as const, trimestre: 1 },
    { meses: 6, tipo: 'NUTRICAO_6M' as const, trimestre: 2 },
    { meses: 9, tipo: 'NUTRICAO_9M' as const, trimestre: 3 },
  ]

  for (const { meses, tipo, trimestre } of nutricoes) {
    const dataAlvoNutri = new Date(inicioDia)
    dataAlvoNutri.setMonth(dataAlvoNutri.getMonth() - meses)
    const fimAlvo = new Date(dataAlvoNutri.getTime() + 24 * 60 * 60 * 1000 - 1)

    const certs = await prisma.certificado.findMany({
      where: {
        dataEmissao: { gte: dataAlvoNutri, lte: fimAlvo },
        status: 'ATIVO',
        cliente: { email: { not: null } },
        emailsEnviados: { none: { tipo } },
      },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        modelo: { select: { nome: true } },
      },
    })

    for (const cert of certs) {
      if (!cert.cliente.email) continue
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
  }

  return NextResponse.json({ ok: true, resultado, processadoEm: new Date().toISOString() })
}