import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transporte } from '@/lib/email/transporte'
import { enviarWhatsApp } from '@/lib/digisac'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'

function autenticado(req: NextRequest): boolean {
  return req.headers.get('x-job-token') === process.env.AUTH_SECRET
}

const MARCA_HISTORICO = (ano: number) => `Aniversário do cliente — parabéns enviado (${ano})`

function templateAniversarioEmail(primeiroNome: string): { assunto: string; html: string } {
  const assunto = `🎂 Feliz aniversário, ${primeiroNome}!`
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
            <p style="font-size:18px;color:#1e293b;margin-top:0">Olá, <strong>${primeiroNome}</strong>!</p>
            <p style="font-size:16px;color:#475569;line-height:1.7">
              Neste dia especial, toda a equipe da <strong>V&amp;G Certificação Digital</strong>
              deseja a você um dia repleto de alegrias, saúde e muito sucesso!
            </p>
            <p style="font-size:16px;color:#475569;line-height:1.7">
              É uma honra ter você como cliente. Obrigado pela confiança!
            </p>
            <p style="font-size:16px;color:#1e293b;margin-bottom:0">
              Com carinho,<br>
              <strong>Equipe V&amp;G Certificação Digital</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:20px 32px;text-align:center">
            <p style="font-size:12px;color:#94a3b8;margin:0">V&amp;G Certificação Digital — vazcertflow.com.br</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { assunto, html }
}

function templateAniversarioWhatsApp(primeiroNome: string): string {
  return `🎂 *Feliz Aniversário, ${primeiroNome}!*\n\nNeste dia especial, toda a equipe da *V&G Certificação Digital* deseja a você um dia repleto de alegrias, saúde e muito sucesso!\n\nÉ uma honra ter você como cliente. Obrigado pela confiança! 🥳\n\n— Equipe V&G Certificação Digital`
}

export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth() + 1
  const anoHoje = hoje.getFullYear()
  const marcaEsteAno = MARCA_HISTORICO(anoHoje)

  const resultado = { emails: 0, whatsapps: 0, pulados: 0, erros: 0 }

  const clientes = await prisma.cliente.findMany({
    where: { ativo: true, dataNascimento: { not: null } },
    select: { id: true, nome: true, tipoPessoa: true, responsavel: true, email: true, celular: true, telefone: true, dataNascimento: true },
  })

  for (const c of clientes) {
    if (!c.dataNascimento) { resultado.pulados++; continue }
    const nascimento = new Date(c.dataNascimento)
    if (nascimento.getDate() !== diaHoje || (nascimento.getMonth() + 1) !== mesHoje) {
      resultado.pulados++
      continue
    }

    const jaEnviado = await prisma.historicoContato.findFirst({
      where: { clienteId: c.id, observacao: marcaEsteAno },
      select: { id: true },
    })
    if (jaEnviado) { resultado.pulados++; continue }

    // PJ: dataNascimento é do responsável, então saudar pelo nome dele, não da empresa.
    const nomeSaudacao = (c.tipoPessoa === 'PJ' ? (c.responsavel || c.nome) : c.nome).split(' ')[0]
    let enviouAlgo = false

    if (c.email) {
      try {
        const { assunto, html } = templateAniversarioEmail(nomeSaudacao)
        await transporte.sendMail({ to: c.email, subject: assunto, html })
        resultado.emails++
        enviouAlgo = true
      } catch {
        resultado.erros++
      }
    }

    const telefone = c.celular ?? c.telefone
    if (telefone) {
      try {
        const envio = await enviarWhatsApp({ telefone, mensagem: templateAniversarioWhatsApp(nomeSaudacao), nomeCliente: c.nome })
        if (envio.ok) { resultado.whatsapps++; enviouAlgo = true } else { resultado.erros++ }
      } catch {
        resultado.erros++
      }
      await new Promise(r => setTimeout(r, 300))
    }

    if (enviouAlgo) {
      await prisma.historicoContato.create({ data: { clienteId: c.id, observacao: marcaEsteAno } })
    }
  }

  await registrarHeartbeat('aniversario-clientes')
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
