import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { criarToken, cookieName } from '@/lib/portal-session'
import { verificarRateLimit, registrarFalha, registrarSucesso } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { login, senha } = await req.json()

  if (!login || !senha) {
    return NextResponse.json({ erro: 'Login e senha são obrigatórios' }, { status: 400 })
  }

  // Rate limiting por IP (anti força-bruta) — mesmo mecanismo já usado no
  // login principal (src/lib/auth.ts). O portal do parceiro expõe dado
  // bancário/Pix na sessão, então não pode ficar sem essa proteção
  // (achado 17/07/2026, auditoria de segurança).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { bloqueado } = verificarRateLimit(ip)
  if (bloqueado) {
    return NextResponse.json({ erro: 'Muitas tentativas. Tente novamente em 30 minutos.' }, { status: 429 })
  }

  const parceiro = await prisma.parceiro.findUnique({
    where: { loginParceiro: login },
    select: { id: true, senhaParceiro: true, statusPainel: true, nome: true },
  })

  if (!parceiro || !parceiro.senhaParceiro) {
    registrarFalha(ip)
    return NextResponse.json({ erro: 'Usuário ou senha incorretos' }, { status: 401 })
  }

  if (!parceiro.statusPainel) {
    return NextResponse.json({ erro: 'Acesso ao portal não está ativo para este parceiro' }, { status: 403 })
  }

  const senhaValida = await bcrypt.compare(senha, parceiro.senhaParceiro)
  if (!senhaValida) {
    registrarFalha(ip)
    return NextResponse.json({ erro: 'Usuário ou senha incorretos' }, { status: 401 })
  }

  registrarSucesso(ip)
  const token = criarToken(parceiro.id)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  })
  return res
}
