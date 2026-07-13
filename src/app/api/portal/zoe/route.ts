import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  return '✅ OK'
}

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'buscar_meu_cliente',
    description: 'Busca um cliente do parceiro por nome, CPF ou CNPJ e retorna certificados com status e datas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        nome: { type: 'string', description: 'Nome ou parte do nome/razão social' },
        cpf:  { type: 'string', description: 'CPF apenas números' },
        cnpj: { type: 'string', description: 'CNPJ apenas números' },
      },
    },
  },
  {
    name: 'vencimentos_proximos',
    description: 'Lista certificados dos clientes do parceiro que vencem em breve ou já venceram. Use quando perguntarem sobre vencimentos, quem renovar, quem está vencido.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dias: { type: 'string', description: 'Número de dias à frente (padrão: 60)' },
        incluirVencidos: { type: 'string', description: '"true" para incluir vencidos (padrão: true)' },
      },
    },
  },
  {
    name: 'resumo_carteira',
    description: 'Retorna panorama geral da carteira do parceiro: totais, vencimentos, indicações do mês. Use para "como está minha carteira", "resumo", "situação geral".',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'buscar_grupo',
    description: 'Lista todas as empresas de um grupo empresarial (sócio com várias empresas). Use quando perguntarem "quais empresas são do grupo X", "empresas do sócio Y", "grupo Jafé" etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        grupo: { type: 'string', description: 'Nome do grupo ou do sócio responsável' },
      },
      required: ['grupo'],
    },
  },
]

