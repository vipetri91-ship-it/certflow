import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { prisma } from '../prisma'
import { buscarUltimaExecucao, estaAtrasado } from './heartbeat'

export interface ResultadoVerificacaoLeve {
  achados: string[]         // urgentes — falha técnica, dispara Telegram
  achadosInformativos: string[] // pedidos parados — só log no banco, vai para o e-mail diário
  correcoes: string[]
}

const NOME_AMIGAVEL: Record<string, string> = {
  'relatorio-diario': 'relatório diário',
  'processar-emails': 'envio de e-mails de vencimento',
  'processar-whatsapp': 'envio de WhatsApp de vencimento',
  'secretaria-diaria': 'briefing diário da Secretária',
  'relatorio-semanal-agr-digital': 'relatório semanal do setor AGR Digital',
  'relatorio-semanal-auditor': 'relatório semanal do setor Auditor',
  'lembrete-agendamento': 'lembrete de agendamento',
  'aniversario-clientes': 'aniversário de clientes',
  'reativacao-clientes': 'campanha de reativação de clientes',
  'pesquisa-nps': 'pesquisa de satisfação (NPS)',
}

const NOME_STATUS_PEDIDO: Record<string, string> = {
  GERADO: 'recém-criado',
  VERIFICADO: 'verificado, aguardando emissão',
}

// Job → intervalo esperado entre execuções (minutos) + tolerância. Espelha
// os horários do scripts/cron-worker.js — se mudar lá, mudar aqui também.
const JOBS_MONITORADOS: { job: string; intervaloMin: number; toleranciaMin: number }[] = [
  { job: 'relatorio-diario', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'processar-emails', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'processar-whatsapp', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'secretaria-diaria', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'relatorio-semanal-agr-digital', intervaloMin: 7 * 24 * 60, toleranciaMin: 60 },
  { job: 'relatorio-semanal-auditor', intervaloMin: 7 * 24 * 60, toleranciaMin: 60 },
  { job: 'lembrete-agendamento', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'aniversario-clientes', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'reativacao-clientes', intervaloMin: 24 * 60, toleranciaMin: 30 },
  { job: 'pesquisa-nps', intervaloMin: 24 * 60, toleranciaMin: 30 },
]

async function dispararCatchUp(job: string): Promise<{ ok: boolean; erro?: string }> {
  const baseUrl = process.env.JOB_BASE_URL || 'https://www.vazcertflow.com.br'
  const token = process.env.AUTH_SECRET
  try {
    const res = await fetch(`${baseUrl}/api/jobs/${job}`, {
      method: 'POST',
      headers: { 'x-job-token': token ?? '' },
    })
    if (!res.ok) return { ok: false, erro: `código ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: String(e) }
  }
}

export async function executarVerificacaoLeve(): Promise<ResultadoVerificacaoLeve> {
  const achados: string[] = []
  const achadosInformativos: string[] = []
  const correcoes: string[] = []
  const agora = new Date()

  // 1. Jobs atrasados — dispara de novo como reforço (idempotente: os jobs já
  // têm proteção contra reenvio duplicado, então catch-up é seguro).
  for (const { job, intervaloMin, toleranciaMin } of JOBS_MONITORADOS) {
    const ultima = await buscarUltimaExecucao(job)
    if (estaAtrasado(ultima, agora, intervaloMin, toleranciaMin)) {
      const nome = NOME_AMIGAVEL[job] ?? job
      const quando = ultima ? format(ultima, "dd/MM 'às' HH:mm", { locale: ptBR }) : 'nunca'
      achados.push(`O ${nome} ainda não tinha rodado hoje (última vez: ${quando}).`)
      const resultado = await dispararCatchUp(job)
      if (resultado.ok) {
        correcoes.push(`Mandei rodar o ${nome} de novo agora, como reforço.`)
      } else {
        achados.push(`Tentei reforçar o ${nome}, mas não consegui (${resultado.erro}).`)
      }
    }
  }

  // 2. Pedidos travados há muito tempo em GERADO/VERIFICADO — informativo apenas.
  // Vai para o e-mail diário, NÃO para o Telegram, para evitar spam a cada 20 min
  // quando o cliente simplesmente não retornou para concluir o processo.
  const limiteTravado = new Date(agora.getTime() - 48 * 60 * 60 * 1000)
  const travados = await prisma.pedido.findMany({
    where: { status: { in: ['GERADO', 'VERIFICADO'] }, createdAt: { lt: limiteTravado } },
    select: { numero: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })
  for (const p of travados) {
    const quando = format(p.createdAt, "dd/MM 'às' HH:mm", { locale: ptBR })
    achadosInformativos.push(`O pedido ${p.numero} está parado (${NOME_STATUS_PEDIDO[p.status] ?? p.status}) desde ${quando} — já passou de 2 dias sem avançar.`)
  }

  // 3. E-mails com erro recente.
  // Sempre deleta o log de ERRO para evitar alertas repetidos a cada 20 min
  // durante as 23h que o log ficaria na janela de 1-24h.
  // - Falha permanente (hard bounce, endereço inválido, bloqueado): alerta com
  //   motivo e instrução para corrigir o e-mail no cadastro — não promete reenvio.
  // - Falha transiente (erro de rede, timeout): deleta e desbloqueia reenvio
  //   natural pelo processar-emails.
  const FALHA_PERMANENTE = ['hardbounce', 'hard_bounce', 'blocked', 'invalidemail', 'invalid']
  const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000)
  const vinteQuatroHorasAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  const comErro = await prisma.emailLog.findMany({
    where: { status: 'ERRO', createdAt: { lt: umaHoraAtras, gte: vinteQuatroHorasAtras } },
    select: { id: true, tipo: true, destinatario: true, certificadoId: true, motivoFalha: true },
  })
  for (const log of comErro) {
    const motivo = log.motivoFalha ?? ''
    const ehPermanente = FALHA_PERMANENTE.some(kw => motivo.toLowerCase().includes(kw))
    const razaoTexto = motivo ? ` (motivo: ${motivo})` : ''

    if (ehPermanente) {
      achados.push(`E-mail pro cliente ${log.destinatario} foi rejeitado permanentemente pelo servidor de destino${razaoTexto}. O endereço pode estar errado — verifique no cadastro do cliente.`)
      await prisma.emailLog.delete({ where: { id: log.id } })
      correcoes.push(`Descartei o registro de falha de ${log.destinatario}. Endereços com rejeição permanente não são reenviados automaticamente — corrija o cadastro do cliente.`)
    } else {
      achados.push(`Um e-mail automático não foi entregue pro cliente ${log.destinatario}${razaoTexto}.`)
      await prisma.emailLog.delete({ where: { id: log.id } })
      correcoes.push(`Liberei o e-mail de ${log.destinatario} pra ser enviado de novo automaticamente na próxima rodada.`)
    }
  }

  return { achados, achadosInformativos, correcoes }
}
