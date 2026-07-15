import { reconciliarEmitidos } from '../reconciliar-emitidos'
import { auditarProdutosSafeweb } from './auditoria-produtos'
import { achado, type AchadoRobo } from './tipos'

export interface ResultadoAuditoriaProfunda {
  achados: AchadoRobo[]
  correcoes: string[]
}

// Rotas que devem exigir senha de robô — se algum dia uma delas parar de
// exigir (regressão), é um achado de segurança real, não ruído.
const ROTAS_PROTEGIDAS: { rota: string; nome: string }[] = [
  { rota: 'relatorio-diario', nome: 'relatório diário' },
  { rota: 'processar-emails', nome: 'envio de e-mails de vencimento' },
  { rota: 'processar-whatsapp', nome: 'envio de WhatsApp de vencimento' },
]

// Conhecido desde 25/06/2026 e aceito como pendência (não corrigido sem
// decisão explícita do Vinicius) — só é mencionado, nunca "corrigido" aqui.
const PENDENCIAS_SEGURANCA_CONHECIDAS = ['o relatório de atividade mensal ainda pode ser acionado por qualquer um, sem senha']

async function verificarSenhasDosJobs(): Promise<AchadoRobo[]> {
  const achados: AchadoRobo[] = []
  const baseUrl = process.env.JOB_BASE_URL || 'https://www.vazcertflow.com.br'

  for (const { rota, nome } of ROTAS_PROTEGIDAS) {
    try {
      const res = await fetch(`${baseUrl}/api/jobs/${rota}`, {
        method: 'POST',
        headers: { 'x-job-token': 'senha-errada-de-teste-do-robo' },
      })
      if (res.status !== 401) {
        achados.push(achado(
          `ATENÇÃO, SEGURANÇA: o ${nome} aceitou uma senha errada — deveria ter recusado. Precisa verificar com urgência.`,
          'SEGURANCA_TOKEN', `seguranca:${rota}`
        ))
      }
    } catch (e) {
      achados.push(achado(`Não consegui verificar a senha do ${nome}: ${String(e)}`, 'SEGURANCA_TOKEN', `seguranca:${rota}`))
    }
  }

  for (const pendencia of PENDENCIAS_SEGURANCA_CONHECIDAS) {
    // Pendência já aceita e documentada — não é uma incógnita a investigar.
    achados.push(achado(
      `Lembrete (já sabido, ainda não resolvido): ${pendencia} — esperando você decidir o que fazer.`,
      'SEGURANCA_TOKEN', 'seguranca:pendencia-conhecida', { investigavel: false }
    ))
  }

  return achados
}

export async function executarAuditoriaProfunda(): Promise<ResultadoAuditoriaProfunda> {
  const achados: AchadoRobo[] = []
  const correcoes: string[] = []

  // 1. Reconciliação financeira (certificado/lançamento faltando) — já é uma
  // função de auto-cura existente e aprovada; aqui só relatamos o que ela fez.
  try {
    const r = await reconciliarEmitidos()
    for (const numero of r.certificadosCriados) correcoes.push(`O pedido ${numero} tinha sido emitido mas o certificado não foi registrado — já corrigi.`)
    for (const numero of r.lancamentosCriados) correcoes.push(`O pedido ${numero} tinha sido emitido mas faltava a cobrança no financeiro — já criei.`)
    for (const erro of r.erros) {
      const numero = erro.split(':')[0]?.trim() || 'excecao'
      achados.push(achado(`Não consegui corrigir um problema financeiro: ${erro}`, 'FINANCEIRO_RECONCILIACAO', `financeiro:${numero}`))
    }
  } catch (e) {
    achados.push(achado(`Não consegui checar se as cobranças e certificados estão todos certos: ${String(e)}`, 'FINANCEIRO_RECONCILIACAO', 'financeiro:excecao'))
  }

  // 2. Produtos Safeweb — todos os modelos ativos, todos os tipos de
  // atendimento, contra o catálogo real. Só relata — nunca corrige sozinho.
  try {
    const achadosProdutos = await auditarProdutosSafeweb()

    // Agrupa por modelo+situacao para não repetir a mesma mensagem 3x quando
    // todos os tipos de atendimento do mesmo modelo estão com o mesmo problema.
    const grupos = new Map<string, { modelo: string; situacao: string; detalhe: string; tipos: string[] }>()
    for (const a of achadosProdutos) {
      const chave = `${a.modelo}||${a.situacao}`
      const existente = grupos.get(chave)
      if (existente) {
        existente.tipos.push(a.tipoAtendimento)
      } else {
        const situacao = a.situacao === 'ambiguo' ? 'risco de produto errado' : 'sem produto cadastrado'
        grupos.set(chave, { modelo: a.modelo, situacao, detalhe: a.detalhe, tipos: [a.tipoAtendimento] })
      }
    }

    for (const [, g] of grupos) {
      const todosTipos = ['presencial', 'videoconferência', 'online']
      const todosAusentes = todosTipos.every(t => g.tipos.includes(t))
      const atendimentos = todosAusentes ? 'todos os tipos de atendimento' : g.tipos.join(', ')
      achados.push(achado(
        `Certificado "${g.modelo}" (${g.situacao}, ${atendimentos}): ${g.detalhe}`,
        'SAFEWEB_CATALOGO', `safeweb:${g.modelo}|${g.situacao}`
      ))
    }
  } catch (e) {
    achados.push(achado(`Não consegui revisar os certificados contra o cadastro da Safeweb: ${String(e)}`, 'SAFEWEB_CATALOGO', 'safeweb:excecao'))
  }

  // 3. Confirma que os jobs continuam exigindo a senha de robô.
  try {
    achados.push(...(await verificarSenhasDosJobs()))
  } catch (e) {
    achados.push(achado(`Não consegui verificar a segurança dos jobs automáticos: ${String(e)}`, 'SEGURANCA_TOKEN', 'seguranca:excecao'))
  }

  return { achados, correcoes }
}
