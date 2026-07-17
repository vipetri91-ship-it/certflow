import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { buscarRelatorioAgrDigital, formatarRelatorioAgrDigital } from '@/lib/relatorios/agr-digital'
import { buscarRelatorioAuditor, formatarRelatorioAuditor } from '@/lib/relatorios/auditor'
import { processarCallbackQuery } from '@/lib/financeiro/cobranca-aprovacao'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

// ── Enviar mensagem ───────────────────────────────────────────────────────────

async function enviar(chatId: number, texto: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado')
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'Markdown' }),
  })
}

// ── Ferramentas de busca ──────────────────────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'buscar_cliente',
    description: 'Busca um cliente por nome, CPF ou CNPJ e retorna seus certificados digitais com status e datas de vencimento.',
    input_schema: { type: 'object' as const, properties: {
      nome: { type: 'string', description: 'Nome ou parte do nome/razão social' },
      cpf:  { type: 'string', description: 'CPF só números' },
      cnpj: { type: 'string', description: 'CNPJ só números' },
    }},
  },
  {
    name: 'vencimentos',
    description: 'Lista certificados que vencem em breve ou já venceram. Use para perguntas como "quem vence essa semana", "certificados vencidos", "quem renovar".',
    input_schema: { type: 'object' as const, properties: {
      dias: { type: 'number', description: 'Dias à frente para verificar (padrão 30)' },
      incluirVencidos: { type: 'boolean', description: 'Incluir já vencidos (padrão true)' },
    }},
  },
  {
    name: 'resumo_financeiro',
    description: 'Retorna resumo de vendas e financeiro (contas a receber e a pagar) por período.',
    input_schema: { type: 'object' as const, properties: {
      periodo: { type: 'string', enum: ['dia', 'semana', 'mes'], description: 'Período desejado' },
    }},
  },
  {
    name: 'contas_pagar',
    description: 'Lista as contas a pagar pendentes com detalhes de valor e vencimento.',
    input_schema: { type: 'object' as const, properties: {
      limite: { type: 'number', description: 'Quantidade de contas a listar (padrão 10)' },
    }},
  },
  {
    name: 'buscar_pedido',
    description: 'Busca pedidos por número, cliente ou status.',
    input_schema: { type: 'object' as const, properties: {
      numero:  { type: 'string', description: 'Número do pedido (ex: PED-202601-12345)' },
      cliente: { type: 'string', description: 'Nome do cliente' },
      status:  { type: 'string', description: 'Status: GERADO, VERIFICADO, EMITIDO, CANCELADO' },
    }},
  },
  {
    name: 'adicionar_pendencia',
    description: 'Adiciona um item na lista de pendências/backlog de desenvolvimento do próprio CertFlow (não confundir com pedidos de clientes). Use quando o Vinicius mandar uma ideia, tarefa ou lembrete sobre o desenvolvimento do sistema — ex.: "anota aí que precisamos implementar X", "lembra de ajustar Y depois".',
    input_schema: { type: 'object' as const, properties: {
      titulo:    { type: 'string', description: 'Resumo curto da pendência' },
      descricao: { type: 'string', description: 'Detalhes adicionais, se houver (opcional)' },
    }, required: ['titulo'] },
  },
  {
    name: 'listar_pendencias',
    description: 'Lista o que está pendente, em andamento ou já concluído no desenvolvimento do CertFlow. Use para perguntas como "o que temos pendente pra implantar", "quais são os próximos passos", "em que pé está o projeto".',
    input_schema: { type: 'object' as const, properties: {
      status: { type: 'string', enum: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'TODAS'], description: 'Filtrar por status (padrão: PENDENTE + EM_ANDAMENTO)' },
    }},
  },
  {
    name: 'atualizar_status_pendencia',
    description: 'Marca uma pendência como em andamento ou concluída. Identifique pelo título mais parecido com o que o Vinicius descreveu.',
    input_schema: { type: 'object' as const, properties: {
      titulo:     { type: 'string', description: 'Trecho do título da pendência a atualizar' },
      novoStatus: { type: 'string', enum: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'] },
    }, required: ['titulo', 'novoStatus'] },
  },
  {
    name: 'relatorio_setor_agr_digital',
    description: 'Relatório do setor AGR Digital — os robôs que disparam e-mail e WhatsApp automáticos de controle de vencimento, nutrição pós-venda, aniversário, lembrete de agendamento, reativação e pesquisa NPS. Use quando o Vinicius perguntar "como está o AGR Digital", "quantos e-mails/WhatsApp foram enviados", "quantas renovações vieram do controle de vencimento".',
    input_schema: { type: 'object' as const, properties: {
      dias: { type: 'number', description: 'Quantos dias pra trás considerar (padrão 7)' },
    }},
  },
  {
    name: 'relatorio_setor_auditor',
    description: 'Relatório do setor Auditor — o robô que verifica se os outros robôs rodaram, corrige problemas sozinho e avisa quando não consegue. Use quando o Vinicius perguntar "como está o Auditor", "quantos problemas o robô achou", "o que o robô corrigiu sozinho".',
    input_schema: { type: 'object' as const, properties: {
      dias: { type: 'number', description: 'Quantos dias pra trás considerar (padrão 7)' },
    }},
  },
]

