// Ferramentas somente-leitura do agente diagnosticador. Mesmo padrão da ZOE
// (src/app/api/assistente/chat/route.ts): tool_use → executor server-side →
// resultado devolvido como texto humano formatado, nunca JSON cru.
//
// Regra de segurança inegociável: NENHUMA ferramenta aqui pode expor valor
// de segredo/credencial — o diagnóstico final vai pro Telegram. Por isso o
// acesso a banco usa allowlist de campos (nunca denylist só), e a variável
// de ambiente só retorna se existe, nunca o valor.

import fs from 'node:fs'
import path from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../prisma'

// ─── Ferramenta 1: consultar_banco ─────────────────────────────────────────

type NomeTabela = keyof typeof TABELAS_PERMITIDAS

const TABELAS_PERMITIDAS = {
  EmailLog: {
    delegate: () => prisma.emailLog,
    camposWhere: ['destinatario', 'tipo', 'status', 'certificadoId', 'clienteId'],
    camposSelect: ['id', 'tipo', 'destinatario', 'status', 'motivoFalha', 'erro', 'enviadoEm', 'createdAt'],
  },
  Pedido: {
    delegate: () => prisma.pedido,
    camposWhere: ['numero', 'status', 'agr'],
    camposSelect: ['id', 'numero', 'status', 'agr', 'emitidoEm', 'createdAt', 'tipoAtendimento'],
  },
  Configuracao: {
    delegate: () => prisma.configuracao,
    camposWhere: ['chave'],
    camposSelect: ['chave', 'valor'],
    semOrdenacao: true, // modelo não tem createdAt
  },
  AuditoriaRobo: {
    delegate: () => prisma.auditoriaRobo,
    camposWhere: ['tipo', 'status'],
    camposSelect: ['id', 'tipo', 'status', 'achados', 'correcoes', 'diagnosticos', 'createdAt'],
  },
  Certificado: {
    delegate: () => prisma.certificado,
    camposWhere: ['status', 'pedidoId'],
    camposSelect: ['id', 'status', 'dataEmissao', 'dataVencimento', 'pedidoId'],
  },
  Cliente: {
    delegate: () => prisma.cliente,
    camposWhere: ['id'],
    camposSelect: ['id', 'nome', 'email'],
  },
  Lancamento: {
    delegate: () => prisma.lancamento,
    camposWhere: ['status', 'tipo', 'pedidoId'],
    camposSelect: ['id', 'tipo', 'status', 'valor', 'dataVencimento', 'pedidoId'],
  },
} as const

// Converte "contains:x" / "gte:2026-01-01" / "lte:2026-01-01" / valor puro
// (equals) num filtro Prisma simples — sem SQL cru, sem operadores livres.
function parsearValorFiltro(valor: string): unknown {
  if (valor.startsWith('contains:')) return { contains: valor.slice(9) }
  if (valor.startsWith('gte:')) return { gte: new Date(valor.slice(4)) }
  if (valor.startsWith('lte:')) return { lte: new Date(valor.slice(4)) }
  return valor
}

async function consultarBanco(input: { tabela?: string; filtro?: Record<string, string>; selecionar?: string[]; limite?: number }): Promise<string> {
  const tabela = input.tabela as NomeTabela
  const def = TABELAS_PERMITIDAS[tabela]
  if (!def) return `Erro: tabela "${input.tabela}" não permitida. Tabelas disponíveis: ${Object.keys(TABELAS_PERMITIDAS).join(', ')}.`

  const where: Record<string, unknown> = {}
  for (const [campo, valor] of Object.entries(input.filtro ?? {})) {
    if (!def.camposWhere.includes(campo as never)) continue // ignora silenciosamente campo fora da allowlist
    where[campo] = parsearValorFiltro(valor)
  }

  const selectPedido = (input.selecionar ?? def.camposSelect).filter(c => def.camposSelect.includes(c as never))
  const select = Object.fromEntries((selectPedido.length ? selectPedido : def.camposSelect).map(c => [c, true]))

  const limite = Math.min(Math.max(input.limite ?? 10, 1), 20)
  const orderBy = 'semOrdenacao' in def && def.semOrdenacao ? undefined : { createdAt: 'desc' as const }

  try {
    // @ts-expect-error — delegate genérico por tabela, cada um tem findMany com shape compatível
    const linhas = await def.delegate().findMany({ where, select, take: limite, ...(orderBy ? { orderBy } : {}) })
    if (linhas.length === 0) return `Nenhum registro encontrado em ${tabela} com esse filtro.`
    return linhas.map((l: Record<string, unknown>) => JSON.stringify(l)).join('\n')
  } catch (e) {
    return `Erro ao consultar ${tabela}: ${String(e)}`
  }
}

