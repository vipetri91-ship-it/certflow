import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { realizarConsultaPrevia } from '@/lib/safeweb'

// Converte DD/MM/AAAA (formato do formulário) pra AAAA-MM-DD (formato exigido pela Safeweb)
function paraIso(data: string): string {
  const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : data
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado', permitido: false }, { status: 401 })

  const { cnpj, cpf, dataNascimento } = await req.json().catch(() => ({}))
  const cnpjNum = String(cnpj ?? '').replace(/\D/g, '')
  const cpfNum  = String(cpf ?? '').replace(/\D/g, '')

  if (cnpjNum.length !== 14) return NextResponse.json({ erro: 'CNPJ inválido', permitido: false }, { status: 422 })
  if (cpfNum.length !== 11)  return NextResponse.json({ erro: 'CPF inválido', permitido: false }, { status: 422 })
  if (!dataNascimento)       return NextResponse.json({ erro: 'Data de nascimento obrigatória', permitido: false }, { status: 422 })

  // Checagem oficial da Safeweb (Consulta Prévia) — mesma fonte usada no
  // wizard de Nova Venda. Única autoridade: não há mais reforço local via
  // QSA da Receita Federal (BrasilAPI/cnpj.ws), que dava falso negativo com
  // QSA desatualizado ou vazio (Empresário Individual/MEI) — ver changelog
  // de 17/07/2026.
  const resultado = await realizarConsultaPrevia({
    documento: cnpjNum,
    documentoTipo: '2',
    dtNascimento: paraIso(dataNascimento),
    cpfResponsavel: cpfNum,
  })

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro ?? 'Erro ao consultar a Safeweb', permitido: false }, { status: 502 })
  }

  const liberado = resultado.codigo === 0
  return NextResponse.json({
    nome:      resultado.nome || undefined,
    permitido: liberado,
    erro:      liberado ? undefined : `Código ${resultado.codigo} - ${resultado.mensagem}`,
  })
}