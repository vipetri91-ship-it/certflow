import { NextRequest, NextResponse } from 'next/server'

// Acionado pelo Vercel Cron — Segunda, Quarta e Sexta às 8h
export async function GET(req: NextRequest) {
  const hoje = new Date()
  const dia  = hoje.getDay() // 0=dom, 1=seg, 3=qua, 5=sex

  if (![1, 3, 5].includes(dia)) {
    return NextResponse.json({ ok: true, msg: 'Não é dia de post' })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://certflow-nine.vercel.app'

  const res = await fetch(`${baseUrl}/api/social/gerar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': req.headers.get('cookie') ?? '',
    },
  })

  const data = await res.json()
  return NextResponse.json({ ok: true, ...data })
}