// ─── Ferramenta 2: ler_arquivo ──────────────────────────────────────────────

const RAIZ_PROJETO = process.cwd()
const DIRETORIOS_PERMITIDOS = [
  'src/lib/robo',
  'src/lib/email',
  'src/lib/safeweb.ts',
  'src/app/api/jobs',
  'prisma/schema.prisma',
  'docs',
]
const DENYLIST = ['.env', 'secret', 'credential', 'password', '.git/', 'node_modules/']
const TAMANHO_MAX = 60_000

function caminhoPermitido(caminhoRelativo: string): boolean {
  const normalizado = caminhoRelativo.replace(/\\/g, '/')
  if (DENYLIST.some(d => normalizado.toLowerCase().includes(d))) return false

  const resolvido = path.resolve(RAIZ_PROJETO, normalizado)
  if (!resolvido.startsWith(RAIZ_PROJETO)) return false // bloqueia ../ escapando da raiz

  return DIRETORIOS_PERMITIDOS.some(permitido => {
    const raizPermitida = path.resolve(RAIZ_PROJETO, permitido)
    return resolvido === raizPermitida || resolvido.startsWith(raizPermitida + path.sep)
  })
}

async function lerArquivo(input: { caminho?: string; linhaInicio?: number; linhaFim?: number }): Promise<string> {
  const caminho = input.caminho ?? ''
  if (!caminhoPermitido(caminho)) {
    return `Não posso ler "${caminho}" — fora da lista de diretórios permitidos pro diagnóstico (${DIRETORIOS_PERMITIDOS.join(', ')}).`
  }

  try {
    const resolvido = path.resolve(RAIZ_PROJETO, caminho)
    let conteudo = fs.readFileSync(resolvido, 'utf-8')

    if (input.linhaInicio || input.linhaFim) {
      const linhas = conteudo.split('\n')
      const inicio = Math.max((input.linhaInicio ?? 1) - 1, 0)
      const fim = Math.min(input.linhaFim ?? linhas.length, linhas.length)
      conteudo = linhas.slice(inicio, fim).join('\n')
    }

    if (conteudo.length > TAMANHO_MAX) {
      conteudo = conteudo.slice(0, TAMANHO_MAX) + '\n\n[...arquivo truncado em 60KB...]'
    }
    return conteudo
  } catch {
    return `Arquivo não disponível neste ambiente (produção pode não conter os fontes TypeScript). Baseie o diagnóstico nos dados já obtidos.`
  }
}

// ─── Ferramenta 3: consultar_historico_auditoria ───────────────────────────

async function consultarHistoricoAuditoria(input: { chaveDedup?: string; limite?: number }): Promise<string> {
  if (!input.chaveDedup) return 'Erro: chaveDedup é obrigatório.'
  const limite = Math.min(Math.max(input.limite ?? 10, 1), 20)

  const registros = await prisma.auditoriaRobo.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // varre um pouco mais que o limite final, já que filtra em memória pelo conteúdo do JSON
    select: { tipo: true, status: true, achados: true, diagnosticos: true, createdAt: true },
  })

  const ocorrencias = registros.filter(r => {
    const achados = Array.isArray(r.achados) ? r.achados : []
    return achados.some((a: unknown) => typeof a === 'string' && a.includes(input.chaveDedup!))
      || (Array.isArray(r.diagnosticos) && r.diagnosticos.some((d: unknown) => (d as { chaveDedup?: string })?.chaveDedup === input.chaveDedup))
  }).slice(0, limite)

  if (ocorrencias.length === 0) return `Nenhuma ocorrência anterior encontrada pra "${input.chaveDedup}" — pode ser a primeira vez que isso acontece.`

  return ocorrencias.map(r => {
    const diag = Array.isArray(r.diagnosticos)
      ? (r.diagnosticos as { chaveDedup?: string; texto?: string }[]).find(d => d.chaveDedup === input.chaveDedup)
      : undefined
    return `${r.createdAt.toISOString()} | ${r.tipo}/${r.status}${diag?.texto ? ` | diagnóstico anterior: ${diag.texto}` : ''}`
  }).join('\n')
}

// ─── Ferramenta 4: verificar_variavel_ambiente ─────────────────────────────

const VARIAVEIS_PERMITIDAS = [
  'BREVO_API_KEY', 'SMTP_FROM', 'SMTP_HOST', 'SMTP_USER',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID',
  'AUTH_SECRET', 'ANTHROPIC_API_KEY', 'DIGISAC_TOKEN', 'DIGISAC_URL',
  'DATABASE_URL', 'JOB_BASE_URL', 'NEXTAUTH_URL', 'AUTH_URL',
]

