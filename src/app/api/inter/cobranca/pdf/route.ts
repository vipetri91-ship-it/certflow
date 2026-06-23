import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { baixarPdfCobranca } from '@/lib/inter'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const lancamentoId = req.nextUrl.searchParams.get('lancamentoId')
  if (!lancamentoId) return NextResponse.json({ erro: 'lancamentoId obrigatório' }, { status: 422 })

  const lancamento = await prisma.lancamento.findUnique({ where: { id: lancamentoId } })
  if (!lancamento) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
  if (!lancamento.interCodigoSolicitacao) {
    return NextResponse.json({ erro: 'Este lançamento não tem cobrança Inter gerada' }, { status: 422 })
  }

  try {
    const pdfBase64 = await baixarPdfCobranca(lancamento.interCodigoSolicitacao)
    const buffer = Buffer.from(pdfBase64, 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="boleto-${lancamento.referencia ?? lancamentoId}.pdf"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao baixar PDF'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
