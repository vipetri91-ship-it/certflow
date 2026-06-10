import { NextResponse } from 'next/server'

// Horário oficial do servidor — usado para validar agendamentos sem depender
// do relógio/fuso configurado na máquina do usuário
export async function GET() {
  return NextResponse.json({ agora: new Date().toISOString() })
}