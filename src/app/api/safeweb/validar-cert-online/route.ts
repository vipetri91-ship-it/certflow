export const preferredRegion = 'gru1'
export const maxDuration = 20

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buscarProduto, validarCertificadoOnline } from '@/lib/safeweb'

// GET /api/safeweb/validar-cert-online?serie=XXX&modeloId=YYY
// Valida o cert A3 PF pelo número de série e retorna os dados pré-preenchidos
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const serie    = req.nextUrl.searchParams.get('serie')
  const modeloId = req.nextUrl.searchParams.get('modeloId')

  if (!serie || !modeloId) {
    return NextResponse.json({ erro: 'Parâmetros serie e modeloId são obrigatórios' }, { status: 400 })
  }

  const modelo = await prisma.modeloCertificado.findUnique({
    where: { id: modeloId },
    select: { tipoPessoa: true, tipoCertificado: true, validadeMeses: true },
  })
  if (!modelo) return NextResponse.json({ erro: 'Modelo não encontrado' }, { status: 404 })

  const prod = await buscarProduto({
    tipoPessoa:      modelo.tipoPessoa as 'PF' | 'PJ',
    tipoCertificado: modelo.tipoCertificado as 'A1' | 'A3',
    validadeMeses:   modelo.validadeMeses,
    idTipoEmissao:   5,
  })
  if (!prod.ok || !prod.idProduto) {
    return NextResponse.json({ erro: prod.erro ?? 'Produto não encontrado para emissão online' }, { status: 422 })
  }

  const validacao = await validarCertificadoOnline(serie, String(prod.idProduto))
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.erro ?? 'Certificado inválido' }, { status: 422 })
  }

  return NextResponse.json({ ok: true, dados: validacao.dados, protocolo: validacao.protocolo, idProduto: prod.idProduto })
}
