// Job de reconciliação automática de protocolos Safeweb.
// Detecta pedidos presos em VERIFICADO cujo certificado já foi emitido
// na Safeweb mas o webhook "emissao" nunca chegou ao CertFlow.
// Chamado pelo Vercel Cron (GET) ou manualmente via painel ADMIN (POST).

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
function confirmaEmissao(dados: Record<string, unknown>): boolean {
  if (dados.NumeroSerie || dados.numeroSerie)          return true
  if (dados.Emitido === true || dados.emitido === true) return true
  if (dados.DataEmissao  || dados.dataEmissao)         return true
  const status = String(dados.Status ?? dados.status ?? dados.Situacao ?? dados.situacao ?? '')
  return status.toLowerCase().includes('emitid')
}

async function executarReconciliacao(usuarioId?: string) {
  // Protocolos em VERIFICADO há mais de 2h com protocolo Safeweb registrado
  const limiar = subHours(new Date(), 2)

  const pedidos = await prisma.pedido.findMany({
    where: {
      status: 'VERIFICADO',
      safewebProtocolo: { not: null },
      tipoAtendimento: { in: ['videoconferencia', 'presencial', 'emissao-online'] },
      updatedAt: { lt: limiar },
    },
    select: {
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
    },
  })

  const resultados: Array<{
    protocolo: string
    pedido: string
    acao: 'EMITIDO' | 'AGUARDANDO' | 'IGNORADO' | 'ERRO'
    detalhe?: string
  }> = []

  for (const pedido of pedidos) {
    const protocolo = pedido.safewebProtocolo!

    try {
      const consulta = await consultarProtocolo(protocolo)

      if (!consulta.ok) {
        resultados.push({ protocolo, pedido: pedido.numero, acao: 'IGNORADO', detalhe: consulta.erro })
        continue
      }

      if (!confirmaEmissao(consulta.dados ?? {})) {
        resultados.push({ protocolo, pedido: pedido.numero, acao: 'AGUARDANDO', detalhe: 'Safeweb não confirmou emissão' })
        continue
      }

      // Safeweb confirmou emissão — replica a mesma lógica do PATCH /api/pedidos/[id]
      const agora = new Date()

      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          status: 'EMITIDO',
          emitidoEm: agora,
          safewebStatus: 'Emissão confirmada via reconciliação automática',
        } as any,
      })

      // Cria Certificado se ainda não existe (idêntico ao PATCH)
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

      // Cria Lançamento financeiro se ainda não existe (idêntico ao PATCH)
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
            valor:          pedido.valorFinal,
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
          origem: 'reconciliacao-automatica',
          protocolo,
        },
      })

      resultados.push({ protocolo, pedido: pedido.numero, acao: 'EMITIDO', detalhe: 'confirmado via consultarProtocolo' })
    } catch (err) {
      resultados.push({ protocolo, pedido: pedido.numero, acao: 'ERRO', detalhe: String(err) })
    }
  }

  const emitidos  = resultados.filter(r => r.acao === 'EMITIDO').length
  const aguardando = resultados.filter(r => r.acao === 'AGUARDANDO').length
  const erros     = resultados.filter(r => r.acao === 'ERRO').length

  return { total: pedidos.length, emitidos, aguardando, erros, resultados }
}

export async function POST(req: NextRequest) {
  const tokenOk = verificarToken(req)

  let usuarioId: string | undefined
  if (!tokenOk) {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
    usuarioId = session.user.id
  }

  const resultado = await executarReconciliacao(usuarioId)
  return NextResponse.json({ ok: true, ...resultado })
}

// GET para Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req)
}