// ── Executar ferramenta ───────────────────────────────────────────────────────

function fmtValor(v: number) { return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
function fmtData(d: Date | string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function diasRestantes(d: Date | string | null | undefined) { if (!d) return Infinity; return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000) }
function statusCert(dias: number) {
  if (dias < 0)   return `🔴 VENCIDO há ${Math.abs(dias)} dias`
  if (dias <= 7)  return `🟠 Vence em ${dias} dias (URGENTE)`
  if (dias <= 30) return `🟡 Vence em ${dias} dias`
  return `✅ Vence em ${dias} dias`
}

async function executarFerramenta(nome: string, input: Record<string, unknown>): Promise<string> {

  if (nome === 'buscar_cliente') {
    const cpfNums  = String(input.cpf  ?? '').replace(/\D/g, '')
    const cnpjNums = String(input.cnpj ?? '').replace(/\D/g, '')
    const nomeBusca = input.nome as string | undefined

    const orClauses = [
      cpfNums   ? { cpf: cpfNums }   : null,
      cnpjNums  ? { cnpj: cnpjNums } : null,
      nomeBusca ? { nome:        { contains: nomeBusca, mode: 'insensitive' as const } } : null,
      nomeBusca ? { razaoSocial: { contains: nomeBusca, mode: 'insensitive' as const } } : null,
      nomeBusca ? { nomeFantasia: { contains: nomeBusca, mode: 'insensitive' as const } } : null,
    ].filter(Boolean) as object[]

    if (!orClauses.length) return 'Informe nome, CPF ou CNPJ para buscar.'

    const clientes = await prisma.cliente.findMany({
      where: { OR: orClauses, ativo: true },
      include: {
        certificados: {
          include: { modelo: { select: { nome: true } } },
          orderBy: { dataVencimento: 'asc' },
        },
        pedidos: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      take: 5,
    })

    if (!clientes.length) return 'Nenhum cliente encontrado.'

    return clientes.map(c => {
      const doc = c.cnpj ? `CNPJ: ${c.cnpj}` : c.cpf ? `CPF: ${c.cpf}` : ''
      const certs = c.certificados.length
        ? c.certificados.map(cert => {
            const dias = diasRestantes(cert.dataVencimento)
            return `  • ${cert.modelo.nome} — vence ${fmtData(cert.dataVencimento)} — ${statusCert(dias)}`
          }).join('\n')
        : '  • Sem certificados cadastrados'
      const p0 = c.pedidos[0]
      const infoPedido = p0
        ? `Último pedido: ${p0.status} — ${fmtData(p0.createdAt)}`
        : 'Sem pedidos'
      return `*${c.razaoSocial || c.nome}*\n${doc}\n${c.telefone || c.celular || ''}\n\nCertificados:\n${certs}\n${infoPedido}`
    }).join('\n\n---\n\n')
  }

  if (nome === 'vencimentos') {
    const dias = Number(input.dias ?? 30)
    const incluirVencidos = input.incluirVencidos !== false
    const hoje = new Date()
    const emN  = new Date(Date.now() + dias * 86_400_000)

    const certs = await prisma.certificado.findMany({
      where: {
        status: 'ATIVO',
        dataVencimento: incluirVencidos ? { lte: emN } : { gte: hoje, lte: emN },
      },
      include: {
        cliente: { select: { nome: true, razaoSocial: true, celular: true, telefone: true } },
        modelo:  { select: { nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
      take: 20,
    })

    if (!certs.length) return `Nenhum certificado vencendo nos próximos ${dias} dias.`

    const vencidos = certs.filter(c => diasRestantes(c.dataVencimento) < 0)
    const proximos = certs.filter(c => diasRestantes(c.dataVencimento) >= 0)

    let resposta = ''
    if (vencidos.length) {
      resposta += `*🔴 VENCIDOS (${vencidos.length}):*\n`
      resposta += vencidos.map(c => {
        const nome = c.cliente.razaoSocial || c.cliente.nome
        const dias = Math.abs(diasRestantes(c.dataVencimento))
        return `• ${nome} — ${c.modelo.nome} — venceu há ${dias} dias (${fmtData(c.dataVencimento)})`
      }).join('\n')
      resposta += '\n\n'
    }
    if (proximos.length) {
      resposta += `*📅 VENCEM EM ATÉ ${dias} DIAS (${proximos.length}):*\n`
      resposta += proximos.map(c => {
        const nome = c.cliente.razaoSocial || c.cliente.nome
        const d    = diasRestantes(c.dataVencimento)
        return `• ${nome} — ${c.modelo.nome} — ${d} dias (${fmtData(c.dataVencimento)})`
      }).join('\n')
    }
    return resposta
  }

  if (nome === 'resumo_financeiro') {
    const periodo = (input.periodo as string) ?? 'dia'
    const hoje = new Date()
    const inicio = periodo === 'dia'    ? startOfDay(hoje)
                 : periodo === 'semana' ? startOfWeek(hoje, { weekStartsOn: 0 })
                 : startOfMonth(hoje)
    const fim    = periodo === 'dia'    ? endOfDay(hoje)
                 : periodo === 'semana' ? endOfWeek(hoje, { weekStartsOn: 0 })
                 : endOfMonth(hoje)

    const [vendas, fat, emissoes, aReceber, aPagar] = await Promise.all([
      prisma.pedido.count({ where: { createdAt: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' }, ignorarMetricasVendas: false } }),
      prisma.pedido.aggregate({ _sum: { valorFinal: true }, where: { createdAt: { gte: inicio, lte: fim }, status: { not: 'CANCELADO' }, ignorarMetricasVendas: false } }),
      prisma.pedido.count({ where: { emitidoEm: { gte: inicio, lte: fim }, ignorarMetricasVendas: false } }),
      prisma.lancamento.aggregate({ _sum: { valor: true }, where: { tipo: 'RECEBER', status: 'PENDENTE' } }),
      prisma.lancamento.aggregate({ _sum: { valor: true }, where: { tipo: 'PAGAR',   status: 'PENDENTE' } }),
    ])

    const label = periodo === 'dia' ? 'HOJE' : periodo === 'semana' ? 'SEMANA' : 'MÊS'
    return `*📊 RESUMO — ${label}*\n\nVendas: *${vendas}* | Meta mês: 300\nFaturamento: *${fmtValor(Number(fat._sum.valorFinal ?? 0))}*\nEmissões: ${emissoes}\n\n💰 A receber (total): ${fmtValor(Number(aReceber._sum.valor ?? 0))}\n💸 A pagar (total): ${fmtValor(Number(aPagar._sum.valor ?? 0))}`
  }

  if (nome === 'contas_pagar') {
    const limite = Number(input.limite ?? 10)
    const contas = await prisma.lancamento.findMany({
      where: { tipo: 'PAGAR', status: 'PENDENTE' },
      orderBy: { dataVencimento: 'asc' },
      take: limite,
    })

    if (!contas.length) return 'Nenhuma conta a pagar pendente.'

    return `*💸 CONTAS A PAGAR (${contas.length}):*\n\n` + contas.map(c => {
      const dias = diasRestantes(c.dataVencimento)
      const icon = dias < 0 ? '🔴' : dias <= 7 ? '🟠' : '🟡'
      const situacao = dias < 0 ? `vencida há ${Math.abs(dias)}d` : `vence em ${dias}d`
      return `${icon} ${c.descricao}\n   ${fmtValor(Number(c.valor))} — ${fmtData(c.dataVencimento)} (${situacao})`
    }).join('\n\n')
  }

  if (nome === 'buscar_pedido') {
    const where: Record<string, unknown> = { status: { not: 'CANCELADO' } }
    if (input.numero) where.numero = { contains: String(input.numero), mode: 'insensitive' }
    if (input.status) where.status = input.status
    if (input.cliente) where.cliente = { OR: [
      { nome:        { contains: String(input.cliente), mode: 'insensitive' } },
      { razaoSocial: { contains: String(input.cliente), mode: 'insensitive' } },
    ]}

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: { select: { nome: true, razaoSocial: true } },
        itens: { include: { modelo: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    if (!pedidos.length) return 'Nenhum pedido encontrado.'

    return pedidos.map(p => {
      const nomeCli = p.cliente.razaoSocial || p.cliente.nome
      const modelo  = p.itens[0]?.modelo.nome ?? 'N/A'
      return `*${p.numero}* — ${nomeCli}\n${modelo} — ${fmtValor(Number(p.valorFinal))} — ${p.status}\n${fmtData(p.createdAt)}`
    }).join('\n\n')
  }

  if (nome === 'adicionar_pendencia') {
    const titulo = String(input.titulo ?? '').trim()
    if (!titulo) return 'Preciso de um título pra anotar a pendência.'
    const descricao = input.descricao ? String(input.descricao) : undefined

    const criada = await prisma.pendenciaProjeto.create({
      data: { titulo, descricao, origem: 'telegram' },
    })
    return `✅ Anotado: "${criada.titulo}"${descricao ? `\n${descricao}` : ''}`
  }

  if (nome === 'listar_pendencias') {
    const filtro = String(input.status ?? 'ATIVAS')
    const where = filtro === 'TODAS' ? {} : filtro === 'ATIVAS'
      ? { status: { in: ['PENDENTE', 'EM_ANDAMENTO'] as ('PENDENTE' | 'EM_ANDAMENTO')[] } }
      : { status: filtro as 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' }

    const itens = await prisma.pendenciaProjeto.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 25,
    })

    if (!itens.length) return 'Nenhuma pendência registrada com esse filtro.'

    const icone = { PENDENTE: '⏳', EM_ANDAMENTO: '🔧', CONCLUIDO: '✅' }
    return itens.map(p =>
      `${icone[p.status]} *${p.titulo}*${p.descricao ? `\n   ${p.descricao}` : ''}\n   _${fmtData(p.createdAt)}_`
    ).join('\n\n')
  }

  if (nome === 'atualizar_status_pendencia') {
    const titulo     = String(input.titulo ?? '')
    const novoStatus = input.novoStatus as 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'
    if (!titulo || !novoStatus) return 'Preciso do título e do novo status.'

    const item = await prisma.pendenciaProjeto.findFirst({
      where: { titulo: { contains: titulo, mode: 'insensitive' }, status: { not: 'CONCLUIDO' } },
      orderBy: { createdAt: 'desc' },
    })
    if (!item) return `Não achei nenhuma pendência ativa com "${titulo}" no título.`

    await prisma.pendenciaProjeto.update({
      where: { id: item.id },
      data: { status: novoStatus, concluidoEm: novoStatus === 'CONCLUIDO' ? new Date() : null },
    })
    return `Atualizado: "${item.titulo}" → ${novoStatus}`
  }

  if (nome === 'relatorio_setor_agr_digital') {
    const dias = Number(input.dias ?? 7)
    const fim = new Date()
    const inicio = new Date(fim.getTime() - dias * 86_400_000)
    const relatorio = await buscarRelatorioAgrDigital(inicio, fim)
    return formatarRelatorioAgrDigital(relatorio)
  }

  if (nome === 'relatorio_setor_auditor') {
    const dias = Number(input.dias ?? 7)
    const fim = new Date()
    const inicio = new Date(fim.getTime() - dias * 86_400_000)
    const relatorio = await buscarRelatorioAuditor(inicio, fim)
    return formatarRelatorioAuditor(relatorio)
  }

  return 'Ferramenta não reconhecida.'
}

// ── IA com ferramentas ────────────────────────────────────────────────────────

async function gerarResposta(pergunta: string): Promise<string> {
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: pergunta }]

  let response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: TOOLS,
    system: `Você é a Secretária da V&G Certificação Digital, respondendo via Telegram para o proprietário Vinicius.
Hoje é ${hoje}.
Seja direta, conciso e use emojis com moderação. Use *negrito* para destacar números e informações importantes.
Você tem acesso ao sistema completo via ferramentas — use-as sempre que precisar buscar informações.
Quando não souber algo, use a ferramenta adequada ao invés de dizer que não tem acesso.

O sistema é organizado em "setores" de robôs automáticos:
- AGR Digital: e-mail + WhatsApp automáticos (vencimento, nutrição pós-venda,
  aniversário, lembrete de agendamento, reativação, pesquisa NPS) — use
  relatorio_setor_agr_digital.
- Auditor: verifica se os outros robôs rodaram, corrige o que dá sozinho e
  avisa quando não consegue — use relatorio_setor_auditor.
Toda segunda de manhã cada setor manda seu relatório semanal sozinho no
Telegram (jobs separados). Todo dia às 18h você também manda um briefing
proativo sozinha (job separado, secretaria-diaria) — isso aqui é o modo
"ele te perguntou algo".

Além dos dados de clientes/financeiro/pedidos, você também ajuda Vinicius a
acompanhar o DESENVOLVIMENTO do próprio CertFlow: quando ele mandar uma
ideia/tarefa pra anotar, use adicionar_pendencia; quando perguntar o que
falta implementar ou o andamento do projeto, use listar_pendencias; quando
ele disser que algo foi feito ou começou a fazer, use
atualizar_status_pendencia. Isso é só desenvolvimento de software (backlog
de programação) — agenda/compromissos é fora do seu escopo, oriente a usar
o Google Agenda.

Limitações reais: não consegue gerar PDFs nem abrir o navegador, e ainda
não executa ações (disparar um WhatsApp específico, por exemplo) — só
consulta informações. Para ações, oriente acessar https://certflow-nine.vercel.app`,
    messages,
  })

  // Loop de ferramentas
  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(b => b.type === 'tool_use')
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

    for (const tool of toolUses) {
      if (tool.type !== 'tool_use') continue
      const resultado = await executarFerramenta(tool.name, tool.input as Record<string, unknown>)
      toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: resultado })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: TOOLS,
      system: `Você é a Secretária da V&G Certificação Digital via Telegram para o proprietário Vinicius. Hoje é ${hoje}. Seja direta e use *negrito* para destacar dados importantes.`,
      messages,
    })
  }

  const texto = response.content.find(b => b.type === 'text')
  return texto?.type === 'text' ? texto.text : 'Não consegui processar.'
}

// ── Webhook ───────────────────────────────────────────────────────────────────

// O Telegram reenvia esse header em toda chamada quando o webhook é
// registrado com secret_token (ver scripts/registrar-webhook-telegram.mjs).
// Sem isso, qualquer um que descobrisse o chat ID do admin conseguia forjar
// um POST direto (sem passar pelo Telegram de verdade) e, por exemplo,
// aprovar uma cobrança financeira real via callback_query (achado
// 17/07/2026, auditoria de segurança).
function origemVerificada(req: NextRequest): boolean {
  const esperado = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!esperado) return true // ainda não configurado — não bloqueia, só não reforça
  return req.headers.get('x-telegram-bot-api-secret-token') === esperado
}

export async function POST(req: NextRequest) {
  try {
    if (!origemVerificada(req)) {
      console.warn('[Telegram Webhook] secret_token ausente/inválido — requisição rejeitada')
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()

    if (body?.callback_query) {
      await processarCallbackQuery(body.callback_query)
      return NextResponse.json({ ok: true })
    }

    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat?.id
    const texto  = message.text?.trim() ?? ''
    if (!chatId || !texto) return NextResponse.json({ ok: true })

    if (!ADMIN_CHAT_ID) {
      await enviar(chatId, `🤖 Bot ativo! Seu Chat ID: \`${chatId}\`\nAdicione como TELEGRAM_ADMIN_CHAT_ID no Railway.`)
      return NextResponse.json({ ok: true })
    }

    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
      return NextResponse.json({ ok: true })
    }

    await enviar(chatId, '⏳ Consultando...')
    const resposta = await gerarResposta(texto)
    await enviar(chatId, resposta)

  } catch (err) {
    console.error('[telegram/webhook]', err)
  }

  return NextResponse.json({ ok: true })
}