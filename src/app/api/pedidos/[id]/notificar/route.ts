import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp } from '@/lib/digisac'
import { transporte } from '@/lib/email/transporte'
import { z } from 'zod'

const schema = z.object({
  tipo: z.enum(['whatsapp', 'email']),
  destinatario: z.enum(['cliente', 'parceiro']),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })
  }

  const { tipo, destinatario } = parsed.data

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: true,
      itens: { include: { modelo: true } },
    },
  })

  if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

  const nomeTitular = pedido.cliente.razaoSocial || pedido.cliente.nome
  const modelo = pedido.itens[0]?.modelo.nome ?? 'Certificado Digital'

  if (tipo === 'whatsapp') {
    const telefone = destinatario === 'cliente'
      ? pedido.cliente.celular
      : pedido.parceiro?.celular

    if (!telefone) {
      return NextResponse.json({ erro: 'Número de WhatsApp não cadastrado' }, { status: 400 })
    }

    const nomeDestinatario = destinatario === 'cliente'
      ? pedido.cliente.nome
      : (pedido.parceiro?.razaoSocial || pedido.parceiro?.nome || 'Parceiro')

    const primeiroNome = nomeDestinatario.split(' ')[0]

    const mensagem =
      `✅ *Certificado Digital Emitido com Sucesso!*\n\n` +
      `Olá, ${primeiroNome}!\n\n` +
      `O certificado digital de *${nomeTitular}* foi emitido com sucesso.\n\n` +
      `📋 *Detalhes:*\n` +
      `• Tipo: ${modelo}\n` +
      (pedido.numeroCompra ? `• Protocolo: ${pedido.numeroCompra}\n` : '') +
      `• Status: ✅ Aprovado\n\n` +
      `Em caso de dúvidas, estamos à disposição!\n\n` +
      `_V&G Certificação Digital_\n` +
      `📲 (11) 93332-3003`

    const resultado = await enviarWhatsApp({
      telefone,
      mensagem,
      nomeCliente: nomeDestinatario,
    })

    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.erro || 'Erro ao enviar WhatsApp' }, { status: 500 })
    }

    await prisma.historicoContato.create({
      data: {
        clienteId: pedido.clienteId,
        observacao: `WhatsApp de confirmação de emissão enviado para ${destinatario === 'cliente' ? 'o cliente' : 'o parceiro/contador'} (${modelo})`,
        dataContato: new Date(),
        usuarioId: session.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  }

  // tipo === 'email'
  const email = destinatario === 'cliente'
    ? pedido.cliente.email
    : pedido.parceiro?.email

  if (!email) {
    return NextResponse.json({ erro: 'E-mail não cadastrado' }, { status: 400 })
  }

  const nomeDestinatario = destinatario === 'cliente'
    ? (pedido.cliente.razaoSocial || pedido.cliente.nome)
    : (pedido.parceiro?.razaoSocial || pedido.parceiro?.nome || 'Parceiro')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header verde -->
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#059669);padding:40px 40px 30px;text-align:center;">
            <img src="https://4uvdfywq1qlqpdri.public.blob.vercel-storage.com/vg-logo-jEQ8b69Sfi9ucfePhmxuMoHLc6BUCG.png" width="160" alt="V&G Certificação Digital" style="display:block;margin:0 auto 20px;" />
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;">✅</span>
            </div>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:bold;">Certificado Emitido!</h1>
            <p style="color:#bbf7d0;margin:8px 0 0;font-size:15px;">Processo concluído com sucesso</p>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:16px;margin:0 0 24px;">
              Olá, <strong>${nomeDestinatario.split(' ')[0]}</strong>!
            </p>
            <p style="color:#374151;font-size:15px;margin:0 0 28px;line-height:1.6;">
              Temos o prazer de informar que o certificado digital de <strong>${nomeTitular}</strong> foi emitido com sucesso e já está ativo.
            </p>

            <!-- Card de detalhes -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:28px;">
              <tr>
                <td style="padding:24px;">
                  <table width="100%" cellpadding="0" cellspacing="6">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding:4px 0;">Titular:</td>
                      <td style="color:#111827;font-size:13px;font-weight:bold;text-align:right;padding:4px 0;">${nomeTitular}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding:4px 0;">Tipo:</td>
                      <td style="color:#111827;font-size:13px;text-align:right;padding:4px 0;">${modelo}</td>
                    </tr>
                    ${pedido.numeroCompra ? `
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding:4px 0;">Protocolo:</td>
                      <td style="color:#2563eb;font-size:13px;font-weight:bold;font-family:monospace;text-align:right;padding:4px 0;">${pedido.numeroCompra}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding:4px 0;">Status:</td>
                      <td style="text-align:right;padding:4px 0;">
                        <span style="background:#dcfce7;color:#16a34a;font-size:12px;font-weight:bold;padding:3px 10px;border-radius:20px;">✓ Aprovado</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="color:#6b7280;font-size:14px;margin:0 0 28px;line-height:1.6;">
              Em caso de dúvidas ou se precisar de suporte, entre em contato conosco.
            </p>
          </td>
        </tr>

        <!-- Rodapé -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;font-weight:bold;">V&G Certificação Digital</p>
            <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.8;">
              💬 <a href="https://wa.me/5511933323003" style="color:#16a34a;text-decoration:none;">WhatsApp: (11) 93332-3003 / (11) 94315-6015</a><br>
              📸 <a href="https://instagram.com/vegcertificadora" style="color:#9ca3af;text-decoration:none;">@vegcertificadora</a><br>
              🌐 <a href="https://www.vegcertificadora.com.br" style="color:#9ca3af;text-decoration:none;">www.vegcertificadora.com.br</a><br>
              ✉️ <a href="mailto:piracaia@vegcertificado.com.br" style="color:#9ca3af;text-decoration:none;">piracaia@vegcertificado.com.br</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await transporte.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `✅ Certificado Digital Emitido — ${nomeTitular}`,
      html,
    })
  } catch (err) {
    return NextResponse.json({ erro: `Erro ao enviar e-mail: ${String(err)}` }, { status: 500 })
  }

  await prisma.historicoContato.create({
    data: {
      clienteId: pedido.clienteId,
      observacao: `E-mail de confirmação de emissão enviado para ${destinatario === 'cliente' ? 'o cliente' : 'o parceiro/contador'} (${modelo})`,
      dataContato: new Date(),
      usuarioId: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
