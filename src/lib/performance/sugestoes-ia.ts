// Mesmo padrão de src/app/api/social/gerar/route.ts: 1 chamada Claude Haiku,
// sem tools, números já calculados no prompt, resposta em JSON curto. Não usa
// o padrão de chat com tools da ZOE — não precisa, os números já vêm prontos.
import Anthropic from '@anthropic-ai/sdk'
import type { IndicadorCompleto } from './calcular'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function gerarSugestoesIA(indicador: IndicadorCompleto): Promise<string[]> {
  const { producao, qualidade, renovacao, icf, tendencia } = indicador

  const prompt = `Você é um analista de operações da V&G Certificação Digital, uma empresa de certificação digital (AR Safeweb). Analise os números abaixo do mês atual e gere de 2 a 4 observações curtas e objetivas.

DADOS DO MÊS:
- ICF (Índice CertFlow, 0-100): ${icf}
- Produção: ${producao.resultado} de ${producao.meta} certificados emitidos (${producao.percentual}%), faltam ${producao.diasRestantes} dias, média diária necessária pra bater a meta: ${producao.mediaDiariaNecessaria.toFixed(1)}/dia, previsão de fechamento: ${producao.previsaoFechamento}
- Qualidade: ${qualidade.pontuacao} pontos (de 100), ${qualidade.ocorrencias} ocorrência(s) registrada(s) no mês
- Renovação: ${renovacao.taxaContato.toFixed(0)}% dos clientes vencendo em 30 dias já contactados, ${renovacao.clientesPendentes} ainda pendentes, taxa de renovação efetiva ${renovacao.taxaConversao.toFixed(0)}%
${tendencia.icfMesAnterior !== null ? `- ICF do mês anterior: ${tendencia.icfMesAnterior} (evolução: ${tendencia.evolucao! >= 0 ? '+' : ''}${tendencia.evolucao})` : '- Sem dado de mês anterior ainda'}

INSTRUÇÕES:
- Frases curtas (máximo ~20 palavras cada), estilo "A produção está X% abaixo da média" ou "Foram detectados N retrabalhos este mês".
- Tom direto, profissional, sem alarmismo — o objetivo é ajudar a liderança a decidir, não assustar a equipe.
- NUNCA mencione nomes de pessoas — o ICF mede a operação, não indivíduos.
- Se algum indicador estiver puxando o ICF pra baixo, aponte qual.
- Se tudo estiver bem, pode dizer isso também (nem toda sugestão precisa ser um alerta).
- Responda APENAS em JSON, sem markdown, no formato exato: {"sugestoes": ["frase 1", "frase 2"]}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const bloco = msg.content.find(b => b.type === 'text')
    const texto = bloco?.type === 'text' ? bloco.text : '{}'
    const limpo = texto.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(limpo)
    return Array.isArray(parsed.sugestoes) ? parsed.sugestoes.filter((s: unknown) => typeof s === 'string') : []
  } catch (e) {
    console.error('[sugestoes-ia] falha ao gerar:', e)
    return []
  }
}
