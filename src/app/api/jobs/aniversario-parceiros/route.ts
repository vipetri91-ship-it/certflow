import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transporte } from '@/lib/email/transporte'
import { enviarWhatsApp } from '@/lib/digisac'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'

function autenticado(req: NextRequest): boolean {
  return req.headers.get('x-job-token') === process.env.AUTH_SECRET
}

function templateAniversarioEmail(nomeParceiro: string): { assunto: string; html: string } {
  const assunto = `🎂 Feliz aniversário, ${nomeParceiro.split(' ')[0]}!`
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr>
          <td style="background:#1e40af;padding:32px;text-align:center">
            <h1 style="color:#ffffff;margin:0;font-size:28px">🎂 Feliz Aniversário!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px">
            <p style="font-size:18px;color:#1e293b;margin-top:0">Olá, <strong>${nomeParceiro.split(' ')[0]}</strong>!</p>
            <p style="font-size:16px;color:#475569;line-height:1.7">
              Neste dia especial, toda a equipe da <strong>V&amp;G Certificado Digital</strong>
              deseja a você um dia repleto de alegrias, saúde e muito sucesso!
            </p>
            <p style="font-size:16px;color:#475569;line-height:1.7">
              É uma honra ter você como parceiro. Agradecemos a confiança e parceria que
              construímos juntos. Que venham muitos anos de conquistas ao lado da nossa equipe!
            </p>
            <p style="font-size:16px;color:#1e293b;margin-bottom:0">
              Com carinho,<br>
              <strong>Equipe V&amp;G Certificado Digital</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:20px 32px;text-align:center">
            <p style="font-size:12px;color:#94a3b8;margin:0">V&amp;G Certificado Digital — vazcertflow.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { assunto, html }
}

function templateAniversarioWhatsApp(nomeParceiro: string): string {
  const primeiroNome = nomeParceiro.split(' ')[0]
  return `🎂 *Feliz Aniversário, ${primeiroNome}!*\n\nNeste dia especial, toda a equipe da *V&G Certificado Digital* deseja a você um dia repleto de alegrias, saúde e muito sucesso!\n\nÉ uma honra tê-lo como parceiro. Obrigado pela confiança! 🥳\n\n— Equipe V&G Certificado Digital`
}

export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth() + 1
  const anoHoje = hoje.getFullYear()

  const resultado = { emails: 0, whatsapps: 0, pulados: 0, erros: 0 }

  const parceiros = await prisma.parceiro.findMany({
    where: {
      ativo: true,
      dataNascimento: { not: null },
      ultimoAniversarioEnviado: { not: anoHoje },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      celular: true,
      telefone: true,
      dataNascimento: true,
      ultimoAniversarioEnviado: true,
    },
  })

  for (const p of parceiros) {
    if (!p.dataNascimento) { resultado.pulados++; continue }

    const nascimento = new Date(p.dataNascimento)
    if (nascimento.getDate() !== diaHoje || (nascimento.getMonth() + 1) !== mesHoje) {
      resultado.pulados++
      continue
    }

    let enviouAlgo = false

    // E-mail de aniversário
    if (p.email) {
      try {
        const { assunto, html } = templateAniversarioEmail(p.nome)
        await transporte.sendMail({
          to: p.email,
          subject: assunto,
          html,
        })
        resultado.emails++
        enviouAlgo = true
      } catch {
        resultado.erros++
      }
    }

    // WhatsApp de aniversário
    const telefone = p.celular ?? p.telefone
    if (telefone) {
      try {
        const mensagem = templateAniversarioWhatsApp(p.nome)
        const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: p.nome })
        if (envio.ok) {
          resultado.whatsapps++
          enviouAlgo = true
        } else {
          resultado.erros++
        }
      } catch {
        resultado.erros++
      }
      await new Promise(r => setTimeout(r, 300))
    }

    if (enviouAlgo) {
      await prisma.parceiro.update({
        where: { id: p.id },
        data: { ultimoAniversarioEnviado: anoHoje },
      })
    }
  }

  await registrarHeartbeat('aniversario-parceiros')
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
