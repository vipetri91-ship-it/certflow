import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelarSolicitacao, consultarProtocolo } from '@/lib/safeweb'

// Endpoint TEMPORÁRIO — somente ADMIN autenticado.
// Uso único: cancelar 3 protocolos de teste antigos que continuavam
// ativos na Safeweb e gerando e-mails de lembrete de documentação
// (ver docs/LIMPEZA_EXECUTADA.md). Lista fixa, sem parâmetros externos.
// Remover após a validação.
const PROTOCOLOS_TESTE = ['1010749376', '1010766479', '1010749841'] as const

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
