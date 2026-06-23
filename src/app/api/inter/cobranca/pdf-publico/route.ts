import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { baixarPdfCobranca } from '@/lib/inter'
import { validarTokenPublico } from '@/lib/token-publico'

// Rota pública (sem login) para o cliente final abrir o PDF do boleto a
// partir de um link enviado por WhatsApp/e-mail. Acesso liberado apenas com
// o token assinado correto — não dá para adivinhar/enumerar lancamentoId.
export async function GET(req: NextRequest) {
  const lancamentoId = req.nextUrl.searchParams.get('lancamentoId')
  const token = req.nextUrl.searchParams.get('token')
  if (!lancamentoId || !token) return NextResponse.json({ erro: 'Parâmetros inválidos' }, { status: 422 })
  if (!validarTokenPublico(lancamentoId, token)) {
    return NextResponse.json({ erro: 'Link inválido' }, { status: 403 })
  }

  const lancamento = await prisma.lancamento.findUnique({ where: { id: lancamentoId } })
  if (!lancamento?.interCodigoSolicitacao) {
    return NextResponse.json({ erro: 'Cobrança não encontrada' }, { status: 404 })
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
