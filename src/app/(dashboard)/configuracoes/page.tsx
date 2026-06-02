import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react'

interface Integracao {
  nome:       string
  descricao:  string
  status:     'ativo' | 'pendente' | 'em_breve'
  detalhe?:   string
  link?:      string
  linkLabel?: string
  icone:      string
}

function getIntegracoes(): Integracao[] {
  const digisacOk = !!(process.env.DIGISAC_URL && process.env.DIGISAC_TOKEN && process.env.DIGISAC_CHANNEL_ID)
  const googleOk  = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const smtpOk    = !!(process.env.SMTP_HOST && process.env.SMTP_PASS && process.env.SMTP_USER)
  const safewebOk = !!(process.env.SAFEWEB_API_URL && process.env.SAFEWEB_API_KEY)
  const boletoOk  = !!(process.env.BOLETO_API_URL && process.env.BOLETO_API_KEY)
  const anthropicOk = !!(process.env.ANTHROPIC_API_KEY)

  return [
    {
      icone: '💬',
      nome: 'Digisac — WhatsApp',
      descricao: 'Envio automático de mensagens WhatsApp para clientes. Usado nos alertas de vencimento e notificações.',
      status: digisacOk ? 'ativo' : 'pendente',
      detalhe: digisacOk ? 'Canal e token configurados' : 'Configure DIGISAC_URL, DIGISAC_TOKEN e DIGISAC_CHANNEL_ID no Vercel',
    },
    {
      icone: '📅',
      nome: 'Google Calendar',
      descricao: 'Integração com a agenda do Google. Cria eventos automaticamente ao finalizar pedidos com agendamento.',
      status: googleOk ? 'ativo' : 'pendente',
      detalhe: googleOk ? 'OAuth configurado' : 'Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Vercel',
    },
    {
      icone: '✉️',
      nome: 'Brevo — E-mail',
      descricao: 'Disparo de e-mails automáticos de vencimento, pós-emissão e nutrição de clientes via SMTP.',
      status: smtpOk ? 'ativo' : 'pendente',
      detalhe: smtpOk ? `SMTP: ${process.env.SMTP_HOST}` : 'Configure as variáveis SMTP no Vercel',
    },
    {
      icone: '✨',
      nome: 'Claude AI (ZOE)',
      descricao: 'Inteligência artificial da ZOE — consultas ao banco de dados, base de conhecimento e atendimento interno.',
      status: anthropicOk ? 'ativo' : 'pendente',
      detalhe: anthropicOk ? 'API key configurada (Haiku 4.5)' : 'Configure ANTHROPIC_API_KEY no Vercel',
    },
    {
      icone: '🏦',
      nome: 'Banco Inter — Boleto',
      descricao: 'Geração automática de boletos bancários ao finalizar pedidos. O boleto é enviado por WhatsApp e e-mail.',
      status: boletoOk ? 'ativo' : 'em_breve',
      detalhe: boletoOk ? 'API configurada' : 'Implementação planejada — aguardando credenciais da conta PJ Inter',
      link: 'https://developers.inter.com.br',
      linkLabel: 'Documentação Inter',
    },
    {
      icone: '🔐',
      nome: 'Safeweb API',
      descricao: 'Geração automática de protocolos de emissão no Hope Portal. Elimina o passo manual de copiar e colar o protocolo.',
      status: safewebOk ? 'ativo' : 'pendente',
      detalhe: safewebOk ? 'Conectado ao Hope Portal' : 'Aguardando credenciais da AR Safeweb — configure quando receber',
    },
  ]
}

const STATUS_CONFIG = {
  ativo: {
    label: 'Ativo',
    cor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
    iconCor: 'text-green-500',
  },
  pendente: {
    label: 'Pendente',
    cor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: XCircle,
    iconCor: 'text-yellow-500',
  },
  em_breve: {
    label: 'Em breve',
    cor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
    iconCor: 'text-blue-400',
  },
}

export default async function IntegracoesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  const integracoes = getIntegracoes()
  const ativos   = integracoes.filter(i => i.status === 'ativo').length
  const pendentes = integracoes.filter(i => i.status === 'pendente').length

  return (
    <div>
      <Header titulo="Integrações" />
      <div className="p-4 lg:p-6 max-w-4xl space-y-5">

        {/* Resumo */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm px-5 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{ativos} ativas</span>
          </div>
          <div className="w-px h-4 bg-gray-200 dark:bg-slate-600" />
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{pendentes} pendentes</span>
          </div>
          <div className="ml-auto text-xs text-gray-400 dark:text-slate-500">
            Credenciais configuradas no painel do Vercel
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integracoes.map(integ => {
            const cfg = STATUS_CONFIG[integ.status]
            const Icon = cfg.icon
            return (
              <div key={integ.nome}
                className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-5 space-y-3 ${
                  integ.status === 'ativo'
                    ? 'border-green-100 dark:border-green-900/50'
                    : integ.status === 'em_breve'
                    ? 'border-blue-100 dark:border-blue-900/50'
                    : 'border-gray-100 dark:border-slate-700'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl leading-none">{integ.icone}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{integ.nome}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.cor}`}>
                    <Icon className={`w-3 h-3 ${cfg.iconCor}`} />
                    {cfg.label}
                  </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  {integ.descricao}
                </p>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <p className={`text-xs font-medium ${
                    integ.status === 'ativo' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'
                  }`}>
                    {integ.detalhe}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {integ.link && (
                      <a href={integ.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition">
                        {integ.linkLabel} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {integ.nome === 'Google Calendar' && (
                      <a href="/api/google" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                        {integ.status === 'ativo' ? '🔄 Trocar conta' : '🔗 Conectar'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Nota */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <strong>Como adicionar uma integração:</strong> Acesse o painel do Vercel → Settings → Environment Variables e adicione as variáveis correspondentes. A mudança entra em vigor no próximo deploy.
        </div>
      </div>
    </div>
  )
}
