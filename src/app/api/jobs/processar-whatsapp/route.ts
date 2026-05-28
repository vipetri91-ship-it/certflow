import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp, gerarMensagemWhatsApp } from '@/lib/digisac'
import { addDays, format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Pré-vencimento: disparar N dias ANTES
const PRAZOS_ANTES = [60, 30, 15, 7]

// Pós-vencimento: disparar N dias DEPOIS (urgência máxima)
const PRAZOS_DEPOIS = [1, 7]

function autenticado(req: NextRequest): boolean {
  // Aceita token no header (POST manual) ou authorization Bearer (cron Vercel)
  const headerToken  = req.headers.get('x-job-token')
  const bearer       = req.headers.get('authorization')?.replace('Bearer ', '')
  const secret       = process.env.AUTH_SECRET
  return headerToken === secret || bearer === secret
}

async function executarJob() {
  const hoje    = new Date()
  const resultado = { enviados: 0, erros: 0, pulados: 0 }

  // ── Pré-vencimento ───────────────────────────────────────────────────────
  for (const dias of PRAZOS_ANTES) {
    const dataAlvo   = addDays(hoje, dias)
    const inicioDia  = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate())
    const fimDia     = new Date(inicioDia.getTime() + 86_400_000 - 1)

    const certs = await prisma.certificado.findMany({
      where: {
        status: 'ATIVO',
        dataVencimento: { gte: inicioDia, lte: fimDia },
        cliente: { OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
      },
      include: {
        cliente: { select: { id: true, nome: true, celular: true, telefone: true } },
        modelo:  { select: { nome: true } },
      },
    })

    for (const cert of certs) {
      const telefone = cert.cliente.celular ?? cert.cliente.telefone
      if (!telefone) { resultado.pulados++; continue }

      // Não reenviar se já enviamos WhatsApp nos últimos 5 dias para este cert
      const jaEnviado = await prisma.historicoContato.findFirst({
        where: {
          clienteId:    cert.cliente.id,
          certificadoId: cert.id,
          observacao:   { contains: 'WhatsApp automático' },
          createdAt:    { gte: subDays(hoje, 5) },
        },
      })
      if (jaEnviado) { resultado.pulados++; continue }

      const mensagem = gerarMensagemWhatsApp({
        nomeCliente:       cert.cliente.nome,
        modeloCertificado: cert.modelo.nome,
        dataVencimento:    format(cert.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
        diasRestantes:     dias,
      })

      const envio = await enviarWhatsApp({ telefone, mensagem })
      if (envio.ok) {
        await prisma.historicoContato.create({
          data: {
            clienteId:    cert.cliente.id,
            certificadoId: cert.id,
            observacao:   `WhatsApp automático — ${dias} dias antes do vencimento — ${telefone}`,
          },
        })
        resultado.enviados++
      } else {
        resultado.erros++
      }

      await new Promise(r => setTimeout(r, 300))
    }
  }

  // ── Pós-vencimento (urgência máxima) ─────────────────────────────────────
  for (const diasAtras of PRAZOS_DEPOIS) {
    const dataAlvo  = subDays(hoje, diasAtras)
    const inicioDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate())
    const fimDia    = new Date(inicioDia.getTime() + 86_400_000 - 1)

    // Certificados que venceram há exatamente N dias e ainda estão ATIVO (não renovaram)
    const certs = await prisma.certificado.findMany({
      where: {
        status:         { in: ['ATIVO', 'VENCIDO'] },
        dataVencimento: { gte: inicioDia, lte: fimDia },
        cliente:        { OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
      },
      include: {
        cliente: { select: { id: true, nome: true, celular: true, telefone: true } },
        modelo:  { select: { nome: true } },
      },
    })

    for (const cert of certs) {
      const telefone = cert.cliente.celular ?? cert.cliente.telefone
      if (!telefone) { resultado.pulados++; continue }

      // Não reenviar se já enviamos no mesmo dia
      const jaEnviado = await prisma.historicoContato.findFirst({
        where: {
          clienteId:    cert.cliente.id,
          certificadoId: cert.id,
          observacao:   { contains: 'WhatsApp automático — VENCIDO' },
          createdAt:    { gte: subDays(hoje, 1) },
        },
      })
      if (jaEnviado) { resultado.pulados++; continue }

      const mensagem = gerarMensagemWhatsApp({
        nomeCliente:       cert.cliente.nome,
        modeloCertificado: cert.modelo.nome,
        dataVencimento:    format(cert.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
        diasRestantes:     -diasAtras,
      })

      const envio = await enviarWhatsApp({ telefone, mensagem })
      if (envio.ok) {
        await prisma.historicoContato.create({
          data: {
            clienteId:    cert.cliente.id,
            certificadoId: cert.id,
            observacao:   `WhatsApp automático — VENCIDO há ${diasAtras} dia(s) — ${telefone}`,
          },
        })
        resultado.enviados++
      } else {
        resultado.erros++
      }

      await new Promise(r => setTimeout(r, 300))
    }
  }

  return resultado
}

// GET — acionado pelo Vercel Cron (sem token, protegido pelo schedule)
export async function GET() {
  const resultado = await executarJob()
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}

// POST — acionado manualmente com token
export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }
  const resultado = await executarJob()
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
