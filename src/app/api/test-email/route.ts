import { NextRequest, NextResponse } from 'next/server'
import { transporte } from '@/lib/email/transporte'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const para = searchParams.get('para')

  if (!para) {
    return NextResponse.json({
      instrucao: 'Adicione ?para=seu@email.com na URL para enviar o teste',
      exemplo: '/api/test-email?para=vipetri91@gmail.com',
    })
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px 40px;text-align:center;">
            <div style="background:#fff;border-radius:12px;display:inline-block;padding:12px 24px;margin-bottom:12px;">
              <span style="font-size:22px;font-weight:900;color:#1e3a8a;">V&G</span>
              <span style="font-size:13px;color:#64748b;display:block;letter-spacing:2px;">CERTIFICAÇÃO DIGITAL</span>
            </div>
            <p style="margin:0;color:#93c5fd;font-size:13px;">✅ E-mail de teste do CertFlow</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Tudo funcionando!</h2>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
              Se você recebeu este e-mail, significa que o sistema CertFlow está configurado corretamente e pronto para enviar notificações de renovação de certificados.
            </p>
            <div style="background:#f0fdf4;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
                ✅ Servidor SMTP conectado<br>
                ✅ Autenticação funcionando<br>
                ✅ E-mails de renovação prontos para envio<br>
                ✅ Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              </p>
            </div>
            <p style="margin:0;color:#64748b;font-size:13px;">
              Agora os e-mails de renovação serão enviados automaticamente para os clientes conforme as regras de vencimento configuradas.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8faff;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">CertFlow — V&G Certificação Digital · Teste de e-mail</p>
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
      to: para,
      subject: '✅ Teste de e-mail — CertFlow funcionando!',
      html,
    })

    return NextResponse.json({
      ok: true,
      mensagem: `E-mail de teste enviado com sucesso para ${para}`,
      remetente: process.env.SMTP_FROM,
      servidor: process.env.SMTP_HOST,
    })
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      erro: 'Falha ao enviar e-mail',
      detalhe: String(err),
      dica: 'Verifique as variáveis SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM no Vercel',
    }, { status: 500 })
  }
}