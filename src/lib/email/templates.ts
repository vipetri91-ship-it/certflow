export interface TemplateVars {
  nomeCliente: string
  modeloCertificado?: string
  dataVencimento?: string
  diasRestantes?: number
  linkRenovacao?: string
  nomeEmpresa?: string
  protocolo?: string
  cpfCnpj?: string
}

function base(conteudo: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f6fb; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; color: #374151; line-height: 1.7; }
    .body h2 { color: #111827; font-size: 20px; margin-top: 0; }
    .alerta { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 14px 18px; margin: 20px 0; }
    .alerta.vermelho { background: #fee2e2; border-color: #ef4444; }
    .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ CertFlow</h1>
      <p>Certificação Digital</p>
    </div>
    <div class="body">
      ${conteudo}
    </div>
    <div class="footer">
      <p>Este é um e-mail automático do sistema CertFlow. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>`
}

export function templateVencimento(vars: TemplateVars, dias: number): { assunto: string; html: string } {
  const urgente = dias <= 15
  return {
    assunto: `⚠️ Seu certificado digital vence em ${dias} dias`,
    html: base(`
      <h2>Olá, ${vars.nomeCliente}!</h2>
      <p>Informamos que o seu certificado digital está próximo do vencimento.</p>
      <div class="alerta ${urgente ? 'vermelho' : ''}">
        <strong>📅 Certificado:</strong> ${vars.modeloCertificado ?? 'Certificado Digital'}<br/>
        <strong>⏳ Vencimento:</strong> ${vars.dataVencimento}<br/>
        <strong>⚡ Restam apenas ${dias} dias</strong>
      </div>
      <p>Para manter a validade das suas operações digitais, <strong>renove agora</strong> e evite interrupções.</p>
      <p>Entre em contato conosco ou acesse o link abaixo para iniciar sua renovação:</p>
      <a class="btn" href="${vars.linkRenovacao ?? '#'}">Renovar Certificado</a>
    `),
  }
}

export function templateVencido(vars: TemplateVars, diasVencido: number): { assunto: string; html: string } {
  return {
    assunto: `🚨 Seu certificado digital venceu há ${diasVencido} dia${diasVencido !== 1 ? 's' : ''}`,
    html: base(`
      <h2>Atenção, ${vars.nomeCliente}!</h2>
      <div class="alerta vermelho">
        <strong>⛔ Certificado:</strong> ${vars.modeloCertificado ?? 'Certificado Digital'}<br/>
        <strong>📅 Venceu em:</strong> ${vars.dataVencimento}<br/>
        <strong>⏰ Já são ${diasVencido} dia${diasVencido !== 1 ? 's' : ''} de atraso</strong>
      </div>
      <p>Com o certificado vencido você não consegue mais:</p>
      <ul>
        <li>Emitir Notas Fiscais</li>
        <li>Acessar o e-CAC e portais da Receita Federal</li>
        <li>Assinar contratos e documentos digitalmente</li>
        <li>Cumprir obrigações fiscais (SPED, eSocial, DCTF)</li>
      </ul>
      <p>A irregularidade pode gerar <strong>multas e bloqueios</strong> em seus sistemas. <strong>Renove agora</strong> e regularize sua situação — o processo é rápido, feito por videoconferência, sem sair de casa.</p>
      <a class="btn" href="${vars.linkRenovacao ?? '#'}">Renovar Certificado</a>
    `),
  }
}

export function templatePosEmissao(vars: TemplateVars): { assunto: string; html: string } {
  return {
    assunto: `✅ Certificado digital emitido com sucesso!`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#059669);padding:40px 40px 30px;text-align:center;">
            <img src="https://4uvdfywq1qlqpdri.public.blob.vercel-storage.com/vg-logo-jEQ8b69Sfi9ucfePhmxuMoHLc6BUCG.png" width="160" alt="V&G Certificação Digital" style="display:block;margin:0 auto 20px;" />
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;">
              <span style="font-size:32px;line-height:64px;">✅</span>
            </div>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:bold;">Certificado Emitido!</h1>
            <p style="color:#bbf7d0;margin:8px 0 0;font-size:15px;">Processo concluído com sucesso</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#374151;font-size:16px;margin:0 0 24px;">
              Parabéns, <strong>${vars.nomeCliente.split(' ')[0]}</strong>! 🎉
            </p>
            <p style="color:#374151;font-size:15px;margin:0 0 28px;line-height:1.6;">
              Seu certificado digital foi emitido com sucesso e já está ativo.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:28px;">
              <tr><td style="padding:24px;">
                <table width="100%" cellpadding="0" cellspacing="6">
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0;">Titular:</td>
                    <td style="color:#111827;font-size:13px;font-weight:bold;text-align:right;padding:4px 0;">${vars.nomeCliente}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0;">Tipo:</td>
                    <td style="color:#111827;font-size:13px;text-align:right;padding:4px 0;">${vars.modeloCertificado ?? 'Certificado Digital'}</td>
                  </tr>
                  ${vars.protocolo ? `
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0;">Protocolo:</td>
                    <td style="color:#2563eb;font-size:13px;font-weight:bold;font-family:monospace;text-align:right;padding:4px 0;">${vars.protocolo}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0;">Status:</td>
                    <td style="text-align:right;padding:4px 0;">
                      <span style="background:#dcfce7;color:#16a34a;font-size:12px;font-weight:bold;padding:3px 10px;border-radius:20px;">✓ Aprovado</span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="color:#111827;font-size:15px;font-weight:bold;margin:0 0 12px;">Com seu certificado digital você pode:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              ${[
                ['📝', 'Assinar documentos com validade jurídica'],
                ['🏛️', 'Acessar o e-CAC e portais da Receita Federal'],
                ['🧾', 'Emitir Notas Fiscais Eletrônicas (NF-e)'],
                ['📋', 'Cumprir obrigações fiscais (SPED, eSocial, DCTF)'],
                ['🤝', 'Assinar contratos à distância com validade legal'],
              ].map(([emoji, texto]) => `
              <tr>
                <td style="padding:5px 0;vertical-align:top;width:28px;font-size:15px;">${emoji}</td>
                <td style="padding:5px 0;color:#374151;font-size:14px;line-height:1.5;">${texto}</td>
              </tr>`).join('')}
            </table>

            <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.6;">
              Em caso de dúvidas ou se precisar de suporte, entre em contato conosco.
            </p>
          </td>
        </tr>

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
</html>`,
  }
}

export function templateNutricao(vars: TemplateVars, trimestre: number): { assunto: string; html: string } {
  const conteudos: Record<number, { titulo: string; corpo: string }> = {
    1: {
      titulo: 'Você sabia? 5 benefícios do certificado digital que talvez não use',
      corpo: `
        <h2>Olá, ${vars.nomeCliente}! 👋</h2>
        <p>Já faz 3 meses desde que você adquiriu seu certificado digital. Aproveite ao máximo com essas dicas:</p>
        <ul>
          <li><strong>Assinar PDFs gratuitamente</strong> — use o Adobe Acrobat ou DocuSign com seu cert.</li>
          <li><strong>Declaração do IR</strong> — acesse o e-CAC da Receita Federal sem senha.</li>
          <li><strong>Abrir MEI/CNPJ</strong> — processo 100% digital e instantâneo.</li>
          <li><strong>Licitações públicas</strong> — participe de compras governamentais.</li>
          <li><strong>Assinar contratos à distância</strong> — válido juridicamente em todo o Brasil.</li>
        </ul>
        <p>Ficou com dúvidas? Fale conosco!</p>`,
    },
    2: {
      titulo: 'Como proteger e usar melhor seu certificado digital A3',
      corpo: `
        <h2>Dicas de segurança para seu certificado, ${vars.nomeCliente}!</h2>
        <p>Seu certificado digital é como uma identidade eletrônica. Veja como mantê-lo seguro:</p>
        <ul>
          <li>Nunca compartilhe sua senha PIN com ninguém</li>
          <li>Remova o token/cartão quando não estiver usando</li>
          <li>Mantenha o driver do token atualizado</li>
          <li>Registre seu certificado no e-CAC para maior segurança</li>
        </ul>
        <p>Precisa de suporte técnico? Estamos aqui para ajudar!</p>`,
    },
    3: {
      titulo: 'Seu certificado digital vence em 3 meses — planeje a renovação',
      corpo: `
        <h2>Hora de planejar a renovação, ${vars.nomeCliente}!</h2>
        <p>Seu certificado digital está na reta final de validade. A renovação é rápida e você mantém:</p>
        <ul>
          <li>Todos os seus dados cadastrais</li>
          <li>Histórico de documentos assinados</li>
          <li>Acesso contínuo a todos os sistemas</li>
        </ul>
        <p><strong>Renove com antecedência e evite imprevistos!</strong></p>
        <p>Agende sua renovação agora com condições especiais para clientes fidelizados.</p>`,
    },
  }

  const { titulo, corpo } = conteudos[trimestre] ?? conteudos[1]

  return {
    assunto: `💡 ${titulo}`,
    html: base(corpo),
  }
}