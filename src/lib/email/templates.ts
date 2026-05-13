export interface TemplateVars {
  nomeCliente: string
  modeloCertificado?: string
  dataVencimento?: string
  diasRestantes?: number
  linkRenovacao?: string
  nomeEmpresa?: string
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

export function templatePosEmissao(vars: TemplateVars): { assunto: string; html: string } {
  return {
    assunto: `✅ Certificado digital emitido com sucesso!`,
    html: base(`
      <h2>Parabéns, ${vars.nomeCliente}! 🎉</h2>
      <p>Seu certificado digital foi emitido com sucesso.</p>
      <p><strong>Certificado:</strong> ${vars.modeloCertificado ?? 'Certificado Digital'}</p>
      <p>Agradecemos a sua confiança! Com o certificado digital você pode:</p>
      <ul>
        <li>Assinar documentos com validade jurídica</li>
        <li>Acessar sistemas governamentais com segurança</li>
        <li>Emitir notas fiscais eletrônicas (e-NF)</li>
        <li>Assinar contratos e declarações</li>
        <li>E muito mais...</li>
      </ul>
      <p>Em caso de dúvidas sobre o uso do seu certificado, estamos à disposição!</p>
    `),
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