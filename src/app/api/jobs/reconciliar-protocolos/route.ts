// Job de reconciliação de protocolos Safeweb.
// Detecta pedidos presos em VERIFICADO cujo certificado já foi emitido
// na Safeweb mas o webhook "emissao" nunca chegou ao CertFlow.
//
// Modos:
//   - Cron (GET, token AUTH_SECRET): processa todos os VERIFICADO há mais de 2h
//   - ADMIN batch (POST sem pedidoId): mesmo comportamento do cron
//   - Por pedido (POST com pedidoId, qualquer usuário logado): processa imediatamente,
//     sem filtro de tempo — usado pelo botão "Verificar Safeweb" em cada linha

export const preferredRegion = 'gru1'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { registrarAuditoria } from '@/lib/audit'
import { consultarProtocolo } from '@/lib/safeweb'
import { subHours } from 'date-fns'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token') ?? req.nextUrl.searchParams.get('token')
  return !!token && token === process.env.AUTH_SECRET
}

// Campos da resposta da Safeweb que indicam emissão confirmada.
// O endpoint /api/solicitacao/{protocolo} não está na documentação oficial —
// verificamos qualquer campo semântico que sugira o certificado foi emitido.
export function confirmaEmissao(dados: Record<string, unknown>): boolean {
  if (dados.NumeroSerie || dados.numeroSerie)           return true
  if (dados.Emitido === true || dados.emitido === true) return true
  if (dados.DataEmissao  || dados.dataEmissao)          return true
  const status = String(dados.Status ?? dados.status ?? dados.Situacao ?? dados.situacao ?? '')
  return status.toLowerCase().includes('emitid')
}

async function processarPedido(
  pedido: {
    id: string
    numero: string
    clienteId: string
    parceiroId: string | null
    safewebProtocolo: string | null
    numeroCompra: string | null
    valorFinal: unknown
    formaPagamento: string | null
    itens: Array<{ modeloId: string; modelo: { validadeMeses: number } }>
  },
  usuarioId: string | undefined,
  origem: string,
) {
  const protocolo = pedido.safewebProtocolo!

  const consulta = await consultarProtocolo(protocolo)

  if (!consulta.ok) {
    return { protocolo, pedido: pedido.numero, acao: 'IGNORADO' as const, detalhe: consulta.erro }
  }

  if (!confirmaEmissao(consulta.dados ?? {})) {
    return { protocolo, pedido: pedido.numero, acao: 'AGUARDANDO' as const, detalhe: 'Safeweb ainda não confirmou a emissão' }
  }

  // Safeweb confirmou emissão — replica a mesma lógica do PATCH /api/pedidos/[id]
  const agora = new Date()

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      status: 'EMITIDO',
      emitidoEm: agora,
      safewebStatus: `Emissão confirmada via ${origem}`,
    } as any,
  })

  const certExistente = await prisma.certificado.findFirst({ where: { pedidoId: pedido.id } })
  if (!certExistente && pedido.itens[0]) {
    const item = pedido.itens[0]
    const dataVencimento = new Date(agora)
    dataVencimento.setMonth(dataVencimento.getMonth() + item.modelo.validadeMeses)
    await prisma.certificado.create({
      data: {
        clienteId:     pedido.clienteId,
        modeloId:      item.modeloId,
        pedidoId:      pedido.id,
        dataEmissao:   agora,
        dataVencimento,
        status:        'ATIVO',
        numeroSerie:   pedido.numeroCompra ?? undefined,
      },
    })
  }

  const lancExistente = await prisma.lancamento.findFirst({ where: { pedidoId: pedido.id } })
  if (!lancExistente) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: pedido.clienteId },
      select: { nome: true },
    })
    await prisma.lancamento.create({
      data: {
        tipo:           'RECEBER',
        descricao:      `${cliente?.nome ?? 'Cliente'} — Pedido ${pedido.numero}`,
        valor:          pedido.valorFinal as any,
        dataVencimento: agora,
        status:         'PENDENTE',
        pedidoId:       pedido.id,
        tipoConta:      'Certificado',
        referencia:     pedido.numero,
        formaPagamento: pedido.formaPagamento ?? undefined,
        ...(pedido.parceiroId ? { parceiroId: pedido.parceiroId } : {}),
      },
    })
  }

  await registrarAuditoria({
    usuarioId,
    acao: 'UPDATE',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    dados: {
      numero: pedido.numero,
      'Status (antes)': 'VERIFICADO',
      'Status (depois)': 'EMITIDO',
      origem,
      protocolo,
    },
  })

  return { protocolo, pedido: pedido.numero, acao: 'EMITIDO' as const, detalhe: 'confirmado via consultarProtocolo' }
}

