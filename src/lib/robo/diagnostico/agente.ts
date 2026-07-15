// Agente investigativo — mesmo padrão de tool-loop da ZOE
// (src/app/api/assistente/chat/route.ts), com ferramentas somente-leitura
// (ver ferramentas.ts) e um modelo mais forte, já que aqui a tarefa é
// raciocínio de causa-raiz, não uma pergunta de negócio simples.

import Anthropic from '@anthropic-ai/sdk'
import type { AchadoRobo } from '../tipos'
import { FERRAMENTAS_DIAGNOSTICO, executarFerramentaDiagnostico } from './ferramentas'
import { buscarDiagnosticoCache, salvarDiagnosticoCache, reservarOrcamentoDiario, diagnosticoAtivo } from './cache'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 1024
const MAX_ITER = 6
const TIMEOUT_MS = 45_000

export interface ResultadoDiagnostico {
  texto: string
  deCache: boolean
  duracaoMs: number
  erro?: string
}

const SYSTEM_PROMPT = `Você é um auditor técnico sênior investigando um incidente real de produção no
CertFlow (sistema de gestão de certificação digital da V&G). Recebeu a descrição de um problema
encontrado pelo robô de monitoramento automático. Sua tarefa é investigar a causa raiz usando as
ferramentas disponíveis (consultar banco de dados, ler código-fonte, checar histórico de incidentes
parecidos, verificar se uma variável de ambiente existe) e propor uma solução concreta.

REGRAS RÍGIDAS:
- NUNCA alegue ter "testado" ou "confirmado" algo sem ter de fato chamado uma ferramenta que comprove
  isso. Se não conseguiu investigar o suficiente, diga isso claramente em vez de inventar confiança.
- NUNCA revele o valor de nenhuma variável de ambiente, senha, chave de API ou token — só se existe ou não.
- Priorize chamar "consultar_historico_auditoria" primeiro — pode já existir um diagnóstico anterior
  pro mesmo tipo de problema, economizando investigação.
- Seja terso: a resposta final deve ter no máximo 3-4 frases curtas, em português, texto plano
  (SEM markdown, SEM asteriscos, SEM backticks — vai direto pra uma mensagem de Telegram sem formatação).
- Formato esperado: "Causa provável: ... Sugestão: ..." — ou, quando a investigação realmente convergiu
  com evidência concreta de uma ferramenta, o formato mais direto "O problema é [causa], confirmei
  consultando [o que você consultou]. Sugestão: [solução]."
- Se depois de investigar você não tiver certeza da causa, diga isso explicitamente ("não consegui
  confirmar a causa exata, mas os sinais apontam para...") em vez de forçar uma resposta confiante.
- CRÍTICO: sua resposta final (a última mensagem, sem tool_use) deve conter SOMENTE o diagnóstico
  nesse formato curto — nunca inclua parágrafos de raciocínio solto, narração do que você foi
  checando, dúvidas sobre resultado de ferramenta, ou qualquer texto antes/depois do diagnóstico.
  Pense e investigue usando as ferramentas; a resposta final é só a conclusão.`

function comTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout de ${ms}ms`)), ms)),
  ])
}

async function investigar(a: AchadoRobo): Promise<string> {
  let mensagens: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: `Achado do robô de monitoramento (categoria: ${a.categoria}, chave: ${a.chaveDedup}):\n\n${a.texto}` },
  ]

  let textoFinal = ''
  let iteracoes = 0

  while (iteracoes < MAX_ITER) {
    iteracoes++

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: FERRAMENTAS_DIAGNOSTICO,
      messages: mensagens,
    })

    if (response.stop_reason === 'end_turn') {
      textoFinal = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as Anthropic.Messages.TextBlock).text)
        .join('\n')
        .trim()
      break
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const bloco of response.content) {
        if (bloco.type === 'tool_use') {
          const resultado = await executarFerramentaDiagnostico(bloco.name, bloco.input as Record<string, unknown>)
          toolResults.push({ type: 'tool_result', tool_use_id: bloco.id, content: resultado })
        }
      }
      mensagens = [
        ...mensagens,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
      continue
    }

    break
  }

  return textoFinal
}

export async function diagnosticarAchado(a: AchadoRobo): Promise<ResultadoDiagnostico> {
  const inicio = Date.now()

  if (!a.investigavel) {
    return { texto: '', deCache: false, duracaoMs: 0 }
  }

  if (!(await diagnosticoAtivo())) {
    return { texto: '', deCache: false, duracaoMs: 0 }
  }

  const doCache = await buscarDiagnosticoCache(a.chaveDedup, a.categoria)
  if (doCache) {
    return { texto: doCache.texto, deCache: true, duracaoMs: Date.now() - inicio }
  }

  if (!(await reservarOrcamentoDiario())) {
    return { texto: '', deCache: false, duracaoMs: Date.now() - inicio, erro: 'limite diário de investigações atingido' }
  }

  try {
    const texto = await comTimeout(investigar(a), TIMEOUT_MS)
    const duracaoMs = Date.now() - inicio
    if (!texto) return { texto: '', deCache: false, duracaoMs }

    await salvarDiagnosticoCache(a.chaveDedup, a.categoria, texto)
    return { texto, deCache: false, duracaoMs }
  } catch (e) {
    return { texto: '', deCache: false, duracaoMs: Date.now() - inicio, erro: String(e) }
  }
}
