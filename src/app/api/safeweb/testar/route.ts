import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, listarProdutos } from '@/lib/safeweb'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const diagnostico = await diagnosticar()

  if (!diagnostico.tokenOk) {
    return NextResponse.json({ ...diagnostico, produtos: null })
  }

  // Testa tipos de emissão 1 a 6 para descobrir quais são válidos para esta AR
  const resultados: Record<string, unknown> = {}
  for (let tipo = 1; tipo <= 6; tipo++) {
    const { ok, produtos, erro } = await listarProdutos(tipo)
    resultados[`tipo_${tipo}`] = ok ? { ok: true, qtd: produtos?.length, produtos } : { ok: false, erro }
  }

  return NextResponse.json({ ...diagnostico, resultados })
}