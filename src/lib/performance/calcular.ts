// Orquestrador: junta produção + qualidade + renovação num único resultado
// completo do mês. É a função que o dashboard, o robô diário e o simulador
// de meta usam — cada um dos 3 indicadores continua puro/isolado nos seus
// próprios arquivos (producao.ts, qualidade.ts, renovacao.ts).
import { startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { buscarMetaVigente } from './metas'
import { buscarProducaoMes, calcularPontuacaoProducao, classificarProducao, calcularMediaDiariaNecessaria, calcularPrevisaoFechamento } from './producao'
import { buscarOcorrenciasMes, calcularPontuacaoQualidade, classificarQualidade } from './qualidade'
import { buscarRenovacaoMes, calcularPercentualRenovacao, classificarRenovacao } from './renovacao'
import { calcularICF, classificarICF, buscarTendenciaICF } from './icf'

export interface IndicadorCompleto {
  mes: number
  ano: number
  producao: {
    resultado: number
    meta: number
    percentual: number
    pontuacao: number
    status: ReturnType<typeof classificarProducao>
    diasRestantes: number
    mediaDiariaNecessaria: number
    previsaoFechamento: number
  }
  qualidade: {
    pontuacao: number
    ocorrencias: number
    status: ReturnType<typeof classificarQualidade>
    ultimaOcorrenciaData: Date | null
  }
  renovacao: {
    clientesVencendo30: number
    clientesContactados: number
    clientesPendentes: number
    taxaContato: number
    taxaConversao: number
    percentual: number
    status: ReturnType<typeof classificarRenovacao>
  }
  icf: number
  classificacao: ReturnType<typeof classificarICF>
  tendencia: Awaited<ReturnType<typeof buscarTendenciaICF>>
}

export async function calcularIndicadorCompleto(referencia: Date = new Date()): Promise<IndicadorCompleto> {
  const mes = referencia.getMonth() + 1
  const ano = referencia.getFullYear()
  const inicioMes = startOfMonth(referencia)
  const fimMes = endOfMonth(referencia)
  const hoje = new Date()
  const diaAtual = referencia.getDate()
  const diasNoMes = getDaysInMonth(referencia)
  const diasRestantes = Math.max(0, diasNoMes - diaAtual)

  const [meta, resultadoProducao, ocorrencias, renovacao] = await Promise.all([
    buscarMetaVigente(mes, ano),
    buscarProducaoMes(inicioMes, fimMes),
    buscarOcorrenciasMes(inicioMes, fimMes),
    buscarRenovacaoMes(hoje, inicioMes, fimMes),
  ])

  const pontuacaoProducao = calcularPontuacaoProducao(resultadoProducao)
  const pontuacaoQualidade = calcularPontuacaoQualidade(ocorrencias)
  const percentualRenovacao = calcularPercentualRenovacao(renovacao)

  const icf = calcularICF(pontuacaoProducao, pontuacaoQualidade, percentualRenovacao)
  const tendencia = await buscarTendenciaICF(mes, ano, icf)

  return {
    mes, ano,
    producao: {
      resultado: resultadoProducao,
      meta,
      percentual: meta > 0 ? Math.round((resultadoProducao / meta) * 1000) / 10 : 0,
      pontuacao: pontuacaoProducao,
      status: classificarProducao(pontuacaoProducao),
      diasRestantes,
      mediaDiariaNecessaria: calcularMediaDiariaNecessaria(resultadoProducao, meta, diasRestantes),
      previsaoFechamento: calcularPrevisaoFechamento(resultadoProducao, diaAtual, diasNoMes),
    },
    qualidade: {
      pontuacao: pontuacaoQualidade,
      ocorrencias: ocorrencias.length,
      status: classificarQualidade(pontuacaoQualidade),
      ultimaOcorrenciaData: ocorrencias[0]?.data ?? null,
    },
    renovacao: {
      ...renovacao,
      percentual: percentualRenovacao,
      status: classificarRenovacao(percentualRenovacao),
    },
    icf,
    classificacao: classificarICF(icf),
    tendencia,
  }
}
