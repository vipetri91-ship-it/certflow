import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { transporte } from '@/lib/email/transporte'
import { addDays } from 'date-fns'
import { z } from 'zod'
import type { FiltroMarketing } from '../destinatarios/route'

const schema = z.object({
  filtro: z.enum(['todos_clientes_ativos', 'vencendo_30', 'vencendo_60', 'vencendo_90', 'todos_clientes']),
  assunto: z.string().min(5).max(200),
  corpo: z.string().min(10).max(50_000),
})

function wrapHtml(assunto: string, corpo: string, nomeCliente: string): string {
  const corpoFinal = corpo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin:0 0 12px">')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr>
          <td style="background:#1e40af;padding:24px 32px">
            <h1 style="color:#ffffff;margin:0;font-size:22px">${assunto}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="font-size:16px;color:#1e293b;margin:0 0 16px">Olá, <strong>${nomeCliente.split(' ')[0]}</strong>!</p>
            <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 12px">${corpoFinal}</p>
            <p style="font-size:14px;color:#1e293b;margin:24px 0 0">Atenciosamente,<br><strong>Equipe V&amp;G Certificado Digital</strong></p>
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:16px 32px;text-align:center">
            <p style="font-size:12px;color:#94a3b8;margin:0">V&amp;G Certificado Digital — vazcertflow.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { filtro, assunto, corpo } = parsed.data
  const hoje = new Date()

  let clientes: { id: string; nome: string; email: string }[] = []

  if (filtro === 'todos_clientes') {
    const rows = await prisma.cliente.findMany({
      where: { email: { not: null } },
      select: { id: true, nome: true, email: true },
    })
    clientes = rows.map(c => ({ id: c.id, nome: c.nome, email: c.email! }))
  } else if (filtro === 'todos_clientes_ativos') {
    const rows = await prisma.cliente.findMany({
      where: { email: { not: null }, certificados: { some: { status: 'ATIVO' } } },
      select: { id: true, nome: true, email: true },
    })
    clientes = rows.map(c => ({ id: c.id, nome: c.nome, email: c.email! }))
  } else {
    const dias = filtro === 'vencendo_30' ? 30 : filtro === 'vencendo_60' ? 60 : 90
    const limite = addDays(hoje, dias)
    const rows = await prisma.cliente.findMany({
      where: {
        email: { not: null },
        certificados: { some: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: limite } } },
      },
      select: { id: true, nome: true, email: true },
    })
    clientes = rows.map(c => ({ id: c.id, nome: c.nome, email: c.email! }))
  }

  let enviados = 0
  let erros = 0

  for (const cliente of clientes) {
    const html = wrapHtml(assunto, corpo, cliente.nome)
    try {
      await transporte.sendMail({ to: cliente.email, subject: assunto, html })

      await prisma.emailLog.create({
        data: {
          clienteId: cliente.id,
          tipo: 'CAMPANHA_MARKETING',
          destinatario: cliente.email,
          assunto,
          status: 'ENVIADO',
          enviadoEm: new Date(),
        },
      })
      enviados++
    } catch {
      await prisma.emailLog.create({
        data: {
          clienteId: cliente.id,
          tipo: 'CAMPANHA_MARKETING',
          destinatario: cliente.email,
          assunto,
          status: 'ERRO',
        },
      })
      erros++
    }
    // Brevo free tier: max ~100 emails/hour — pequena pausa para evitar throttling
    await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json({ ok: true, enviados, erros, total: clientes.length })
}
