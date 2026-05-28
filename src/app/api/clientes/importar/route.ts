import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function limparDoc(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

function limparTelefone(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

function parsarData(v: unknown): Date | null {
  if (!v) return null
  const s = String(v).trim()
  // DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  // Número serial do Excel
  const n = Number(v)
  if (!isNaN(n) && n > 1000) {
    const d = new Date(Math.round((n - 25569) * 86400 * 1000))
    return d
  }
  return null
}

function montarObs(row: Record<string, unknown>): string {
  const partes: string[] = []
  if (row['IE'])    partes.push(`IE: ${row['IE']}`)
  if (row['IM'])    partes.push(`IM: ${row['IM']}`)
  if (row['CEI'])   partes.push(`CEI: ${row['CEI']}`)
  if (row['CAEPF']) partes.push(`CAEPF: ${row['CAEPF']}`)
  if (row['Obs'])   partes.push(String(row['Obs']))
  return partes.join(' | ')
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('arquivo') as File | null
  if (!file) return NextResponse.json({ erro: 'Arquivo não enviado' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  let importados = 0
  let pulados    = 0
  const erros: string[] = []

  for (const row of rows) {
    try {
      const tipoPessoa = String(row['Tipo Pessoa'] ?? '').includes('Jurídica') ? 'PJ' : 'PF'
      const docBruto   = limparDoc(row['CPF / CNPJ'])
      const cpfResp    = limparDoc(row['CPF Responsável'])
      const pis        = limparDoc(row['PIS'])

      const cpf  = tipoPessoa === 'PF' ? (docBruto || null) : (cpfResp || null)
      const cnpj = tipoPessoa === 'PJ' ? (docBruto || null) : null

      // Pula se já existe
      if (cpf) {
        const existe = await prisma.cliente.findUnique({ where: { cpf } })
        if (existe) { pulados++; continue }
      }
      if (cnpj) {
        const existe = await prisma.cliente.findUnique({ where: { cnpj } })
        if (existe) { pulados++; continue }
      }

      const razaoSocial  = String(row['Razão Social'] ?? '').trim() || null
      const nomeFantasia = String(row['Fantasia']     ?? '').trim() || null
      const responsavel  = String(row['Nome Responsável'] ?? '').trim() || null
      const nome         = tipoPessoa === 'PJ'
        ? (razaoSocial ?? responsavel ?? 'Sem nome')
        : (razaoSocial ?? 'Sem nome')

      const tel1 = limparTelefone(row['Telefone1'])
      const tel2 = limparTelefone(row['Telefone2'])
      const email1 = String(row['Email1'] ?? '').trim().toLowerCase() || null

      const obs = montarObs(row)

      await prisma.cliente.create({
        data: {
          tipoPessoa,
          nome,
          razaoSocial,
          nomeFantasia,
          responsavel,
          cpf:           cpf  || undefined,
          cnpj:          cnpj || undefined,
          email:         email1,
          telefone:      tel1 || null,
          celular:       tel2 || null,
          dataNascimento: parsarData(row['Data Nascimento']),
          pisNis:        pis || null,
          cep:           String(row['Cep']          ?? '').replace(/\D/g, '') || null,
          logradouro:    String(row['Logradouro']   ?? '').trim() || null,
          numero:        String(row['Numero']       ?? '').trim() || null,
          complemento:   String(row['Complemento']  ?? '').trim() || null,
          bairro:        String(row['Bairro']       ?? '').trim() || null,
          cidade:        String(row['Município']    ?? '').trim() || null,
          estado:        String(row['UF']           ?? '').trim() || null,
          observacoes:   obs || null,
        },
      })
      importados++
    } catch (err) {
      const nome = String(row['Razão Social'] ?? row['Nome Responsável'] ?? '?')
      erros.push(`${nome}: ${String(err).slice(0, 120)}`)
    }
  }

  return NextResponse.json({ total: rows.length, importados, pulados, erros })
}