import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelarSolicitacao, consultarProtocolo } from '@/lib/safeweb'

// Endpoint TEMPORÁRIO — somente ADMIN autenticado.
// Uso único: cancelar os 3 protocolos de teste remanescentes
// (ver docs/LIMPEZA_EXECUTADA.md). Lista fixa, sem parâmetros externos.
// Remover após a validação.
const PROTOCOLOS_TESTE = ['1010781647', '1010782402', '1010782465'] as const

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const resultados = []
  for (const protocolo of PROTOCOLOS_TESTE) {
    const cancelamento = await cancelarSolicitacao(protocolo, 4)
    const consulta = await consultarProtocolo(protocolo)
    resultados.push({ protocolo, cancelamento, consulta })
  }

  return NextResponse.json({ resultados })
}
