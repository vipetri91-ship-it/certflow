import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import * as XLSX from 'xlsx'

interface RegistroController {
  protocolo: string
  data: string
  nome: string
  modelo: string
  valor: string
  agr: string
}

interface RegistroVG {
  protocolo: string
  cliente: string
  produto: string
  data: string
  valor: string
  agr: string
}

function parseControllerHtml(buffer: Buffer): RegistroController[] {
  const html = buffer.toString('utf-8')
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const tagRegex = /<[^>]+>/g
  const rows: RegistroController[] = []
  let isFirst = true
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1]
    const cells: string[] = []
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch: RegExpExecArray | null

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      let text = cellMatch[1].replace(tagRegex, ' ').trim()
      text = text
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
      cells.push(text)
    }

    if (cells.length < 4) continue
    if (isFirst) { isFirst = false; continue }

    const protoMatch = cells[3].match(/^(\d+)/)
    if (!protoMatch) continue

    rows.push({
      protocolo: protoMatch[1],
      data:      cells[0],
      nome:      cells[1].replace(/CPF\/CNPJ:[\s\S]*/, '').replace(/Parceiro:[\s\S]*/, '').trim(),
      modelo:    cells[2],
      valor:     cells[4] ?? '',
      agr:       cells[6] ?? '',
    })
  }

  return rows
}

function parseVGXlsx(buffer: Buffer): RegistroVG[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets['Pedidos']
  if (!sheet) throw new Error('Aba "Pedidos" não encontrada. Verifique se este é o arquivo correto da V&G.')

  const data = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })

  return (data as (string | number)[][])
    .slice(1)
    .filter(row => row && String(row[20] ?? '').trim() !== '')
    .map(row => ({
      protocolo: String(row[20] ?? '').trim(),
      cliente:   String(row[5]  ?? '').trim(),
      produto:   String(row[6]  ?? '').trim(),
      data:      String(row[16] ?? '').trim(),
      valor:     String(row[8]  ?? '').trim(),
      agr:       String(row[17] ?? '').trim(),
    }))
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'financeiro:read'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const formData = await request.formData()
    const controllerFile = formData.get('controllerFile') as File | null
    const vgFile = formData.get('vgFile') as File | null

    if (!controllerFile || !vgFile)
      return NextResponse.json({ error: 'Envie os dois arquivos' }, { status: 400 })

    const controllerBuffer = Buffer.from(await controllerFile.arrayBuffer())
    const vgBuffer = Buffer.from(await vgFile.arrayBuffer())

    const controllerRegistros = parseControllerHtml(controllerBuffer)
    const vgRegistros = parseVGXlsx(vgBuffer)

    if (controllerRegistros.length === 0)
      return NextResponse.json({ error: 'Nenhum registro encontrado no arquivo do Controller. Verifique se o arquivo é o relatório de Produção Detalhada.' }, { status: 400 })

    const controllerMap = new Map(controllerRegistros.map(r => [r.protocolo, r]))
    const vgMap         = new Map(vgRegistros.map(r => [r.protocolo, r]))

    return NextResponse.json({
      controller:      { total: controllerRegistros.length },
      vg:              { total: vgRegistros.length },
      naoNaVG:         controllerRegistros.filter(r => !vgMap.has(r.protocolo)),
      naoNoController: vgRegistros.filter(r => !controllerMap.has(r.protocolo)),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar os arquivos' },
      { status: 500 }
    )
  }
}
