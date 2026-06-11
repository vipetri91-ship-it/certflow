import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelarSolicitacao, consultarProtocolo } from '@/lib/safeweb'

// Endpoint TEMPORÁRIO — somente ADMIN autenticado.
// Uso único: validar cancelarSolicitacao() com o protocolo de teste 1010781571
// (ver docs/LIMPEZA_EXECUTADA.md). Aceita apenas esse protocolo, fixo no código.
// Remover após a validação.
const PROTOCOLO_TESTE = '1010781571'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const cancelamento = await cancelarSolicitacao(PROTOCOLO_TESTE, 4)
  const consulta = await consultarProtocolo(PROTOCOLO_TESTE)

  return NextResponse.json({ protocolo: PROTOCOLO_TESTE, cancelamento, consulta })
}