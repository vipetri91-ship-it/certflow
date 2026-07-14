import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp } from '@/lib/digisac'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { google } from 'googleapis'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function autenticado(req: NextRequest): boolean {
  return req.headers.get('x-job-token') === process.env.AUTH_SECRET
}

// Busca eventos do Google Calendar (todos os calendários) para uma janela de
// tempo — versão sem sessão de usuário, pensada pra rodar como robô (o
// endpoint /api/agenda/eventos existente exige cookie de login e não pode
// ser chamado por um job). Duplica parte da lógica de lá de propósito, pra
// não mexer numa tela que já está em produção (Regra 2 da governança).
async function buscarEventosGoogle(inicio: Date, fim: Date) {
  const [atConf, rtConf] = await Promise.all([
    prisma.configuracao.findUnique({ where: { chave: 'google_access_token' } }),
    prisma.configuracao.findUnique({ where: { chave: 'google_refresh_token' } }),
  ])
  if (!atConf?.valor || !rtConf?.valor) throw new Error('Google Calendar não autenticado')

  const baseUrl = (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/$/, '')
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/google/callback`
  )
  oauth2.setCredentials({ access_token: atConf.valor, refresh_token: rtConf.valor })
  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.configuracao.upsert({
        where: { chave: 'google_access_token' },
        update: { valor: tokens.access_token },
        create: { chave: 'google_access_token', valor: tokens.access_token },
      })
    }
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2 })
  const listResp = await calendar.calendarList.list({ maxResults: 50 })
  const calendarios = listResp.data.items ?? []

  const eventos: { titulo: string; descricao: string; inicio: string }[] = []
  for (const cal of calendarios) {
    try {
      const resp = await calendar.events.list({
        calendarId: cal.id!,
        timeMin: inicio.toISOString(),
        timeMax: fim.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      })
      for (const e of resp.data.items ?? []) {
        const inicioEvento = e.start?.dateTime ?? e.start?.date ?? ''
        if (!inicioEvento) continue
        eventos.push({ titulo: e.summary ?? '', descricao: e.description ?? '', inicio: inicioEvento })
      }
    } catch (err) {
      console.error('[lembrete-agendamento] falha ao buscar eventos do calendário', cal.summary, cal.id, err)
    }
  }
  return eventos
}

// Roda toda manhã (ver scripts/cron-worker.js), avisando quem tem
// atendimento marcado para o DIA SEGUINTE — reduz falta ("no-show"). O
// vínculo com o Pedido vem do texto "Pedido: <numero>" que
// src/app/api/pedidos/nova-venda/route.ts já grava na descrição do evento.
export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)
  const depoisDeAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2)

  const resultado = { enviados: 0, pulados: 0, erros: 0 }

  let eventos: Awaited<ReturnType<typeof buscarEventosGoogle>>
  try {
    eventos = await buscarEventosGoogle(amanha, depoisDeAmanha)
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String(e) }, { status: 500 })
  }

  for (const evento of eventos) {
    const match = evento.descricao.match(/Pedido:\s*(\S+)/)
    if (!match) { resultado.pulados++; continue }
    const numeroPedido = match[1]

    const pedido = await prisma.pedido.findUnique({
      where: { numero: numeroPedido },
      select: { id: true, status: true, cliente: { select: { id: true, nome: true, celular: true, telefone: true } } },
    })
    if (!pedido || pedido.status === 'CANCELADO') { resultado.pulados++; continue }

    const telefone = pedido.cliente.celular ?? pedido.cliente.telefone
    if (!telefone) { resultado.pulados++; continue }

    const jaEnviado = await prisma.historicoContato.findFirst({
      where: { clienteId: pedido.cliente.id, observacao: `Lembrete de agendamento enviado — pedido ${numeroPedido}` },
      select: { id: true },
    })
    if (jaEnviado) { resultado.pulados++; continue }

    const dataHora = format(new Date(evento.inicio), "dd/MM 'às' HH:mm", { locale: ptBR })
    const primeiroNome = pedido.cliente.nome.split(' ')[0]
    const mensagem =
      `👋 Olá, ${primeiroNome}!\n\n` +
      `Passando pra lembrar: amanhã (${dataHora}) é o seu atendimento marcado com a V&G para o seu certificado digital.\n\n` +
      `Qualquer imprevisto, nos avise por aqui! Até lá 😊\n\n` +
      `_V&G Certificação Digital_`

    try {
      const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: pedido.cliente.nome })
      if (envio.ok) {
        await prisma.historicoContato.create({
          data: { clienteId: pedido.cliente.id, observacao: `Lembrete de agendamento enviado — pedido ${numeroPedido}` },
        })
        resultado.enviados++
      } else {
        resultado.erros++
      }
    } catch {
      resultado.erros++
    }
    await new Promise(r => setTimeout(r, 300))
  }

  await registrarHeartbeat('lembrete-agendamento')
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
