import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

// ─── Ferramentas ──────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'buscar_grupo',
    description: `Busca todas as empresas de um grupo empresarial no CertFlow.
Use quando o usuário perguntar sobre empresas de um grupo específico.
Retorna empresas com nome, CNPJ e vencimento dos certificados.`,
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
    description: `Busca todas as empresas vinculadas a um CPF ou nome de responsável.
Use para perguntas como "quantas empresas tem o CPF X?" ou "quais CNPJs estão no nome de [pessoa]?"`,
    input_schema: {
      type: 'object' as const,
      properties: {
        cpf:  { type: 'string', description: 'CPF do responsável, apenas números' },
        nome: { type: 'string', description: 'Nome (ou parte) do responsável ou razão social' },
      },
    },
  },
  {
    name: 'buscar_cliente',
    description: `Busca um cliente específico por CPF, CNPJ ou nome. Retorna dados básicos e certificados.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        cpf:  { type: 'string', description: 'CPF do cliente, apenas números' },
        cnpj: { type: 'string', description: 'CNPJ do cliente, apenas números' },
        nome: { type: 'string', description: 'Nome ou parte do nome/razão social' },
      },
    },
  },
  {
    name: 'prioridade_contatos',
    description: `Retorna a lista priorizada de clientes para contatar hoje, ordenada por urgência.
Use quando o usuário perguntar:
- "Quem devo ligar hoje?" / "Lista do dia" / "Briefing do dia"
- "Quem precisa de contato urgente?" / "Quais clientes abordar?"
Ordena: vencidos → crítico (7d) → urgente (15d) → atenção (30d).`,
    input_schema: {
      type: 'object' as const,
      properties: {
        limite: { type: 'string', description: 'Número máximo de clientes (padrão: 20)' },
      },
    },
  },
  {
    name: 'resumo_cliente',
    description: `Gera um briefing completo de um cliente para preparação de ligação ou atendimento.
Use quando o usuário disser:
- "Me dê o briefing do [nome]" / "Resumo do [nome]"
- "Prepara minha ligação para [empresa]"
- "O que sei sobre [cliente]?" / "Tudo sobre [nome]"
- "Faz um script para [cliente]" ou "Como abordar [cliente]?"
Retorna: dados completos, certificados, últimos 3 contatos, parceiro, grupo.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        nome: { type: 'string', description: 'Nome do cliente ou empresa' },
        cpf:  { type: 'string', description: 'CPF do cliente' },
        cnpj: { type: 'string', description: 'CNPJ da empresa' },
      },
    },
  },
  {
    name: 'relatorio_semana',
    description: `Gera relatório de desempenho e situação da carteira na semana atual ou mês.
Use quando o usuário perguntar:
- "Como foi essa semana?" / "Relatório da semana"
- "Quantos contatos fiz?" / "Resumo do mês"
- "Qual meu desempenho?" / "Como está a carteira?"`,
    input_schema: {
      type: 'object' as const,
      properties: {
        periodo: { type: 'string', description: '"semana" (padrão) ou "mes"' },
      },
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function diasRestantes(d: Date | string | null | undefined) {
  if (!d) return Infinity
  return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000)
}
function fmtCNPJ(s: string) {
  return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
function fmtCPF(s: string) {
  return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}
function urgenciaLabel(dias: number) {
  if (dias < 0)   return '🔴 VENCIDO'
  if (dias <= 7)  return '🟠 CRÍTICO'
  if (dias <= 15) return '🟡 URGENTE'
  if (dias <= 30) return '🟢 ATENÇÃO'
  return '🔵 OK'
}

// ─── Execução das ferramentas ─────────────────────────────────────────────────

async function executarFerramenta(nome: string, input: Record<string, string>): Promise<string> {

  // ── buscar_grupo ────────────────────────────────────────────────────────────
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

    if (clientes.length === 0)
      return `Nenhum cliente encontrado no grupo **${grupo.toUpperCase()}**. Verifique se o nome está correto.`

    const linhas = clientes.map((c, i) => {
      const razao = c.razaoSocial ?? c.nome
      const doc = c.cnpj ? fmtCNPJ(c.cnpj) : c.cpf ? fmtCPF(c.cpf) : '—'
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        return `    • ${cert.modelo.nome} — ${fmtData(cert.dataVencimento)} ${urgenciaLabel(dias)} (${dias < 0 ? Math.abs(dias) + 'd vencido' : dias + 'd restantes'})`
      }).join('\n') || '    • Sem certificados ativos'
      return `${i + 1}. **${razao}**\n   Doc: ${doc}\n${certs}\n   🔗 /clientes/${c.id}`
    }).join('\n\n')

    return `Grupo **${grupo.toUpperCase()}** — ${clientes.length} empresa(s):\n\n${linhas}`
  }

  // ── buscar_empresas_responsavel ─────────────────────────────────────────────
  if (nome === 'buscar_empresas_responsavel') {
    const { cpf, nome: nomeBusca } = input
    type ClienteResult = { id: string; razaoSocial: string | null; cnpj: string | null; responsavel: string | null; cpf: string | null; certificados: { dataVencimento: Date | null; status: string; modelo: { nome: string } }[] }
    let clientes: ClienteResult[] = []

    if (cpf) {
      const nums = cpf.replace(/\D/g, '')
      clientes = await prisma.cliente.findMany({
        where: { tipoPessoa: 'PJ', cpf: nums },
        include: { certificados: { select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } }, orderBy: { dataVencimento: 'asc' } } },
      })
    } else if (nomeBusca) {
      clientes = await prisma.cliente.findMany({
        where: {
          tipoPessoa: 'PJ',
          OR: [
            { responsavel: { contains: nomeBusca, mode: 'insensitive' } },
            { razaoSocial: { contains: nomeBusca, mode: 'insensitive' } },
            { nome:        { contains: nomeBusca, mode: 'insensitive' } },
          ],
        },
        include: { certificados: { select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } }, orderBy: { dataVencimento: 'asc' } } },
      })
    }

    if (clientes.length === 0)
      return `Nenhuma empresa encontrada para ${cpf ? `CPF ${fmtCPF(cpf.replace(/\D/g, ''))}` : `"${nomeBusca}"`}.`

    const linhas = clientes.map((c, i) => {
      const razao = c.razaoSocial || c.responsavel || '—'
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        return `    • ${cert.modelo.nome} — ${fmtData(cert.dataVencimento)} ${urgenciaLabel(dias)}`
      }).join('\n') || '    • Sem certificados'
      return `${i + 1}. ${razao}\n   CNPJ: ${c.cnpj ? fmtCNPJ(c.cnpj) : '—'}\n   Responsável: ${c.responsavel || '—'}\n${certs}\n   🔗 /clientes/${c.id}`
    }).join('\n\n')

    return `**${clientes.length} empresa(s)** para ${cpf ? `CPF ${fmtCPF(cpf.replace(/\D/g,''))}` : `"${nomeBusca}"`}:\n\n${linhas}`
  }

  // ── buscar_cliente ──────────────────────────────────────────────────────────
  if (nome === 'buscar_cliente') {
    const { cpf, cnpj, nome: nomeBusca } = input
    const cpfNums  = cpf?.replace(/\D/g, '')
    const cnpjNums = cnpj?.replace(/\D/g, '')

    const orClauses = [
      cpfNums   ? { cpf:         cpfNums }                                               : null,
      cnpjNums  ? { cnpj:        cnpjNums }                                              : null,
      nomeBusca ? { nome:        { contains: nomeBusca, mode: 'insensitive' as const } } : null,
      nomeBusca ? { razaoSocial: { contains: nomeBusca, mode: 'insensitive' as const } } : null,
    ].filter(Boolean) as object[]

    const clientes = await prisma.cliente.findMany({
      where: { OR: orClauses },
      include: { certificados: { select: { dataVencimento: true, status: true, modelo: { select: { nome: true } } }, orderBy: { dataVencimento: 'asc' } } },
      take: 5,
    })

    if (clientes.length === 0) return 'Nenhum cliente encontrado com esses dados.'

    return clientes.map(c => {
      const doc = c.cnpj ? `CNPJ: ${fmtCNPJ(c.cnpj)}` : c.cpf ? `CPF: ${fmtCPF(c.cpf)}` : ''
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        return `  • ${cert.modelo.nome} — ${fmtData(cert.dataVencimento)} ${urgenciaLabel(dias)}`
      }).join('\n') || '  • Sem certificados'
      return `**${c.razaoSocial || c.nome}**\n${doc}\n${c.email ? `E-mail: ${c.email}` : ''}\nCertificados:\n${certs}\n🔗 /clientes/${c.id}`
    }).join('\n\n---\n\n')
  }

  // ── prioridade_contatos ─────────────────────────────────────────────────────
  if (nome === 'prioridade_contatos') {
    const limite = Math.min(parseInt(input.limite ?? '20') || 20, 50)
    const em30 = new Date(Date.now() + 30 * 86_400_000)

    const certs = await prisma.certificado.findMany({
      where: { status: 'ATIVO', dataVencimento: { lte: em30 } },
      include: {
        cliente: { select: { id: true, nome: true, razaoSocial: true, celular: true, telefone: true, email: true } },
        modelo:  { select: { nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
      take: limite,
    })

    if (certs.length === 0) return '✅ Nenhum cliente com certificado vencendo nos próximos 30 dias!'

    const venc  = certs.filter(c => diasRestantes(c.dataVencimento) < 0).length
    const crit  = certs.filter(c => { const d = diasRestantes(c.dataVencimento); return d >= 0 && d <= 7 }).length
    const urg   = certs.filter(c => { const d = diasRestantes(c.dataVencimento); return d > 7  && d <= 15 }).length
    const atenc = certs.filter(c => diasRestantes(c.dataVencimento) > 15).length

    const linhas = certs.map((c, i) => {
      const dias = diasRestantes(c.dataVencimento)
      const nomeC = c.cliente.razaoSocial || c.cliente.nome
      const tel = c.cliente.celular || c.cliente.telefone || '—'
      const diasStr = dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d restantes`
      return `${i + 1}. ${urgenciaLabel(dias)} **${nomeC}**\n   📋 ${c.modelo.nome} — ${fmtData(c.dataVencimento)} (${diasStr})\n   📞 ${tel}\n   🔗 /clientes/${c.cliente.id}`
    }).join('\n\n')

    return `📋 **Lista do dia** — ${certs.length} cliente(s) para contatar\n🔴 ${venc} vencidos · 🟠 ${crit} críticos · 🟡 ${urg} urgentes · 🟢 ${atenc} atenção\n\n${linhas}`
  }

  // ── resumo_cliente ──────────────────────────────────────────────────────────
  if (nome === 'resumo_cliente') {
    const { cpf, cnpj, nome: nomeBusca } = input
    const cpfNums  = cpf?.replace(/\D/g, '')
    const cnpjNums = cnpj?.replace(/\D/g, '')

    const orClauses = [
      cpfNums   ? { cpf:         cpfNums }                                               : null,
      cnpjNums  ? { cnpj:        cnpjNums }                                              : null,
      nomeBusca ? { nome:        { contains: nomeBusca, mode: 'insensitive' as const } } : null,
      nomeBusca ? { razaoSocial: { contains: nomeBusca, mode: 'insensitive' as const } } : null,
    ].filter(Boolean) as object[]

    if (orClauses.length === 0) return 'Informe um nome, CPF ou CNPJ para buscar o cliente.'

    const cliente = await prisma.cliente.findFirst({
      where: { OR: orClauses },
      include: {
        certificados: {
          include: { modelo: { select: { nome: true } } },
          orderBy: { dataVencimento: 'desc' },
        },
        historicoContatos: {
          orderBy: { dataContato: 'desc' },
          take: 3,
        },
        parceiro: { select: { nome: true, razaoSocial: true, celular: true } },
      },
    })

    if (!cliente) return `Nenhum cliente encontrado para "${nomeBusca || cpf || cnpj}".`

    const nomeCompleto = cliente.razaoSocial || cliente.nome
    const doc = cliente.cnpj ? `CNPJ: ${fmtCNPJ(cliente.cnpj)}` : cliente.cpf ? `CPF: ${fmtCPF(cliente.cpf)}` : ''

    const certs = cliente.certificados.map(c => {
      const dias = diasRestantes(c.dataVencimento)
      const tag = c.status === 'ATIVO' ? urgenciaLabel(dias) : '⚫ INATIVO'
      return `  • ${c.modelo.nome} — ${fmtData(c.dataVencimento)} ${tag}`
    }).join('\n') || '  • Sem certificados'

    const contatos = cliente.historicoContatos.length
      ? cliente.historicoContatos.map(h =>
          `  • ${fmtData(h.dataContato)}: ${(h.observacao ?? '').substring(0, 100)}`
        ).join('\n')
      : '  • Nenhum contato registrado ainda'

    const parceiro = cliente.parceiro
      ? `${cliente.parceiro.razaoSocial || cliente.parceiro.nome} (${cliente.parceiro.celular || '—'})`
      : 'Sem parceiro vinculado'

    return `## 📋 Briefing — ${nomeCompleto}

**Dados cadastrais:**
${doc}
Tipo: ${cliente.tipoPessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
${cliente.tipoPessoa === 'PJ' ? `Responsável: ${cliente.responsavel || '—'}` : ''}
Telefone: ${cliente.celular || cliente.telefone || '—'}
E-mail: ${cliente.email || '—'}
${cliente.grupo ? `Grupo empresarial: ${cliente.grupo}` : ''}

**Certificados:**
${certs}

**Últimos contatos registrados:**
${contatos}

**Parceiro/Revendedor:** ${parceiro}
🔗 Ver cadastro completo: /clientes/${cliente.id}`
  }

  // ── relatorio_semana ────────────────────────────────────────────────────────
  if (nome === 'relatorio_semana') {
    const periodo = input.periodo ?? 'semana'
    const agora = new Date()
    const inicio = new Date(agora)

    if (periodo === 'mes') {
      inicio.setDate(1)
      inicio.setHours(0, 0, 0, 0)
    } else {
      const dow = agora.getDay()
      inicio.setDate(agora.getDate() - (dow === 0 ? 6 : dow - 1))
      inicio.setHours(0, 0, 0, 0)
    }

    const em7  = new Date(Date.now() + 7  * 86_400_000)
    const em30 = new Date(Date.now() + 30 * 86_400_000)

    const [contatos, venc7, venc30, vencidos] = await Promise.all([
      prisma.historicoContato.findMany({
        where: { dataContato: { gte: inicio } },
        include: { cliente: { select: { nome: true, razaoSocial: true } } },
        orderBy: { dataContato: 'desc' },
      }),
      prisma.certificado.count({ where: { status: 'ATIVO', dataVencimento: { gte: agora, lte: em7 } } }),
      prisma.certificado.count({ where: { status: 'ATIVO', dataVencimento: { gte: agora, lte: em30 } } }),
      prisma.certificado.count({ where: { status: 'ATIVO', dataVencimento: { lt: agora } } }),
    ])

    const emails    = contatos.filter(c => c.observacao?.toLowerCase().includes('e-mail')).length
    const whatsapps = contatos.filter(c => c.observacao?.toLowerCase().includes('whatsapp')).length
    const outros    = contatos.length - emails - whatsapps
    const tituloPeriodo = periodo === 'mes' ? 'do mês' : 'da semana'

    const ultimosContatos = contatos.slice(0, 5).map(c =>
      `  • ${fmtData(c.dataContato)} — ${c.cliente?.razaoSocial || c.cliente?.nome || '—'}: ${(c.observacao ?? '').substring(0, 70)}${(c.observacao ?? '').length > 70 ? '…' : ''}`
    ).join('\n')

    return `## 📊 Relatório ${tituloPeriodo} — ${fmtData(inicio)} a ${fmtData(agora)}

**Contatos realizados: ${contatos.length}**
  📧 E-mails enviados: ${emails}
  💬 WhatsApp: ${whatsapps}
  📝 Outros registros: ${outros}

**Situação da carteira agora:**
  🔴 Vencidos (ação imediata): ${vencidos}
  🟠 Vencem em 7 dias: ${venc7}
  🟢 Vencem em 30 dias: ${venc30}

${contatos.length > 0 ? `**Últimos contatos registrados:**\n${ultimosContatos}` : '📭 Nenhum contato registrado neste período.'}`
  }

  return 'Ferramenta não reconhecida.'
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const CONHECIMENTO_TECNICO = `
## Conhecimento Técnico — Certificação Digital ICP-Brasil

**Tipos de certificado:**
- e-CPF: para pessoa física. Assinar documentos, acessar e-CAC, eSocial, Receita Federal, portais gov.
- e-CNPJ: para pessoa jurídica. Emitir NF-e, acessar e-CAC, sistemas fiscais, Junta Comercial.
- NF-e: certificado específico para emissão de Nota Fiscal Eletrônica.
- e-Jurídico: para advogados assinarem petições nos sistemas do judiciário.

**Mídias (tipos de armazenamento):**
- A1 (software): armazenado no computador ou nuvem. Validade máxima 1 ano. Prático para uso diário, mas vinculado ao dispositivo.
- A3 (hardware): armazenado em token USB ou cartão inteligente. Validade de 1 a 3 anos. Mais seguro e portátil — funciona em qualquer computador.

**Validades disponíveis:** 12, 24 ou 36 meses (A3). A1 somente 12 meses.

**Processo de emissão/renovação (Safeweb — V&G):**
- 100% online por videoconferência
- Titular deve estar presente pessoalmente na chamada
- CPF/CNPJ deve estar regular na Receita Federal
- Documentos necessários: RG ou CNH válido, comprovante de endereço recente
- Para PJ: contrato social ou documentos da empresa

**Perguntas frequentes que você já sabe responder:**
- "Posso usar o e-CNPJ da empresa como pessoa física?" → Não, são certificados distintos para finalidades distintas.
- "O A1 é menos seguro que o A3?" → A criptografia é equivalente. A diferença é que o A1 fica no computador (risco de cópia/malware); o A3 exige o token físico para uso.
- "Posso instalar o A1 em mais de um computador?" → Sim, mediante backup/exportação do arquivo .pfx.
- "O que acontece se o certificado vencer?" → Não é possível assinar novos documentos. Documentos já assinados continuam válidos legalmente.
- "Quanto tempo antes devo renovar?" → Recomendamos 30 dias antes do vencimento para evitar interrupções.
- "O certificado vencido pode ser renovado?" → Sim. O processo é o mesmo da emissão inicial.
- "Preciso cancelar o certificado anterior?" → Não é necessário. O novo substitui automaticamente.

**Sobre a V&G Certificação Digital:**
- AR (Agente de Registro) credenciada Safeweb
- Atendimento 100% online por videoconferência
- WhatsApp: (11) 93332-3003 / (11) 94315-6015
- Site: www.vegcertificadora.com.br
- Instagram: @vegcertificadora`

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ erro: 'Mensagens inválidas' }, { status: 422 })

  const conhecimento = await getConhecimento()

  const systemText = `Você é a ZOE, assistente virtual da V&G Certificação Digital — apoio inteligente para os Agentes de Registro.
Seu nome é ZOE. Quando perguntarem quem você é, diga que é a ZOE da V&G.

${conhecimento ? `## Base de Conhecimento da Empresa\n\n${conhecimento}\n` : ''}

${CONHECIMENTO_TECNICO}

## Suas capacidades
Você pode buscar dados do sistema e responder sobre:
1. **Lista do dia** — use \`prioridade_contatos\` quando pedirem "quem ligar hoje", "briefing do dia", "lista urgente"
2. **Briefing de cliente** — use \`resumo_cliente\` quando pedirem resumo, briefing ou preparação de ligação para um cliente
3. **Script de abordagem** — use \`resumo_cliente\` para buscar os dados e depois escreva um script personalizado de WhatsApp ou ligação baseado na situação do cliente (vencido, crítico, urgente, etc.)
4. **Relatório** — use \`relatorio_semana\` para "como foi a semana", "desempenho", "quantos contatos fiz"
5. **Busca de cliente** — use \`buscar_cliente\` para informações gerais sobre um cliente
6. **Grupo empresarial** — use \`buscar_grupo\` para listar empresas de um grupo
7. **Responsável** — use \`buscar_empresas_responsavel\` para empresas por CPF/nome
8. **Dúvidas técnicas** — responda sobre A1/A3, e-CPF/e-CNPJ, validade, processo, legislação usando o conhecimento técnico acima

## Diretrizes
- Responda sempre em português do Brasil
- Seja objetiva, prática e direta — você apoia uma equipe comercial ocupada
- Para scripts de abordagem, use um tom humano e empático, nunca robótico
- Sempre inclua links /clientes/[id] nos resultados para o usuário acessar diretamente
- Se não tiver a informação, diga claramente e sugira como encontrá-la`

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
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const bloco of response.content) {
        if (bloco.type === 'tool_use') {
          const resultado = await executarFerramenta(bloco.name, bloco.input as Record<string, string>)
          toolResults.push({ type: 'tool_result', tool_use_id: bloco.id, content: resultado })
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

  const readable = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
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
