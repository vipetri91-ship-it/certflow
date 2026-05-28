import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CHAVE = 'empresa'

export interface DadosEmpresa {
  nomeFantasia:  string
  razaoSocial:   string
  cnpj:          string
  telefone:      string
  celular:       string
  email:         string
  website:       string
  cep:           string
  logradouro:    string
  numero:        string
  complemento:   string
  bairro:        string
  cidade:        string
  estado:        string
  logoUrl:       string
}

export const EMPRESA_PADRAO: DadosEmpresa = {
  nomeFantasia: 'V&G Certificação Digital',
  razaoSocial:  'VASP SERVIÇOS E NEGOCIOS LTDA',
  cnpj:         '48.948.496/0001-56',
  telefone:     '(11) 93332-3003',
  celular:      '(11) 94315-6015',
  email:        'contato@vegcertificado.com.br',
  website:      'www.vegcertificado.com.br',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
  cidade: 'Piracaia', estado: 'SP',
  logoUrl: '',
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const cfg = await prisma.$queryRawUnsafe<{ valor: string }[]>(
    `SELECT valor FROM configuracoes WHERE chave = $1 LIMIT 1`, CHAVE
  )

  const dados: DadosEmpresa = cfg[0]?.valor
    ? { ...EMPRESA_PADRAO, ...JSON.parse(cfg[0].valor) }
    : EMPRESA_PADRAO

  return NextResponse.json({ dados })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { dados } = await req.json()
  if (!dados) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })

  await prisma.$queryRawUnsafe(
    `INSERT INTO configuracoes (id, chave, valor)
     VALUES (gen_random_uuid()::text, $1, $2)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    CHAVE, JSON.stringify(dados)
  )

  return NextResponse.json({ ok: true })
}