function verificarVariavelAmbiente(input: { nome?: string }): string {
  const nome = input.nome ?? ''
  if (!VARIAVEIS_PERMITIDAS.includes(nome)) {
    return `"${nome}" não está na lista de variáveis que posso checar. Permitidas: ${VARIAVEIS_PERMITIDAS.join(', ')}.`
  }
  const existe = Boolean(process.env[nome] && process.env[nome]!.trim().length > 0)
  // Nunca retornar o valor — só presença/ausência.
  return `${nome}: ${existe ? 'configurada' : 'AUSENTE'}`
}

// ─── Definição das tools + dispatcher ───────────────────────────────────────

export const FERRAMENTAS_DIAGNOSTICO: Anthropic.Messages.Tool[] = [
  {
    name: 'consultar_banco',
    description: `Consulta registros no banco de dados do CertFlow, somente leitura, com limites de segurança.
Tabelas disponíveis: ${Object.keys(TABELAS_PERMITIDAS).join(', ')}.
Use pra confirmar hipóteses com dados reais (ex.: "esse e-mail já falhou antes?", "esse pedido existe?").
Valores de filtro aceitam prefixos: "contains:texto", "gte:2026-01-01", "lte:2026-01-01", ou valor exato.
Valores válidos de "status" por tabela: EmailLog = PENDENTE|ENVIADO|ERRO; Pedido = GERADO|VERIFICADO|EMITIDO|CANCELADO;
Certificado = ATIVO|VENCIDO|CANCELADO|RENOVADO|NAO_RENOVADO|REVOGADO; Lancamento = PENDENTE|PAGO|VENCIDO|CANCELADO.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        tabela: { type: 'string', description: `Uma de: ${Object.keys(TABELAS_PERMITIDAS).join(', ')}` },
        filtro: { type: 'object', description: 'Filtro simples {campo: valor}. Só campos permitidos pra cada tabela são aceitos.' },
        selecionar: { type: 'array', items: { type: 'string' }, description: 'Campos a retornar (opcional, usa o padrão da tabela se omitido)' },
        limite: { type: 'number', description: 'Máximo de linhas (padrão 10, capado em 20)' },
      },
      required: ['tabela'],
    },
  },
  {
    name: 'ler_arquivo',
    description: `Lê um trecho de um arquivo de código-fonte do CertFlow, somente leitura.
Só funciona pra arquivos dentro de: ${DIRETORIOS_PERMITIDOS.join(', ')}.
Use pra confirmar como uma função/rota realmente funciona antes de concluir a causa raiz.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        caminho: { type: 'string', description: 'Caminho relativo à raiz do projeto, ex: "src/lib/robo/verificacao-leve.ts"' },
        linhaInicio: { type: 'number', description: 'Linha inicial (opcional)' },
        linhaFim: { type: 'number', description: 'Linha final (opcional)' },
      },
      required: ['caminho'],
    },
  },
  {
    name: 'consultar_historico_auditoria',
    description: `Verifica se esse mesmo tipo de problema (mesma chaveDedup) já aconteceu antes, e o que já foi
diagnosticado da última vez. Sempre vale a pena chamar essa ferramenta primeiro — evita reinvestigar do zero
algo que já tem uma causa conhecida.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        chaveDedup: { type: 'string', description: 'A chave de agrupamento do achado (fornecida no contexto inicial)' },
        limite: { type: 'number', description: 'Máximo de ocorrências anteriores (padrão 10)' },
      },
      required: ['chaveDedup'],
    },
  },
  {
    name: 'verificar_variavel_ambiente',
    description: `Verifica SE uma variável de ambiente está configurada no servidor — nunca retorna o valor dela,
só se existe ou não. Use quando suspeitar de um problema de configuração/credencial ausente.
Variáveis disponíveis: ${VARIAVEIS_PERMITIDAS.join(', ')}.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        nome: { type: 'string', description: `Uma de: ${VARIAVEIS_PERMITIDAS.join(', ')}` },
      },
      required: ['nome'],
    },
  },
]

export async function executarFerramentaDiagnostico(nome: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (nome) {
      case 'consultar_banco': return await consultarBanco(input as Parameters<typeof consultarBanco>[0])
      case 'ler_arquivo': return await lerArquivo(input as Parameters<typeof lerArquivo>[0])
      case 'consultar_historico_auditoria': return await consultarHistoricoAuditoria(input as Parameters<typeof consultarHistoricoAuditoria>[0])
      case 'verificar_variavel_ambiente': return verificarVariavelAmbiente(input as Parameters<typeof verificarVariavelAmbiente>[0])
      default: return `Ferramenta "${nome}" não existe.`
    }
  } catch (e) {
    return `Erro ao executar a ferramenta ${nome}: ${String(e)}`
  }
}