async function executarFerramenta(nome: string, input: Record<string, string>, parceiroId: string): Promise<string> {

  if (nome === 'buscar_meu_cliente') {
    const { cpf, cnpj, nome: nomeBusca } = input
    const cpfNums  = cpf?.replace(/\D/g, '')
    const cnpjNums = cnpj?.replace(/\D/g, '')

    const orClauses = [
      cpfNums   ? { cpf: cpfNums }   : null,
      cnpjNums  ? { cnpj: cnpjNums } : null,
      nomeBusca ? { nome:        { contains: nomeBusca, mode: 'insensitive' as const } } : null,
      nomeBusca ? { razaoSocial: { contains: nomeBusca, mode: 'insensitive' as const } } : null,
    ].filter(Boolean) as object[]

    if (orClauses.length === 0) return 'Informe um nome, CPF ou CNPJ para buscar.'

    const clientes = await prisma.cliente.findMany({
      where: { parceiroId, OR: orClauses },
      include: {
        certificados: {
          include: { modelo: { select: { nome: true } } },
          orderBy: { dataVencimento: 'asc' },
        },
      },
      take: 5,
    })

    if (clientes.length === 0) return 'Nenhum cliente encontrado com esses dados na sua carteira.'

    return clientes.map(c => {
      const doc = c.cnpj ? `CNPJ: ${fmtCNPJ(c.cnpj)}` : c.cpf ? `CPF: ${fmtCPF(c.cpf)}` : ''
      const certs = c.certificados.map(cert => {
        const dias = diasRestantes(cert.dataVencimento)
        const status = cert.status === 'ATIVO' ? urgenciaLabel(dias) : '⚫ INATIVO'
        const diasStr = cert.status === 'ATIVO'
          ? (dias < 0 ? `vencido há ${Math.abs(dias)} dias` : `${dias} dias restantes`)
          : ''
        return `  • ${cert.modelo.nome} — vence ${fmtData(cert.dataVencimento)} ${status}${diasStr ? ` (${diasStr})` : ''}`
      }).join('\n') || '  • Sem certificados cadastrados'
      return `**${c.razaoSocial || c.nome}**\n${doc}${c.email ? `\nE-mail: ${c.email}` : ''}${c.celular || c.telefone ? `\nTelefone: ${c.celular || c.telefone}` : ''}\n\nCertificados:\n${certs}`
    }).join('\n\n---\n\n')
  }

  if (nome === 'vencimentos_proximos') {
    const dias = Math.min(parseInt(input.dias ?? '60') || 60, 365)
    const incluirVencidos = input.incluirVencidos !== 'false'
    const hoje = new Date()
    const emN  = new Date(Date.now() + dias * 86_400_000)

    const certs = await prisma.certificado.findMany({
      where: {
        cliente: { parceiroId },
        status: 'ATIVO',
        dataVencimento: incluirVencidos ? { lte: emN } : { gte: hoje, lte: emN },
      },
      include: {
        cliente: { select: { nome: true, razaoSocial: true, celular: true, telefone: true } },
        modelo:  { select: { nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
      take: 50,
    })

    if (certs.length === 0) return `✅ Nenhum certificado vencendo nos próximos ${dias} dias.`

    const vencidos = certs.filter(c => diasRestantes(c.dataVencimento) < 0)
    const proximos = certs.filter(c => diasRestantes(c.dataVencimento) >= 0)

    const formatar = (c: typeof certs[0]) => {
      const d = diasRestantes(c.dataVencimento)
      const nome = c.cliente.razaoSocial || c.cliente.nome
      const tel = c.cliente.celular || c.cliente.telefone || '—'
      const diasStr = d < 0 ? `vencido há ${Math.abs(d)} dias` : `${d} dias restantes`
      return `${urgenciaLabel(d)} **${nome}**\n  📋 ${c.modelo.nome} — ${fmtData(c.dataVencimento)} (${diasStr})\n  📞 ${tel}`
    }

    let resultado = `📋 **${certs.length} certificado(s)** nos próximos ${dias} dias\n\n`
    if (vencidos.length > 0) resultado += `### 🔴 Vencidos (${vencidos.length})\n${vencidos.map(formatar).join('\n\n')}\n\n`
    if (proximos.length > 0) resultado += `### ⏰ A vencer (${proximos.length})\n${proximos.map(formatar).join('\n\n')}`
    return resultado
  }

  if (nome === 'resumo_carteira') {
    const hoje = new Date()
    const em30 = new Date(Date.now() + 30 * 86_400_000)
    const em60 = new Date(Date.now() + 60 * 86_400_000)

    const [totalClientes, certsAtivos, certsVencidos, venc30, venc60, pedidosMes] = await Promise.all([
      prisma.cliente.count({ where: { parceiroId } }),
      prisma.certificado.count({ where: { cliente: { parceiroId }, status: 'ATIVO', dataVencimento: { gte: hoje } } }),
      prisma.certificado.count({ where: { cliente: { parceiroId }, status: 'ATIVO', dataVencimento: { lt: hoje } } }),
      prisma.certificado.count({ where: { cliente: { parceiroId }, status: 'ATIVO', dataVencimento: { gte: hoje, lte: em30 } } }),
      prisma.certificado.count({ where: { cliente: { parceiroId }, status: 'ATIVO', dataVencimento: { gte: hoje, lte: em60 } } }),
      prisma.pedido.count({
        where: {
          parceiroId,
          status: { not: 'CANCELADO' },
          createdAt: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
        },
      }),
    ])

    return `## 📊 Resumo da Sua Carteira

**Clientes cadastrados:** ${totalClientes}
**Certificados ativos:** ${certsAtivos}
**Certificados vencidos (ação urgente):** ${certsVencidos}

**Vencimentos futuros:**
  🟠 Vencem em até 30 dias: ${venc30}
  🟡 Vencem em até 60 dias: ${venc60}

**Indicações este mês:** ${pedidosMes}`
  }

  if (nome === 'buscar_grupo') {
    const { grupo } = input
    if (!grupo?.trim()) return 'Nome do grupo não informado.'

    const empresas = await prisma.cliente.findMany({
      where: {
        parceiroId,
        grupo: { contains: grupo.trim(), mode: 'insensitive' },
        tipoPessoa: 'PJ',
      },
      include: {
        certificados: {
          where: { status: 'ATIVO' },
          include: { modelo: { select: { nome: true } } },
          orderBy: { dataVencimento: 'asc' },
          take: 1,
        },
      },
      orderBy: { nome: 'asc' },
    })

    if (empresas.length === 0) return `Nenhuma empresa encontrada no grupo "${grupo}".`

    const lista = empresas.map(e => {
      const doc = e.cnpj ? `CNPJ: ${fmtCNPJ(e.cnpj)}` : ''
      const cert = e.certificados[0]
      const certInfo = cert
        ? `Cert: ${cert.modelo.nome} — vence ${fmtData(cert.dataVencimento)} ${urgenciaLabel(diasRestantes(cert.dataVencimento))}`
        : 'Sem certificado ativo'
      return `• **${e.razaoSocial || e.nome}** ${doc ? `(${doc})` : ''}\n  ${certInfo}`
    }).join('\n')

    return `## 🏢 Grupo "${grupo}" — ${empresas.length} empresa${empresas.length !== 1 ? 's' : ''}\n\n${lista}`
  }

  return 'Ferramenta não reconhecida.'
}

export async function POST(req: NextRequest) {
  const parceiro = await getPortalSession()
  if (!parceiro) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ erro: 'Mensagens inválidas' }, { status: 422 })

  const nomeExibicao = parceiro.nomeFantasia || parceiro.razaoSocial || parceiro.nome

  const systemText = `Você é a ZOE, assistente virtual de IA da V&G Certificação Digital.
Você está atendendo o parceiro **${nomeExibicao}** no portal exclusivo de parceiros.

## Suas responsabilidades
Você existe para ajudar o parceiro com dois grandes temas:

**1. Carteira de Certificados Digitais**
- Verificar status de certificados (ativo, vencido, vencendo em breve)
- Encontrar informações de clientes por nome, CPF ou CNPJ
- Mostrar quais certificados estão prestes a vencer
- Dar panorama geral da carteira

**2. SST — Segurança e Saúde no Trabalho**
- Explicar o que é SST, quais empresas precisam, quais documentos são obrigatórios
- Informar sobre a NR-1 e suas implicações
- Apresentar os serviços que a V&G oferece em SST (via parceria com SST Simples)
- Ajudar o parceiro a identificar clientes que precisam de SST
- Orientar como indicar clientes interessados para a equipe V&G

## LIMITES ABSOLUTOS — nunca ultrapasse
Você NUNCA deve responder sobre:
- Preços de custo, margens ou tabelas internas da V&G
- Informações financeiras, comissões, repasses ou faturamento interno
- Dados de outros parceiros ou da equipe interna da V&G
- Processos internos, sistemas, senhas ou configurações da V&G
- Qualquer informação que não seja de interesse do parceiro que está conversando

Se perguntarem qualquer coisa fora do escopo acima, responda educadamente:
"Essa informação não está disponível aqui no portal. Para dúvidas sobre isso, entre em contato diretamente com a equipe da V&G pelo WhatsApp."

## Regras de dados
- Para certificados: acesso APENAS aos clientes e certificados DESTE parceiro
- Use as ferramentas disponíveis — nunca invente dados
- Se não encontrar algo, diga claramente e sugira tentar com outros termos

## Tom
- Amigável, prestativa e direta
- Responda sempre em português do Brasil
- Quando identificar oportunidade de SST, sugira ao parceiro indicar o cliente para a V&G

---

## Conhecimento técnico — Certificados Digitais
- Certificados A1 (arquivo digital, válido 1 ano) e A3 (token/cartão/nuvem, 1 a 3 anos)
- e-CPF (pessoa física) e e-CNPJ (pessoa jurídica)
- Recomendação: renovar 30 dias antes do vencimento para evitar interrupções
- Atendimento 100% online via videoconferência pela V&G

---

## Conhecimento técnico — SST (Segurança e Saúde no Trabalho)

### O que é SST
SST é o conjunto de normas, programas e laudos que garantem a segurança e saúde dos trabalhadores. Toda empresa que possui empregados registrados (CLT) é obrigada a manter a documentação de SST em dia. O não cumprimento sujeita a empresa a multas do Ministério do Trabalho, autuações fiscais e problemas no eSocial.

### NR-1 — Norma Regulamentadora nº 1 (VIGENTE desde 26/05/2026 — HOJE)
A NR-1 foi atualizada pelo Ministério do Trabalho e passou a exigir formalmente o **GRO (Gerenciamento de Riscos Ocupacionais)** como base de toda a gestão de SST. A principal mudança é a obrigatoriedade do **PGR** para TODAS as empresas com funcionários, sem exceção de porte ou setor. Antes, microempresas e EPPs de baixo risco tinham dispensa simplificada. Agora, todas precisam ter o documento elaborado e registrado no eSocial. Isso representa uma oportunidade enorme: contadores, escritórios de contabilidade e parceiros como o(a) ${nomeExibicao} podem oferecer esse serviço aos seus clientes.

### Documentos e laudos de SST (elaborados pela V&G via SST Simples)
- **PGR** (Programa de Gerenciamento de Riscos) — obrigatório para TODAS as empresas com empregados desde a NR-1. Identifica e gerencia os riscos ocupacionais.
- **PCMSO** (Programa de Controle Médico de Saúde Ocupacional) — plano de exames médicos periódicos dos funcionários, obrigatório para empresas com CLT.
- **LTCAT** (Laudo Técnico das Condições Ambientais do Trabalho) — necessário para empresas com agentes nocivos (ruído, calor, produtos químicos) que podem gerar aposentadoria especial.
- **PPP** (Perfil Profissiográfico Previdenciário) — documento individual do trabalhador para aposentadoria especial; obrigatório quando há LTCAT.
- **AET** (Análise Ergonômica do Trabalho) — analisa condições ergonômicas dos postos de trabalho; recomendada especialmente para trabalho em escritório e uso prolongado de computadores.
- **Laudo de Insalubridade** — identifica atividades que geram adicional de insalubridade (10%, 20% ou 40% do salário mínimo); obrigatório quando há exposição a agentes nocivos.
- **Laudo de Periculosidade** — avalia risco de vida (eletricidade, explosivos, etc.); quando configurado, gera adicional de 30% do salário.
- **PPRA** (Programa de Prevenção de Riscos Ambientais) — substituído pelo PGR na NR-9, mas ainda utilizado por algumas empresas como complemento.

### Quem precisa de SST
Toda empresa com ao menos 1 funcionário CLT precisa de PGR e PCMSO. Outros laudos dependem da atividade e dos riscos presentes. Uma empresa de contabilidade com 5 funcionários precisa de PGR, PCMSO e possivelmente AET. Uma indústria, construção civil ou empresa com exposição a agentes nocivos pode precisar de todos os documentos.

### Como a V&G oferece SST
A V&G firmou parceria com a **SST Simples**, empresa especializada em elaboração de laudos e programas de SST. A V&G capta os clientes e a SST Simples elabora toda a documentação e faz o envio ao eSocial. O serviço é oferecido com **parcelamento em até 12x**, tornando o investimento acessível para pequenas e médias empresas. Isso cria recorrência: a cada renovação dos laudos (geralmente anual), o cliente volta.

### Como o parceiro pode indicar
Se o parceiro identificar um cliente que precisa de SST, basta entrar em contato com a equipe da V&G pelo WhatsApp para abrir a negociação. A V&G cuida de todo o processo comercial e técnico.

### Perguntas frequentes sobre SST
- **"Meu cliente é MEI, precisa?"** — MEI sem funcionários CLT não precisa. Se tiver empregado registrado, sim.
- **"Microempresa precisa?"** — Sim. Com a NR-1 de hoje (26/05/2026), TODAS as empresas com funcionários precisam de PGR, independente do porte.
- **"O laudo tem prazo de validade?"** — Sim. O PGR deve ser revisado anualmente ou sempre que houver mudança nos processos ou riscos. O PCMSO acompanha o mesmo ciclo.
- **"O que acontece se não tiver?"** — A empresa fica irregular junto ao eSocial, pode receber multas do Ministério do Trabalho e ter problemas em fiscalizações trabalhistas.`

  let mensagensAtual: Anthropic.Messages.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })
  )

  let textoFinal = ''
  let iteracoes = 0

  while (iteracoes < 5) {
    iteracoes++

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
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
          const resultado = await executarFerramenta(bloco.name, bloco.input as Record<string, string>, parceiro.id)
          toolResults.push({ type: 'tool_result', tool_use_id: bloco.id, content: resultado })
        }
      }
      mensagensAtual = [
        ...mensagensAtual,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
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
