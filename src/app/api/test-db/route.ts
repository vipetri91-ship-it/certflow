import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.usuario.count()
    return NextResponse.json({ ok: true, usuarios: count, db_url: process.env.DATABASE_URL?.slice(0, 40) + '...' })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      erro: String(err),
      db_url_raw: process.env.DATABASE_URL ?? 'UNDEFINED',
      db_url_50: (process.env.DATABASE_URL ?? '').substring(0, 50),
    }, { status: 500 })
  }
}