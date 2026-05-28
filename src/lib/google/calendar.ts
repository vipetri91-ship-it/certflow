import { google } from 'googleapis'

// Cores do Google Calendar — IDs oficiais da API
export const CORES_AGENDA: Record<string, string> = {
  // Vinicius
  'vinicius-presencial':       '10', // Basil (verde escuro)
  'vinicius-videoconferencia': '2',  // Sage (verde claro)
  // Arlen
  'arlen-presencial':          '9',  // Blueberry (azul escuro)
  'arlen-videoconferencia':    '7',  // Peacock (azul claro/ciano)
  // Ana
  'ana-presencial':            '3',  // Grape (roxo escuro)
  'ana-videoconferencia':      '1',  // Lavender (roxo claro)
  // Especiais
  'bonificado':                '6',  // Tangerine (laranja)
  'pessoal':                   '11', // Tomato (vermelho)
  'pre-agendado':              '8',  // Graphite (cinza)
}

export type AGR = 'vinicius' | 'ana' | 'arlen'
export type TipoAtendimento = 'presencial' | 'videoconferencia' | 'bonificado' | 'pessoal' | 'pre-agendado'

export interface EventoAgenda {
  titulo: string
  descricao?: string
  inicio: Date
  fim: Date
  agr: AGR
  tipo: TipoAtendimento
  localização?: string
}

function getOAuth2Client() {
  const baseUrl = (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/$/, '')
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/google/callback`
  )
}

export function getUrlAutorizacao(): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}

export async function trocarCodigoPorTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function criarEvento(
  accessToken: string,
  refreshToken: string,
  evento: EventoAgenda,
  calendarId: string = 'primary'
): Promise<string> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const chave = evento.tipo === 'bonificado' || evento.tipo === 'pessoal' || evento.tipo === 'pre-agendado'
    ? evento.tipo
    : `${evento.agr}-${evento.tipo}`

  const colorId = CORES_AGENDA[chave] ?? '0'

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: evento.titulo,
      description: evento.descricao,
      location: evento.localização,
      colorId,
      start: {
        dateTime: evento.inicio.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: evento.fim.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    },
  })

  return response.data.id ?? ''
}

export async function listarEventos(
  accessToken: string,
  refreshToken: string,
  calendarId: string = 'primary',
  inicio?: Date,
  fim?: Date
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const response = await calendar.events.list({
    calendarId,
    timeMin: (inicio ?? new Date()).toISOString(),
    timeMax: fim?.toISOString(),
    maxResults: 200,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return response.data.items ?? []
}

export async function atualizarEvento(
  accessToken: string,
  refreshToken: string,
  eventId: string,
  updates: {
    titulo?: string
    descricao?: string
    localizacao?: string
    agr?: AGR
    tipo?: TipoAtendimento
    inicio?: string
    fim?: string
  },
  calendarId: string = 'primary'
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Busca o evento atual para fazer patch
  const atual = await calendar.events.get({ calendarId, eventId })

  const chave = updates.tipo === 'bonificado' || updates.tipo === 'pessoal' || updates.tipo === 'pre-agendado'
    ? (updates.tipo ?? '')
    : `${updates.agr ?? 'vinicius'}-${updates.tipo ?? 'videoconferencia'}`

  const colorId = (updates.agr || updates.tipo) ? (CORES_AGENDA[chave] ?? atual.data.colorId ?? '0') : undefined

  const response = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      ...(updates.titulo ? { summary: updates.titulo } : {}),
      ...(updates.descricao !== undefined ? { description: updates.descricao } : {}),
      ...(updates.localizacao !== undefined ? { location: updates.localizacao } : {}),
      ...(colorId ? { colorId } : {}),
      ...(updates.inicio ? { start: { dateTime: updates.inicio, timeZone: 'America/Sao_Paulo' } } : {}),
      ...(updates.fim ? { end: { dateTime: updates.fim, timeZone: 'America/Sao_Paulo' } } : {}),
    },
  })

  return response.data
}

export async function deletarEvento(
  accessToken: string,
  refreshToken: string,
  eventId: string,
  calendarId: string = 'primary'
) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  await calendar.events.delete({ calendarId, eventId })
}