import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUrlAutorizacao } from '@/lib/google/calendar'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const url = getUrlAutorizacao()
  return NextResponse.redirect(url)
}