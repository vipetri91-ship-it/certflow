import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@certflow.com.br' },
    })

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const senhaOk = await bcrypt.compare('certflow@2024', usuario.senha)

    return NextResponse.json({
      encontrado: true,
      senhaOk,
      role: usuario.role,
      senhaHash: usuario.senha.slice(0, 20) + '...',
    })
  } catch (err) {
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}