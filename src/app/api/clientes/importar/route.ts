import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const maxDuration = 60 // segundos — necessário para arquivos grandes

// ── Helpers ───────────────────────────────────────────────────────────────────

function limparDoc(v: unknown): string | null {
  const s = String(v ?? '').replace(/\D/g, '')
  return s.length >= 11 ? s : null
}

function limparTel(v: unknown): string | null {
  const s = String(v ?? '').replace(/\D/g, '')
  return s.length >= 8 ? s : null
}

function parsarData(v: unknown): Date | null {
  if (!v) return null
  const s = String(v).trim()
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  const n = Number(v)
  if (!isNaN(n) && n > 10000) return new Date(Math.round((n - 25569) * 86400 * 1000))
  return null
}

function montarObs(row: Record<string, unknown>): string | null {
  const partes: string[] = []
  if (row['IE'])    partes.push(`IE: ${row['IE']}`)
  if (row['IM'])    partes.push(`IM: ${row['IM']}`)
  if (row['CEI'])   partes.push(`CEI: ${row['CEI']}`)
  if (row['CAEPF']) partes.push(`CAEPF: ${row['CAEPF']}`)
  if (row['Obs'])   partes.push(String(row['Obs']))
  return partes.length ? partes.join(' | ') : null
}

type ClienteData = Parameters<typeof prisma.cliente.create>[0]['data']

function parsarLinha(row: Record<string, unknown>): ClienteData | null {
  const tipoPessoa = String(row['Tipo Pessoa'] ?? '').includes('Jurídica') ? 'PJ' as const : 'PF' as const
  const docBruto   = limparDoc(row['CPF / CNPJ'])
  const cpfResp    = limparDoc(row['CPF Responsável'])

  const cpf  = tipoPessoa === 'PF' ? docBruto  : cpfResp
  const cnpj = tipoPessoa === 'PJ' ? docBruto  : null

  // Sem documento válido: descarta
  if (!cpf && !cnpj) return null

  const razaoSocial  = String(row['Razão Social']     ?? '').trim() || null
  const nomeFantasia = String(row['Fantasia']          ?? '').trim() || null
  const responsavel  = String(row['Nome Responsável']  ?? '').trim() || null
  const nome         = tipoPessoa === 'PJ'
    ? (razaoSocial ?? responsavel ?? 'Sem nome')
    : (razaoSocial ?? 'Sem nome')

  const email1 = String(row['Email1'] ?? '').trim().toLowerCase()
  const pis    = String(row['PIS']    ?? '').replace(/\D/g, '') || null

  return {
    tipoPessoa,
    nome,
    razaoSocial,
    nomeFantasia,
    responsavel,
    cpf:            cpf  ?? undefined,
    cnpj:           cnpj ?? undefined,
    email:          email1 || null,
    telefone:       limparTel(row['Telefone1']),
    celular:        limparTel(row['Telefone2']),
    dataNascimento: parsarData(row['Data Nascimento']),
    pisNis:         pis,
    cep:            String(row['Cep']         ?? '').replace(/\D/g, '') || null,
    logradouro:     String(row['Logradouro']  ?? '').trim() || null,
    numero:         String(row['Numero']      ?? '').trim() || null,
    complemento:    String(row['Complemento'] ?? '').trim() || null,
    bairro:         String(row['Bairro']      ?? '').trim() || null,
    cidade:         String(row['Município']   ?? '').trim() || null,
    estado:         String(row['UF']          ?? '').trim() || null,
    observacoes:    montarObs(row),
  }
}

// ── Endpoint ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('arquivo') as File | null
  if (!file) return NextResponse.json({ erro: 'Arquivo não enviado' }, { status: 400 })

  // 1. Ler e parsear xlsx
  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  const total = rows.length
  const erros: string[] = []
  const candidatos: ClienteData[] = []

  for (const row of rows) {
    try {
      const d = parsarLinha(row)
      if (d) candidatos.push(d)
      else erros.push(`Linha sem CPF/CNPJ válido: ${row['Razão Social'] ?? ''}`)
    } catch (err) {
      erros.push(`${row['Razão Social'] ?? '?'}: ${String(err).slice(0, 100)}`)
    }
  }

  // 2. Busca em massa de duplicatas — 2 queries no total
  const cpfsNovos  = candidatos.map(c => c.cpf  as string).filter(Boolean)
  const cnpjsNovos = candidatos.map(c => c.cnpj as string).filter(Boolean)

  const [existCpfs, existCnpjs] = await Promise.all([
    cpfsNovos.length  ? prisma.cliente.findMany({ where: { cpf:  { in: cpfsNovos  } }, select: { cpf:  true } }) : [],
    cnpjsNovos.length ? prisma.cliente.findMany({ where: { cnpj: { in: cnpjsNovos } }, select: { cnpj: true } }) : [],
  ])

  const setCpfs  = new Set(existCpfs.map(c => c.cpf!))
  const setCnpjs = new Set(existCnpjs.map(c => c.cnpj!))

  // 3. Filtrar duplicatas e deduplicar dentro da própria planilha
  const cpfsVistos  = new Set<string>()
  const cnpjsVistos = new Set<string>()
  const novos: ClienteData[] = []
  let pulados = 0

  for (const c of candidatos) {
    const cpf  = c.cpf  as string | undefined
    const cnpj = c.cnpj as string | undefined

    if (cpf  && (setCpfs.has(cpf)   || cpfsVistos.has(cpf)))   { pulados++; continue }
    if (cnpj && (setCnpjs.has(cnpj) || cnpjsVistos.has(cnpj))) { pulados++; continue }

    if (cpf)  cpfsVistos.add(cpf)
    if (cnpj) cnpjsVistos.add(cnpj)
    novos.push(c)
  }

  // 4. Modo simulação — não salva nada, só retorna o que aconteceria
  const simulacao = formData.get('simulacao') === 'true'
  if (simulacao) {
    return NextResponse.json({
      total, simulacao: true,
      importados: novos.length,
      pulados,
      erros,
      amostra: novos.slice(0, 5).map(c => ({
        nome: c.nome, tipoPessoa: c.tipoPessoa,
        cpf: c.cpf, cnpj: c.cnpj, email: c.email, cidade: c.cidade,
      })),
    })
  }

  // 5. Inserção em lote — chunks de 500 para não estourar parâmetros do Postgres
  const CHUNK = 500
  let importados = 0

  for (let i = 0; i < novos.length; i += CHUNK) {
    const chunk = novos.slice(i, i + CHUNK)
    const result = await prisma.cliente.createMany({ data: chunk, skipDuplicates: true })
    importados += result.count
  }

  return NextResponse.json({ total, importados, pulados, erros })
}