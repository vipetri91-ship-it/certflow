import { reconciliarEmitidos } from '../reconciliar-emitidos'
import { auditarProdutosSafeweb } from './auditoria-produtos'

export interface ResultadoAuditoriaProfunda {
  achados: string[]
  correcoes: string[]
}

// Rotas que devem exigir x-job-token — se algum dia uma delas parar de
// exigir (regressão), é um achado de segurança real, não ruído.
const ROTAS_PROTEGIDAS = ['relatorio-diario', 'processar-emails', 'processar-whatsapp']

// Conhecido desde 25/06/2026 e aceito como pendência (não corrigido sem
// decisão explícita do Vinicius) — só é mencionado, nunca "corrigido" aqui.
const ROTAS_SEM_PROTECAO_CONHECIDAS = ['relatorio-atividade']

async function smokeTestAutenticacao(): Promise<string[]> {
  const achados: string[] = []
  const baseUrl = process.env.JOB_BASE_URL || 'https://www.vazcertflow.com.br'

  for (const rota of ROTAS_PROTEGIDAS) {
    try {
      const res = await fetch(`${baseUrl}/api/jobs/${rota}`, {
        method: 'POST',
        headers: { 'x-job-token': 'token-invalido-de-teste-do-robo' },
      })
      if (res.status !== 401) {
        achados.push(`SEGURANÇA: /api/jobs/${rota} aceitou um token inválido (HTTP ${res.status}) — verificar autenticação.`)
      }
    } catch (e) {
      achados.push(`Não consegui testar autenticação de /api/jobs/${rota}: ${String(e)}`)
    }
  }

  if (ROTAS_SEM_PROTECAO_CONHECIDAS.length) {
    achados.push(`Pendência conhecida, não corrigida: ${ROTAS_SEM_PROTECAO_CONHECIDAS.join(', ')} ainda sem exigir token — decisão pendente do Vinicius.`)
  }

  return achados
}

export async function executarAuditoriaProfunda(): Promise<ResultadoAuditoriaProfunda> {
  const achados: string[] = []
  const correcoes: string[] = []

  // 1. Reconciliação financeira (certificado/lançamento faltando) — já é uma
  // função de auto-cura existente e aprovada; aqui só relatamos o que ela fez.
  try {
    const r = await reconciliarEmitidos()
    for (const numero of r.certificadosCriados) correcoes.push(`Certificado criado para o pedido ${numero} (estava EMITIDO sem certificado).`)
    for (const numero of r.lancamentosCriados) correcoes.push(`Lançamento financeiro criado para o pedido ${numero} (estava EMITIDO sem lançamento).`)
    for (const erro of r.erros) achados.push(`Reconciliação financeira: ${erro}`)
  } catch (e) {
    achados.push(`Falha ao rodar a reconciliação financeira: ${String(e)}`)
  }

  // 2. Produtos Safeweb — todos os modelos ativos, todos os tipos de
  // atendimento, contra o catálogo real. Só relata — nunca corrige sozinho.
  try {
    const achadosProdutos = await auditarProdutosSafeweb()
    for (const a of achadosProdutos) {
      achados.push(`Produto Safeweb (${a.situacao}): ${a.modelo} / ${a.tipoAtendimento} — ${a.detalhe}`)
    }
  } catch (e) {
    achados.push(`Falha ao auditar produtos Safeweb: ${String(e)}`)
  }

  // 3. Smoke test de autenticação dos jobs.
  try {
    achados.push(...(await smokeTestAutenticacao()))
  } catch (e) {
    achados.push(`Falha ao testar autenticação dos jobs: ${String(e)}`)
  }

  return { achados, correcoes }
}
