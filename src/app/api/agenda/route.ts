import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const schemaEvento = z.object({
  titulo: z.string().min(2),
  descricao: z.string().optional(),
  inicio: z.string(),
  duracao: z.number().default(60),
  agr: z.enum(['vinicius', 'ana', 'arlen']),
  tipo: z.enum(['presencial', 'videoconferencia', 'bonificado', 'pessoal', 'pre-agendado']),
  localizacao: z.string().optional(),
  calendarId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schemaEvento.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL
  const token = process.env.APPS_SCRIPT_TOKEN

  if (!scriptUrl) {
    return NextResponse.json({ erro: 'Google Apps Script não configurado' }, { status: 400 })
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parsed.data,
        token,
      }),
      redirect: 'follow',
    })

    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ erro: data.msg ?? 'Erro ao criar evento' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, eventoId: data.eventoId, msg: data.msg })
  } catch (err) {
    return NextResponse.json({ erro: `Erro de conexão: ${String(err)}` }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const scriptUrl = process.env.APPS_SCRIPT_URL
  const token = process.env.APPS_SCRIPT_TOKEN

  if (!scriptUrl) {
    return NextResponse.json({ conectado: false, calendarios: [] })
  }

  try {
    const res = await fetch(`${scriptUrl}?token=${token}`, { redirect: 'follow' })
    const data = await res.json()
    return NextResponse.json({ conectado: data.ok, calendarios: data.calendarios ?? [] })
  } catch {
    return NextResponse.json({ conectado: false, calendarios: [] })
  }
}