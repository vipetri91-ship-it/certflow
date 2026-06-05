export const preferredRegion = 'gru1'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, getToken, listarProdutos } from '@/lib/safeweb'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const diagnostico = await diagnosticar()
  if (!diagnostico.tokenOk) return NextResponse.json({ ...diagnostico })

  // Testa listagem de produtos (tipos 1 a 5)
  const resultados: Record<string, unknown> = {}
  for (let tipo = 1; tipo <= 5; tipo++) {
    const r = await listarProdutos(tipo)
    resultados[`tipo_${tipo}`] = r.ok
      ? { ok: true, qtd: r.produtos?.length, amostra: r.produtos?.slice(0, 2) }
      : { ok: false, erro: r.erro }
  }

  const sucesso = Object.values(resultados).find((r: any) => r.ok)

  return NextResponse.json({ ...diagnostico, sucesso: !!sucesso, resultados })
}