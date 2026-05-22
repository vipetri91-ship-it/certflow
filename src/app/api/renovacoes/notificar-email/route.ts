import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { transporte } from '@/lib/email/transporte'
import { z } from 'zod'

const schema = z.object({
  certificadoId: z.string(),
  emailDestino: z.string().email(),
  nomeCliente: z.string(),
  modeloCertificado: z.string(),
  dataVencimento: z.string(),
  diasRestantes: z.number(),
  valorRenovacao: z.number().optional(),
})

function gerarMensagemEmail(dados: {
  nomeCliente: string
  modeloCertificado: string
  dataVencimento: string
  diasRestantes: number
  valorRenovacao?: number
}): { assunto: string; html: string } {
  const { nomeCliente, modeloCertificado, dataVencimento, diasRestantes, valorRenovacao } = dados

  const vencido = diasRestantes < 0
  const urgente = diasRestantes <= 7 && !vencido
  const alerta  = diasRestantes > 7 && diasRestantes <= 30

  const corFaixa = vencido ? '#D50000' : urgente ? '#F4511E' : alerta ? '#F6BF26' : '#0B8043'
  const textoCor = vencido ? '#D50000' : urgente ? '#F4511E' : '#1a1a2e'

  const assunto = vencido
    ? `🚨 Seu certificado digital VENCEU — Renove agora!`
    : urgente
    ? `⚠️ URGENTE: Seu certificado vence em ${diasRestantes} dias!`
    : alerta
    ? `📅 Seu certificado digital vence em ${diasRestantes} dias`
    : `📋 Lembrete: Certificado digital vence em ${diasRestantes} dias`

  const mensagemPrincipal = vencido
    ? `Seu certificado digital <strong style="color:${corFaixa}">VENCEU</strong>. Você pode estar enfrentando problemas para assinar documentos e acessar sistemas governamentais.`
    : urgente
    ? `Seu certificado digital vence <strong style="color:${corFaixa}">em apenas ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}</strong>. Não deixe para última hora — renove agora!`
    : `Seu certificado digital vence em <strong>${diasRestantes} dias</strong>. Aproveite para renovar com antecedência e evitar transtornos.`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assunto}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px 40px;text-align:center;">
            <div style="background:#fff;border-radius:12px;display:inline-block;padding:12px 24px;margin-bottom:16px;">
              <span style="font-size:22px;font-weight:900;color:#1e3a8a;letter-spacing:-0.5px;">V&G</span>
              <span style="font-size:13px;color:#64748b;display:block;margin-top:2px;letter-spacing:2px;">CERTIFICAÇÃO DIGITAL</span>
            </div>
            <div style="display:inline-block;background:${corFaixa};color:#fff;font-size:13px;font-weight:700;padding:6px 16px;border-radius:20px;letter-spacing:1px;">
              ${vencido ? '🚨 VENCIDO' : urgente ? '⚠️ URGENTE' : alerta ? '📅 ATENÇÃO' : '📋 LEMBRETE'}
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Olá,</p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">
              ${nomeCliente.split(' ').slice(0,3).join(' ')}
            </h1>
            <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
              ${mensagemPrincipal}
            </p>

            <!-- Card do certificado -->
            <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:12px;padding:20px 24px;margin:0 0 28px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;">Detalhes do Certificado</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;width:40%;">Titular:</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">${nomeCliente}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;">Tipo:</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">${modeloCertificado}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;">Vencimento:</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:700;color:${textoCor};">${dataVencimento}</td>
                </tr>
                ${valorRenovacao ? `
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#64748b;">Valor renovação:</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:700;color:#16a34a;">R$ ${valorRenovacao.toFixed(2).replace('.',',')}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin:0 0 32px;">
              <p style="margin:0 0 8px;font-size:14px;color:#64748b;">A renovação é <strong>rápida, simples e online</strong> — pode ser feita por videoconferência sem sair de casa!</p>
              <a href="https://wa.me/5511933323003?text=Olá!%20Quero%20renovar%20meu%20certificado%20digital."
                style="display:inline-block;background:#16a34a;color:#fff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;margin-top:16px;letter-spacing:0.3px;">
                📅 Agendar Renovação Agora
              </a>
            </div>

            <!-- Info processo -->
            <div style="background:#f0fdf4;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
              <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
                ✅ <strong>Processo 100% digital</strong> — sem sair de casa<br>
                ✅ <strong>Videoconferência</strong> — rápido e seguro<br>
                ✅ <strong>Suporte completo</strong> — te guiamos em cada etapa
              </p>
            </div>
          </td>
        </tr>

        <!-- Contato -->
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="border-top:1px solid #f1f5f9;padding-top:24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;">Dúvidas? Entre em contato:</p>
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.8;">
                📞 <strong>(11) 94315-6015</strong><br>
                💬 <strong>WhatsApp: (11) 93332-3003</strong><br>
                ✉️ <a href="mailto:vinicius.petri@vegcertificado.com.br" style="color:#2563eb;">vinicius.petri@vegcertificado.com.br</a>
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8faff;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              © 2026 V&G Certificação Digital · Todos os direitos reservados<br>
              Este e-mail foi enviado automaticamente pelo sistema CertFlow. Por favor, não responda.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { assunto, html }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })

  const { assunto, html } = gerarMensagemEmail(parsed.data)

  try {
    await transporte.sendMail({
      from: process.env.SMTP_FROM,
      to: parsed.data.emailDestino,
      subject: assunto,
      html,
    })

    // Registra no histórico de contatos
    await prisma.historicoContato.create({
      data: {
        clienteId: (await prisma.certificado.findUnique({
          where: { id: parsed.data.certificadoId },
          select: { clienteId: true },
        }))?.clienteId ?? '',
        certificadoId: parsed.data.certificadoId,
        observacao: `E-mail de renovação enviado para ${parsed.data.emailDestino}. Assunto: "${assunto}"`,
        usuarioId: session.user.id,
      },
    })

    return NextResponse.json({ ok: true, mensagem: 'E-mail enviado com sucesso' })
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err)
    const detalhe = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ erro: `SMTP: ${detalhe}` }, { status: 500 })
  }
}