import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Cache da base de conhecimento (5 min)
let cachedConhecimento: string | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000

async function getConhecimento(): Promise<string> {
  if (cachedConhecimento && Date.now() - cacheTimestamp < CACHE_TTL) return cachedConhecimento
  const cfg = await prisma.$queryRawUnsafe<{ valor: string }[]>(
    "SELECT valor FROM configuracoes WHERE chave = 'assistente_conhecimento' LIMIT 1"
  )
  cachedConhecimento = cfg[0]?.valor ?? ''
  cacheTimestamp = Date.now()
  return cachedConhecimento
}

// ─── Ferramentas disponíveis para a ZOE ──────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'buscar_grupo',
    description: `Busca todas as empresas de um grupo empresarial no CertFlow.
Use quando o usuário perguntar:
- "Zoe, quais as empresas do grupo REDENILF?"
- "Quais clientes são do grupo X?"
- "Mostre os certificados do grupo Y"
- "Quais empresas do grupo [nome] vencem em breve?"
Retorna todas as empresas vinculadas ao grupo com nome, CNPJ e vencimento dos certificados.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        grupo: { type: 'string', description: 'Nome do grupo empresarial. Ex: "REDENILF"' },
      },
      required: ['grupo'],
    },
  },
  {
    name: 'buscar_empresas_responsavel',
    description: `Busca no banco de dados do CertFlow todas as empresas (Pessoa Jurídica) vinculadas a um CPF ou nome de responsável.
