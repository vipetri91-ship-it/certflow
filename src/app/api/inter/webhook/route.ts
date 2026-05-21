import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Inter envia POST nesta URL quando a cobrança é paga
// Configurar em: Inter → API → Webhooks → Cobrança
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Payload Inter: { evento: 'COBRANCA_LIQUIDADA', cobranca: { nossoNumero, situacao, dataPagamento, valorPago } }
    const evento   = body?.evento
    const cobranca = body?.cobranca

    if (evento !== 'COBRANCA_LIQUIDADA' || !cobranca?.nossoNumero) {
      return NextResponse.json({ ok: true }) // ignora outros eventos
    }

    const lancamento = await prisma.lancamento.findFirst({
      where: { interCobrancaId: cobranca.nossoNumero },
    })
    if (!lancamento || lancamento.status === 'PAGO') {
      return NextResponse.json({ ok: true })
    }

    await prisma.lancamento.update({
      where: { id: lancamento.id },
      data: {
        status:        'PAGO',
        dataPagamento: cobranca.dataPagamento ? new Date(cobranca.dataPagamento) : new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Inter webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}