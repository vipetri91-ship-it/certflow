import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
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

  // Para PJ: cpf field fica null (responsável pode ser de várias empresas — não é único)
  // CPF do responsável vai para observações
  const cpf  = tipoPessoa === 'PF' ? docBruto : null
  const cnpj = tipoPessoa === 'PJ' ? docBruto : null

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
    observacoes:    [
      cpfResp ? `CPF Responsável: ${cpfResp}` : '',
      montarObs(row) ?? '',
    ].filter(Boolean).join(' | ') || null,
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

  // 1a. Contar quantas vezes cada CPF Responsável aparece em PJs (para grupos)
  const contagemCpfResp = new Map<string, string>() // cpf → nomeResponsavel
  const cpfRespCount    = new Map<string, number>()
  for (const row of rows) {
    const tipo    = String(row['Tipo Pessoa'] ?? '').includes('Jurídica') ? 'PJ' : 'PF'
    const cpfResp = limparDoc(row['CPF Responsável'])
    if (tipo === 'PJ' && cpfResp) {
      cpfRespCount.set(cpfResp, (cpfRespCount.get(cpfResp) ?? 0) + 1)
      if (!contagemCpfResp.has(cpfResp)) {
        contagemCpfResp.set(cpfResp, String(row['Nome Responsável'] ?? '').trim())
      }
    }
  }
  // CPFs que aparecem em 2+ empresas → viram grupos
  const gruposPorCpf = new Map<string, string>()
  for (const [cpf, count] of cpfRespCount) {
    if (count >= 2) gruposPorCpf.set(cpf, contagemCpfResp.get(cpf) ?? cpf)
  }

  const candidatos: ClienteData[] = []

  for (const row of rows) {
    try {
      const d = parsarLinha(row)
      if (!d) { erros.push(`Linha sem CPF/CNPJ válido: ${row['Razão Social'] ?? ''}`); continue }

      // Atribui grupo para PJ cujo responsável aparece em 2+ empresas
      if (d.tipoPessoa === 'PJ') {
        const cpfResp = limparDoc(row['CPF Responsável'])
        if (cpfResp && gruposPorCpf.has(cpfResp)) {
          d.grupo = gruposPorCpf.get(cpfResp)
        }
      }

      candidatos.push(d)
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

  const totalGrupos = gruposPorCpf.size

  // 4. Modo simulação — não salva nada, só retorna o que aconteceria
  const simulacao = formData.get('simulacao') === 'true'
  if (simulacao) {
    return NextResponse.json({
      total, simulacao: true,
      importados: novos.length,
      pulados,
      totalGrupos,
      grupos: [...gruposPorCpf.values()].sort().slice(0, 20),
      erros,
      amostra: novos.slice(0, 5).map(c => ({
        nome: c.nome, tipoPessoa: c.tipoPessoa, grupo: c.grupo,
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

  // Importação em massa de PII não deixava nenhum rastro de auditoria — um
  // registro só (não um por cliente, seriam centenas) com a contagem, nunca
  // o dado pessoal em si (achado 17/07/2026, auditoria de segurança).
  if (importados > 0) {
    await registrarAuditoria({
      usuarioId: session.user.id,
      acao: 'CREATE',
      entidade: 'Cliente',
      dados: { origem: 'importacao-planilha', importados, pulados, totalLinhas: total },
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    })
  }

  return NextResponse.json({ total, importados, pulados, totalGrupos, erros })
}