const PEDIDO_SELECT = {
  id: true,
  numero: true,
  clienteId: true,
  parceiroId: true,
  safewebProtocolo: true,
  numeroCompra: true,
  valorFinal: true,
  formaPagamento: true,
  itens: {
    select: {
      modeloId: true,
      modelo: { select: { validadeMeses: true } },
    },
  },
} as const

async function executarReconciliacaoLote(usuarioId?: string) {
  const limiar = subHours(new Date(), 2)
  const pedidos = await prisma.pedido.findMany({
    where: {
      status: 'VERIFICADO',
      safewebProtocolo: { not: null },
      tipoAtendimento: { in: ['videoconferencia', 'presencial', 'emissao-online'] },
      updatedAt: { lt: limiar },
    },
    select: PEDIDO_SELECT,
  })

  const resultados = []
  for (const pedido of pedidos) {
    try {
      resultados.push(await processarPedido(pedido, usuarioId, 'reconciliacao-automatica'))
    } catch (err) {
      resultados.push({ protocolo: pedido.safewebProtocolo!, pedido: pedido.numero, acao: 'ERRO' as const, detalhe: String(err) })
    }
  }

  return {
    total:     pedidos.length,
    emitidos:  resultados.filter(r => r.acao === 'EMITIDO').length,
    aguardando: resultados.filter(r => r.acao === 'AGUARDANDO').length,
    erros:     resultados.filter(r => r.acao === 'ERRO').length,
    resultados,
  }
}

async function executarReconciliacaoPorPedido(pedidoId: string, usuarioId?: string) {
  const pedido = await prisma.pedido.findFirst({
    where: {
      id: pedidoId,
      status: 'VERIFICADO',
      safewebProtocolo: { not: null },
    },
    select: PEDIDO_SELECT,
  })

  if (!pedido) {
    return { total: 0, emitidos: 0, aguardando: 0, erros: 0, resultados: [] }
  }

  try {
    const resultado = await processarPedido(pedido, usuarioId, 'verificacao-manual')
    const emitidos   = resultado.acao === 'EMITIDO'    ? 1 : 0
    const aguardando = resultado.acao === 'AGUARDANDO' ? 1 : 0
    return { total: 1, emitidos, aguardando, erros: 0, resultados: [resultado] }
  } catch (err) {
    const r = { protocolo: pedido.safewebProtocolo!, pedido: pedido.numero, acao: 'ERRO' as const, detalhe: String(err) }
    return { total: 1, emitidos: 0, aguardando: 0, erros: 1, resultados: [r] }
  }
}

export async function POST(req: NextRequest) {
  const tokenOk = verificarToken(req)

  let body: { pedidoId?: string } = {}
  try { body = await req.json() } catch { /* sem body */ }

  const { pedidoId } = body

  let usuarioId: string | undefined

  if (!tokenOk) {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
    // Qualquer usuário logado pode disparar a reconciliação —
    // a operação só lê da Safeweb e avança pedidos genuinamente emitidos.
    usuarioId = session.user.id
  }

  const resultado = pedidoId
    ? await executarReconciliacaoPorPedido(pedidoId, usuarioId)
    : await executarReconciliacaoLote(usuarioId)

  return NextResponse.json({ ok: true, ...resultado })
}

// GET para Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req)
}