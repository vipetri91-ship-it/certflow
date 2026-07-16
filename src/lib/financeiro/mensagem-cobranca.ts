// Montagem da mensagem de cobrança (WhatsApp + e-mail) — extraído de
// src/app/api/inter/cobranca/enviar/route.ts (16/07/2026) pra ser
// reaproveitado também pelo Robô Financeiro: o texto de introdução vem do
// padrão fixo (manual ou automático) — o boleto/Pix real sempre vai junto,
// senão a cobrança não serve pra nada.
import { format } from 'date-fns'

export interface DadosCobrancaMensagem {
  descricao: string
  valor: number
  dataVencimento: Date
  pixCopiaECola?: string | null
  nomeCliente: string
  linkPdfBoleto: string
  // Se ausente, usa o texto padrão "Olá, {nome}! Segue sua cobrança:".
  // Quando vem do Robô Financeiro, é o texto de montarMensagemPadraoCobranca.
  textoIntroducao?: string
}

// Mensagem padrão do Robô Financeiro (cobrança de vencidos) — texto fixo,
// nunca gerado por IA nem alterado por variação: o Vinicius pediu
// explicitamente (16/07/2026) que a cobrança ao cliente use sempre o mesmo
// texto, pra manter previsibilidade no tom e no conteúdo.
export function montarMensagemPadraoCobranca(nomeCliente: string, valor: number): string {
  const valorFmt = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  return `Olá ${nomeCliente}! 👋 Tudo bem? Gostaríamos de lembrar que o pagamento do seu certificado digital no valor de R$ ${valorFmt} está aguardando sua confirmação. Qualquer dúvida, é só chamar a gente! 😊`
}

export function montarMensagemWhatsApp(d: DadosCobrancaMensagem): string {
  const valorFmt = d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const vencimentoFmt = format(d.dataVencimento, 'dd/MM/yyyy')
  const primeiroNome = d.nomeCliente.split(' ')[0]
  const introducao = d.textoIntroducao ?? `Olá, ${primeiroNome}! Segue sua cobrança:`

  return (
    `📋 *Cobrança — ${d.descricao}*\n\n` +
    `${introducao}\n\n` +
    `💰 Valor: R$ ${valorFmt}\n` +
    `📅 Vencimento: ${vencimentoFmt}\n\n` +
    (d.pixCopiaECola ? `📲 *Pix Copia e Cola:*\n${d.pixCopiaECola}\n\n` : '') +
    `📄 Boleto em PDF:\n${d.linkPdfBoleto}\n\n` +
    `_V&G Certificação Digital_`
  )
}

export function montarHtmlEmailCobranca(d: DadosCobrancaMensagem): string {
  const valorFmt = d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const vencimentoFmt = format(d.dataVencimento, 'dd/MM/yyyy')
  const primeiroNome = d.nomeCliente.split(' ')[0]
  const introducao = d.textoIntroducao ?? `Segue sua cobrança referente a <strong>${d.descricao}</strong>:`

  return `
    <p>Olá, ${primeiroNome}!</p>
    <p>${introducao}</p>
    <p>💰 Valor: <strong>R$ ${valorFmt}</strong><br/>📅 Vencimento: <strong>${vencimentoFmt}</strong></p>
    ${d.pixCopiaECola ? `<p>Pix Copia e Cola:<br/><code>${d.pixCopiaECola}</code></p>` : ''}
    <p>O boleto está em anexo (PDF).</p>
    <p>V&amp;G Certificação Digital</p>
  `
}
