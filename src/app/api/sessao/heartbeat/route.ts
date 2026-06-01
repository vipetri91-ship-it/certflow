import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Horário de trabalho: seg-sáb (1-6), 08:00-17:30
function dentroDoHorario(agora: Date): boolean {
  const dia  = agora.getDay()   // 0=dom, 1=seg ... 6=sáb
  const hora = agora.getHours()
  const min  = agora.getMinutes()
  const totalMin = hora * 60 + min

  if (dia === 0 || dia === 6) return false       // sábado e domingo → não conta
  if (totalMin < 8 * 60) return false           // antes das 08:00
  if (totalMin > 17 * 60 + 30) return false     // depois das 17:30
  return true
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false })

  const agora = new Date()
  const hoje  = new Date(agora)
  hoje.setHours(0, 0, 0, 0)

  // Só registra minutos produtivos dentro do horário de trabalho
  if (dentroDoHorario(agora)) {
    await prisma.sessaoAtividade.upsert({
      where:  { usuarioId_data: { usuarioId: session.user.id, data: hoje } },
      create: { usuarioId: session.user.id, data: hoje, minutosAtivos: 1 },
      update: { minutosAtivos: { increment: 1 } },
    })
  }

  return NextResponse.json({ ok: true })
}
