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

  const primeiroNome = nomeCliente.split(' ')[0]
  const vencido  = diasRestantes < 0
  const critico  = !vencido && diasRestantes <= 7
  const urgente  = !vencido && diasRestantes > 7 && diasRestantes <= 15
  const atencao  = !vencido && diasRestantes > 15 && diasRestantes <= 30
  const tranquilo = !vencido && diasRestantes > 30

  // ── Assunto personalizado por faixa ──────────────────────────────────────
  const assunto = vencido
    ? `⚠️ ${primeiroNome}, seu certificado expirou — vamos resolver isso juntos?`
    : critico
    ? `🔴 ${primeiroNome}, restam apenas ${diasRestantes} dias — hora de agir!`
    : urgente
    ? `⏰ ${primeiroNome}, seu certificado vence em ${diasRestantes} dias`
    : atencao
    ? `📋 ${primeiroNome}, lembrete amigável sobre seu certificado digital`
    : `😊 ${primeiroNome}, tudo certo com seu certificado? Passamos para avisar!`

  // ── Cor e badge por faixa ────────────────────────────────────────────────
  const corHeader = vencido ? '#b91c1c' : critico ? '#c2410c' : urgente ? '#d97706' : '#1d4ed8'
  const badgeLabel = vencido ? '⚠️ CERTIFICADO VENCIDO' : critico ? '🔴 AÇÃO NECESSÁRIA' : urgente ? '⏰ VENCE EM BREVE' : atencao ? '📋 LEMBRETE' : '😊 AVISO ANTECIPADO'

  // ── Texto principal personalizado ────────────────────────────────────────
  const textoPrincipal = vencido
    ? `Notamos que o seu certificado digital <strong>${modeloCertificado}</strong> expirou em <strong>${dataVencimento}</strong>.<br><br>
       Sabemos que isso pode estar gerando transtornos — desde dificuldades para assinar documentos até bloqueios em sistemas da Receita Federal. <strong>Mas não se preocupe: a renovação é simples e rápida!</strong><br><br>
       Nossa equipe está pronta para te ajudar agora mesmo, sem complicações.`
    : critico
    ? `Estamos passando para te avisar que faltam apenas <strong>${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}</strong> para o seu certificado <strong>${modeloCertificado}</strong> vencer (${dataVencimento}).<br><br>
       A gente sabe que a rotina é corrida e às vezes esses prazos escapam — por isso estamos aqui para te lembrar antes que aconteça qualquer inconveniente. <strong>Vamos resolver isso hoje?</strong>`
    : urgente
    ? `Você tem <strong>${diasRestantes} dias</strong> antes do vencimento do seu certificado <strong>${modeloCertificado}</strong> em <strong>${dataVencimento}</strong>.<br><br>
       Ainda dá tempo de renovar com toda a tranquilidade, sem correria! Nosso processo é 100% online, feito por videoconferência, e você não precisa sair de casa. <strong>Que tal agendar agora e já tirar isso da sua lista?</strong>`
    : atencao
    ? `Passamos aqui para um lembrete amigável: seu certificado <strong>${modeloCertificado}</strong> vence em <strong>${diasRestantes} dias</strong> (${dataVencimento}).<br><br>
       Quem renova com antecedência evita correria de última hora e garante que tudo continue funcionando sem interrupção. É um investimento que vale a pena! 😊`
    : `Antes de qualquer correria, queríamos te avisar com antecedência: seu certificado <strong>${modeloCertificado}</strong> vence em <strong>${diasRestantes} dias</strong> (${dataVencimento}).<br><br>
       Ainda tem bastante tempo, mas quem agenda cedo garante o melhor horário e renova sem estresse. Vai um cafezinho e a gente cuida do certificado? ☕`

  const mensagemPosicao = vencido
    ? `Após a renovação, tudo volta ao normal imediatamente.`
    : `Renovação em minutos, via videoconferência — sem sair de casa.`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${assunto}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

  <!-- Header colorido por faixa -->
  <tr>
    <td style="background:linear-gradient(135deg,${corHeader},${corHeader}cc);padding:36px 40px 28px;text-align:center;">
      <div style="margin-bottom:14px;">
        <img src="https://4uvdfywq1qlqpdri.public.blob.vercel-storage.com/vg-logo-jEQ8b69Sfi9ucfePhmxuMoHLc6BUCG.png"
          alt="V&G Certificação Digital" width="140" height="56"
          style="display:block;margin:0 auto;max-width:140px;height:auto;" />
      </div>
      <div style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:1px;border:1px solid rgba(255,255,255,0.4);">
        ${badgeLabel}
      </div>
    </td>
  </tr>

  <!-- Saudação pessoal -->
  <tr>
    <td style="padding:36px 40px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;letter-spacing:0.5px;">Para: ${nomeCliente.split(' ').slice(0,2).join(' ')}</p>
      <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.25;">
        ${vencido ? 'Precisamos conversar sobre seu certificado' : critico ? 'Não deixe para depois!' : urgente ? 'Hora de garantir sua continuidade!' : atencao ? 'Um lembrete com carinho 💙' : 'Tudo certo por aqui? 😊'}
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.75;">
        ${textoPrincipal}
      </p>
    </td>
  </tr>

  <!-- Card do certificado -->
  <tr>
    <td style="padding:0 40px 28px;">
      <div style="background:#f8faff;border:1.5px solid #dbeafe;border-radius:14px;padding:20px 24px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">Seu certificado</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#64748b;width:38%;">Titular</td>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1e293b;">${nomeCliente}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#64748b;">Tipo</td>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#1e293b;">${modeloCertificado}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#64748b;">Vencimento</td>
            <td style="padding:5px 0;font-size:14px;font-weight:700;color:${corHeader};">${dataVencimento} ${vencido ? '(vencido)' : `(${diasRestantes}d restantes)`}</td>
          </tr>
          ${valorRenovacao ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b;">Renovação</td><td style="padding:5px 0;font-size:14px;font-weight:700;color:#16a34a;">R$ ${valorRenovacao.toFixed(2).replace('.',',')}</td></tr>` : ''}
        </table>
      </div>
    </td>
  </tr>

  <!-- CTA principal -->
  <tr>
    <td style="padding:0 40px 28px;text-align:center;">
      <p style="margin:0 0 16px;font-size:14px;color:#64748b;">${mensagemPosicao}</p>
      <a href="https://wa.me/5511933323003?text=Olá!%20Quero%20renovar%20meu%20certificado%20digital."
        style="display:inline-block;background:${corHeader};color:#fff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
        📅 Agendar minha renovação
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Clique para abrir o WhatsApp e falar com a nossa equipe</p>
    </td>
  </tr>

  <!-- Benefícios -->
  <tr>
    <td style="padding:0 40px 28px;">
      <div style="background:#f0fdf4;border-radius:12px;padding:18px 22px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#166534;">Por que renovar com a V&amp;G?</p>
        <p style="margin:0;font-size:13px;color:#15803d;line-height:1.9;">
          ✅ <strong>100% online</strong> — sem precisar sair de casa<br>
          ✅ <strong>Videoconferência</strong> — rápido, seguro e descomplicado<br>
          ✅ <strong>Atendimento personalizado</strong> — te guiamos em cada passo<br>
          ✅ <strong>Emissão imediata</strong> — seu certificado pronto na hora
        </p>
      </div>
    </td>
  </tr>

  <!-- Contato e assinatura -->
  <tr>
    <td style="padding:0 40px 32px;">
      <div style="border-top:1px solid #f1f5f9;padding-top:24px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1e293b;">Vinicius Petri</p>
        <p style="margin:0 0 14px;font-size:12px;color:#64748b;">V&amp;G Certificação Digital — Parceiro Safeweb</p>
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.9;">
          📞 <a href="tel:+5511943156015" style="color:#2563eb;text-decoration:none;">(11) 94315-6015</a><br>
          💬 <a href="https://wa.me/5511933323003" style="color:#16a34a;text-decoration:none;">WhatsApp: (11) 93332-3003</a><br>
          ✉️ <a href="mailto:piracaia@vegcertificado.com.br" style="color:#2563eb;text-decoration:none;">piracaia@vegcertificado.com.br</a>
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
      from: `"V&G Certificação Digital" <${process.env.SMTP_FROM ?? 'piracaia@vegcertificado.com.br'}>`,
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