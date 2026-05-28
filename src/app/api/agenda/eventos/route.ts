import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

function getOAuth2Client(accessToken: string, refreshToken: string) {
  const baseUrl = (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/$/, '')
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/google/callback`
  )
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  return oauth2
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const inicio = searchParams.get('inicio') ? new Date(searchParams.get('inicio')!) : new Date(Date.now() - 30 * 86400000)
  const fim    = searchParams.get('fim')    ? new Date(searchParams.get('fim')!)    : new Date(Date.now() + 90 * 86400000)

  const [atConf, rtConf] = await Promise.all([
    prisma.configuracao.findUnique({ where: { chave: 'google_access_token' } }),
    prisma.configuracao.findUnique({ where: { chave: 'google_refresh_token' } }),
  ])

  if (!atConf?.valor || !rtConf?.valor) {
    return NextResponse.json({ erro: 'Google Calendar não autenticado. Acesse /api/google para conectar.' }, { status: 400 })
  }

  try {
    const auth = getOAuth2Client(atConf.valor, rtConf.valor)

    // Persiste o access_token renovado automaticamente pelo googleapis
    auth.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await prisma.configuracao.upsert({
          where:  { chave: 'google_access_token' },
          update: { valor: tokens.access_token },
          create: { chave: 'google_access_token', valor: tokens.access_token },
        })
      }
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // 1. Busca todos os calendários do usuário
    const listResp = await calendar.calendarList.list({ maxResults: 50 })
    const calendarios = listResp.data.items ?? []

    // Mapeamento pelo NOME do calendário → cor correta do AGR
    const NOME_PARA_COR: Record<string, string> = {
      'ana - presencial':   '#8E24AA', // Grape
      'ana - video':        '#7986CB', // Lavender
      'arlen - presencial': '#3F51B5', // Blueberry
      'arlen - video':      '#039BE5', // Peacock
      'arlen - externo':    '#E67C73', // Flamingo
      'vinicius - presencial': '#0B8043', // Basil
      'vinicius - video':   '#33B679', // Sage
      'vinicius - externo': '#F6BF26', // Banana
      'bonificados':        '#F4511E', // Tangerine
      'pessoal-reunioes':   '#D50000', // Tomato
      'pessoal - reunioes': '#D50000',
      'pre-agendados':      '#616161', // Graphite
      'pré-agendados':      '#616161',
    }

    // Mapeamento adicional por backgroundColor para calendários cujo nome não bate
    // (ex: calendário principal "vegpiracaia@gmail.com" tem o mesmo #9fe1e7 do Arlen Video)
    const BG_PARA_COR: Record<string, string> = {
      '#9fe1e7': '#039BE5', // Peacock (Arlen Video / calendário principal)
      '#4986e7': '#3F51B5', // Blueberry (Arlen/Ana Presencial)
      '#d06b64': '#E67C73', // Flamingo (Arlen Externo)
      '#fa573c': '#F4511E', // Tangerine (Bonificados)
      '#f83a22': '#D50000', // Tomato (Pessoal)
      '#fbe983': '#F6BF26', // Banana (Vinicius Externo)
      '#16a765': '#0B8043', // Basil (Vinicius Presencial)
      '#c2c2c2': '#616161', // Graphite (Pre-agendados)
      '#9a9cff': '#7986CB', // Lavender (Ana Video)
      '#92e1c0': '#33B679', // Sage (Vinicius Video)
    }

    function corDoCalendario(nome: string, bg: string): string {
      const chave = nome.toLowerCase().trim()
      // 1. Tenta pelo nome
      if (NOME_PARA_COR[chave]) return NOME_PARA_COR[chave]
      // 2. Tenta pelo backgroundColor exato
      if (bg && BG_PARA_COR[bg.toLowerCase()]) return BG_PARA_COR[bg.toLowerCase()]
      // 3. Fallback: usa o backgroundColor original
      return bg ?? '#7986CB'
    }

    // 2. Busca eventos de todos os calendários em paralelo
    const todosEventos = await Promise.allSettled(
      calendarios.map(async (cal) => {
        const resp = await calendar.events.list({
          calendarId: cal.id!,
          timeMin: inicio.toISOString(),
          timeMax: fim.toISOString(),
          maxResults: 500,
          singleEvents: true,
          orderBy: 'startTime',
        })
        const calColor = corDoCalendario(cal.summary ?? '', cal.backgroundColor ?? '#7986CB')
        return (resp.data.items ?? []).map(e => ({
          id: e.id!,
          titulo: e.summary ?? '(sem título)',
          descricao: e.description ?? '',
          localizacao: e.location ?? '',
          inicio: e.start?.dateTime ?? e.start?.date ?? '',
          fim:    e.end?.dateTime   ?? e.end?.date   ?? '',
          colorId: e.colorId ?? '',
          calendarId: cal.id!,
          cor: e.colorId ? undefined : calColor,
        }))
      })
    )

    // 3. Consolida todos os eventos
    type EventoItem = { id: string; titulo: string; descricao: string; localizacao: string; inicio: string; fim: string; colorId: string; calendarId: string; cor?: string }
    const eventos = (todosEventos
      .filter((r) => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<EventoItem[]>).value) as EventoItem[])
      .filter(e => e.id && e.inicio)

    return NextResponse.json({ eventos, calendarios: calendarios.map(c => ({ id: c.id, nome: c.summary, cor: c.backgroundColor })) })

  } catch (err) {
    console.error('Erro ao listar eventos:', err)
    return NextResponse.json({ erro: 'Erro ao buscar eventos. Token pode ter expirado — tente reconectar em /api/google' }, { status: 500 })
  }
}
