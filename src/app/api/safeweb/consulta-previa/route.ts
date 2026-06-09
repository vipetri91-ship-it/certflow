export const preferredRegion = 'gru1'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { realizarConsultaPrevia } from '@/lib/safeweb'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const documento = String(body.documento ?? '').replace(/\D/g, '')
  const documentoTipo = body.documentoTipo === '2' ? '2' : '1'
  const dtNascimento = String(body.dtNascimento ?? '')
  const cpfResponsavel = body.cpfResponsavel ? String(body.cpfResponsavel).replace(/\D/g, '') : undefined

  const tamanhoEsperado = documentoTipo === '1' ? 11 : 14
  if (documento.length !== tamanhoEsperado) {
    return NextResponse.json({ erro: documentoTipo === '1' ? 'CPF inválido' : 'CNPJ inválido' }, { status: 400 })
  }
  if (!dtNascimento) {
    return NextResponse.json({ erro: 'Data de nascimento obrigatória para a consulta prévia' }, { status: 400 })
  }
  if (documentoTipo === '2' && (!cpfResponsavel || cpfResponsavel.length !== 11)) {
    return NextResponse.json({ erro: 'CPF do responsável obrigatório para a consulta prévia de CNPJ' }, { status: 400 })
  }

  const resultado = await realizarConsultaPrevia({
    documento,
    documentoTipo,
    dtNascimento,
    cpfResponsavel,
  })

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro ?? 'Erro ao consultar a Safeweb' }, { status: 502 })
  }

  return NextResponse.json({
    liberado: resultado.codigo === 0,
    codigo:   resultado.codigo,
    mensagem: resultado.mensagem,
    nome:     resultado.nome || null,
  })
}
