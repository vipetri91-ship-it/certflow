import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PdfMeta { nome: string; data: string; chars: number }

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ erro: 'Nenhum arquivo enviado' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ erro: 'Apenas arquivos PDF são aceitos' }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ erro: 'PDF muito grande (máx. 20MB)' }, { status: 400 })
  }

  try {
    // Converte o PDF para base64
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Envia o PDF para o Claude extrair e organizar o conteúdo
    const mensagem: Anthropic.Messages.MessageParam = {
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: `Extraia TODO o conteúdo importante deste PDF e organize em formato Markdown limpo.

Regras:
- Mantenha TODAS as informações: processos, procedimentos, regras, dados, tabelas
- Use ## para seções principais e ### para subseções
- Use listas com - para itens
- Remova apenas cabeçalhos/rodapés/numeração de páginas repetitivos
- Corrija erros óbvios de OCR se houver
- Responda APENAS com o conteúdo extraído, sem introdução ou comentários`,
        },
      ],
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [mensagem],
    })

    const texto = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()

    if (!texto || texto.length < 50) {
      return NextResponse.json({ erro: 'Não foi possível extrair conteúdo do PDF' }, { status: 422 })
    }

    const nomeArquivo = file.name.replace(/\.pdf$/i, '')
    const conteudoFormatado = `\n\n---\n## ${nomeArquivo}\n\n${texto}`

    // Salva metadado do PDF na lista de histórico
    const listaCfg = await prisma.configuracao.findUnique({ where: { chave: 'assistente_pdfs' } })
    const lista: PdfMeta[] = listaCfg ? JSON.parse(listaCfg.valor) : []
    lista.push({ nome: file.name, data: new Date().toISOString(), chars: texto.length })
    await prisma.configuracao.upsert({
      where:  { chave: 'assistente_pdfs' },
      update: { valor: JSON.stringify(lista) },
      create: { chave: 'assistente_pdfs', valor: JSON.stringify(lista) },
    })

    return NextResponse.json({
      texto: conteudoFormatado,
      chars: texto.length,
      nomesJaAdicionados: lista.map(p => p.nome),
    })
  } catch (err) {
    console.error('[extrair-pdf]', err)
    return NextResponse.json({ erro: 'Erro ao processar o PDF. Tente novamente.' }, { status: 500 })
  }
}