Use quando o usuário perguntar:
- "Quantas empresas tem o CPF X?"
- "Quais empresas são do cliente [nome]?"
- "Quais CNPJs estão no CPF X?"
- "Quando vencem os certificados das empresas de [nome/CPF]?"
Retorna lista de empresas com CNPJ, razão social, certificados e datas de vencimento.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        cpf:  { type: 'string', description: 'CPF do responsável, apenas números. Ex: "12345678901"' },
        nome: { type: 'string', description: 'Nome (ou parte) do responsável ou razão social. Ex: "João Silva"' },
      },
    },
  },
  {
    name: 'buscar_cliente',
    description: `Busca um cliente específico no sistema por CPF (PF) ou CNPJ (PJ), ou parte do nome.
Use quando precisar de informações sobre um cliente individual: certificados, dados cadastrais, etc.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        cpf:   { type: 'string', description: 'CPF do cliente PF, apenas números' },
        cnpj:  { type: 'string', description: 'CNPJ do cliente PJ, apenas números' },
        nome:  { type: 'string', description: 'Nome ou parte do nome/razão social' },
      },
    },
  },
]

// ─── Execução das ferramentas ─────────────────────────────────────────────────

function fmtData(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('pt-BR')
}
function diasRestantes(d: Date | string) {
  return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000)
}
function fmtCNPJ(s: string) {
  return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
function fmtCPF(s: string) {
  return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

async function executarFerramenta(nome: string, input: Record<string, string>): Promise<string> {
  if (nome === 'buscar_grupo') {
    const { grupo } = input
    if (!grupo?.trim()) return 'Nome do grupo não informado.'

    const clientes = await prisma.cliente.findMany({
      where: { grupo: { equals: grupo.trim(), mode: 'insensitive' } },
      include: {
        certificados: {
          select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } },
          orderBy: { dataVencimento: 'asc' },
          where: { status: 'ATIVO' },
        },
      },
      orderBy: { nome: 'asc' },
    })

    if (clientes.length === 0) {
      return `Nenhum cliente encontrado no grupo **${grupo.toUpperCase()}**. Verifique se o nome do grupo está correto.`
    }

    const linhas = clientes.map((c, i) => {
      const razao = c.razaoSocial ?? c.nome
      const cnpjFmt = c.cnpj ? fmtCNPJ(c.cnpj) : c.cpf ? fmtCPF(c.cpf) : '—'
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        const alerta = dias < 0 ? '🔴 VENCIDO' : dias <= 30 ? '🟡 Vence em breve' : '🟢'
        return `    • ${cert.modelo.nome} — vence ${fmtData(cert.dataVencimento)} ${alerta} (${dias < 0 ? Math.abs(dias) + ' dias atrás' : dias + ' dias restantes'})`
      }).join('\n') || '    • Sem certificados ativos'

      return `${i + 1}. **${razao}**\n   Documento: ${cnpjFmt}\n   Certificados:\n${certs}\n   🔗 /clientes/${c.id}`
    }).join('\n\n')

    return `Grupo **${grupo.toUpperCase()}** — ${clientes.length} empresa${clientes.length > 1 ? 's' : ''} vinculada${clientes.length > 1 ? 's' : ''}:\n\n${linhas}`
  }

  if (nome === 'buscar_empresas_responsavel') {
    const { cpf, nome: nomeBusca } = input
    let clientes: { id: string; razaoSocial: string | null; cnpj: string | null; responsavel: string | null; cpf: string | null; certificados: { dataVencimento: Date; status: string; modelo: { nome: string } }[] }[] = []

    if (cpf) {
      const nums = cpf.replace(/\D/g, '')
      clientes = await prisma.cliente.findMany({
        where: { tipoPessoa: 'PJ', cpf: nums },
        include: {
          certificados: {
            select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } },
            orderBy: { dataVencimento: 'asc' },
          },
        },
      })
    } else if (nomeBusca) {
      clientes = await prisma.cliente.findMany({
        where: {
          tipoPessoa: 'PJ',
          OR: [
            { responsavel: { contains: nomeBusca, mode: 'insensitive' } },
            { razaoSocial:  { contains: nomeBusca, mode: 'insensitive' } },
            { nome:         { contains: nomeBusca, mode: 'insensitive' } },
          ],
        },
        include: {
          certificados: {
            select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } },
            orderBy: { dataVencimento: 'asc' },
          },
        },
      })
    }

    if (clientes.length === 0) {
      return `Nenhuma empresa encontrada para ${cpf ? `CPF ${fmtCPF(cpf.replace(/\D/g,''))}` : `"${nomeBusca}"`} no sistema.`
    }

    const linhas = clientes.map((c, i) => {
      const razao = (c as { razaoSocial?: string | null }).razaoSocial || c.responsavel || '—'
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        const alerta = dias < 0 ? '🔴 VENCIDO' : dias <= 30 ? '🟡 Vence em breve' : '🟢'
        return `    • ${cert.modelo.nome} — vence ${fmtData(cert.dataVencimento)} ${alerta} (${dias < 0 ? Math.abs(dias) + ' dias atrás' : dias + ' dias restantes'})`
      }).join('\n') || '    • Sem certificados emitidos'

      const cnpjFmt = c.cnpj ? fmtCNPJ(c.cnpj) : 'CNPJ não informado'
      return `${i + 1}. ${razao}\n   CNPJ: ${cnpjFmt}\n   Responsável: ${c.responsavel || '—'}\n   Certificados:\n${certs}\n   🔗 Ver cadastro: /clientes/${c.id}`
    }).join('\n\n')

    return `Encontrei **${clientes.length} empresa${clientes.length > 1 ? 's' : ''}** vinculada${clientes.length > 1 ? 's' : ''} a ${cpf ? `CPF ${fmtCPF(cpf.replace(/\D/g,''))}` : `"${nomeBusca}"`}:\n\n${linhas}`
  }

  if (nome === 'buscar_cliente') {
    const { cpf, cnpj, nome: nomeBusca } = input
    let clientes: { id: string; nome: string; razaoSocial: string | null; cnpj: string | null; cpf: string | null; tipoPessoa: string; email: string | null; celular: string | null; certificados: { dataVencimento: Date; status: string; modelo: { nome: string } }[] }[] = []

    const cpfNums  = cpf?.replace(/\D/g,'')
    const cnpjNums = cnpj?.replace(/\D/g,'')

    const orClauses = [
      cpfNums   ? { cpf:        cpfNums }                                              : null,
      cnpjNums  ? { cnpj:       cnpjNums }                                             : null,
      nomeBusca ? { nome:       { contains: nomeBusca, mode: 'insensitive' as const } } : null,
      nomeBusca ? { razaoSocial:{ contains: nomeBusca, mode: 'insensitive' as const } } : null,
    ].filter(Boolean) as { cpf?: string; cnpj?: string; nome?: { contains: string; mode: 'insensitive' }; razaoSocial?: { contains: string; mode: 'insensitive' } }[]

    clientes = await prisma.cliente.findMany({
      where: { OR: orClauses },
      include: {
        certificados: {
          select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } },
          orderBy: { dataVencimento: 'asc' },
        },
      },
      take: 5,
    })

    if (clientes.length === 0) return 'Nenhum cliente encontrado com esses dados no sistema.'

    return clientes.map(c => {
      const doc = c.cnpj ? `CNPJ: ${fmtCNPJ(c.cnpj)}` : c.cpf ? `CPF: ${fmtCPF(c.cpf)}` : ''
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        return `  • ${cert.modelo.nome} — ${fmtData(cert.dataVencimento)} ${dias < 0 ? '🔴 VENCIDO' : dias <= 30 ? '🟡' : '🟢'}`
      }).join('\n') || '  • Sem certificados'
      return `**${c.razaoSocial || c.nome}**\n${doc}\n${c.email ? `E-mail: ${c.email}` : ''}\nCertificados:\n${certs}\n🔗 /clientes/${c.id}`
    }).join('\n\n---\n\n')
  }

  return 'Ferramenta não reconhecida.'
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ erro: 'Mensagens inválidas' }, { status: 422 })
  }

  const conhecimento = await getConhecimento()

  const systemText = `Você é a ZOE, assistente virtual da V&G Certificado Digital — guia de apoio para os Agentes de Registro.
Seu nome é ZOE. Quando perguntarem quem você é, diga que é a ZOE da V&G.

${conhecimento ? `## Base de Conhecimento da Empresa\n\n${conhecimento}` : ''}

## Diretrizes
- Responda sempre em português do Brasil
- Seja objetiva, prática e direta
- Para perguntas sobre empresas de um CPF ou nome específico, USE A FERRAMENTA buscar_empresas_responsavel
- Para buscar dados de um cliente específico, USE A FERRAMENTA buscar_cliente
- Quando mostrar resultados do banco, inclua sempre os links /clientes/[id] para o usuário acessar diretamente
- Se não tiver a informação, diga claramente`

  // ── Loop de tool use ──────────────────────────────────────────────────────
  let mensagensAtual: Anthropic.Messages.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })
  )

  let textoFinal = ''
  let iteracoes = 0
  const MAX_ITER = 5

  while (iteracoes < MAX_ITER) {
    iteracoes++

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
      tools:   TOOLS,
      messages: mensagensAtual,
    })

    if (response.stop_reason === 'end_turn') {
      textoFinal = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as Anthropic.Messages.TextBlock).text)
        .join('\n')
      break
    }

    if (response.stop_reason === 'tool_use') {
      // Executa todas as ferramentas chamadas
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const bloco of response.content) {
        if (bloco.type === 'tool_use') {
          const resultado = await executarFerramenta(
            bloco.name,
            bloco.input as Record<string, string>
          )
          toolResults.push({
            type:        'tool_result',
            tool_use_id: bloco.id,
            content:     resultado,
          })
        }
      }

      mensagensAtual = [
        ...mensagensAtual,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ]
      continue
    }

    break
  }

  if (!textoFinal) textoFinal = 'Desculpe, não consegui processar sua pergunta. Tente novamente.'

  // Retorna streaming simulado para compatibilidade com o cliente
  const readable = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      // Envia em chunks para manter o efeito de digitação
      const chunks = textoFinal.match(/[\s\S]{1,8}/g) ?? [textoFinal]
      let i = 0
      function enviar() {
        if (i < chunks.length) {
          controller.enqueue(encoder.encode(chunks[i++]))
          setTimeout(enviar, 10)
        } else {
          controller.close()
        }
      }
      enviar()
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}