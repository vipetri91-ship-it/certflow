export const preferredRegion = 'gru1' // São Paulo — IP brasileiro para a Safeweb

// Webhook da Safeweb — recebe notificações automáticas sobre o ciclo de vida dos protocolos.
// Configurado via tag "UrlSolicitacao" em cada requisição POST à API Safeweb.
// Além de atualizar o status, cria Certificado e Lançamento financeiro quando o evento
// é "emissao" — garantindo que o fluxo seja idêntico ao do botão manual "Finalizar".

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'

// A Safeweb envia o nome do evento com grafias inconsistentes — confirmado na
// documentação oficial de Notifica Eventos (acentos e maiúsculas variam conforme
// o tipo, ex.: "emissao", "Cancelamento", "Confirmação de Cadastro", "Solicitação").
// Por isso comparamos a versão normalizada (sem acento, minúscula) em vez de um enum fixo.
interface PayloadWebhook {
  evento:        string
  protocolo:     string
  acao?:         string  // presente em Verificação/Confirmação de Cadastro: "aprovado" | "Reprovado" etc.
  motivoRecusa?: string
  [key: string]: unknown
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Mapeamento de evento Safeweb → status no CertFlow.
function eventoParaStatus(evento: string, acao?: string): string | null {
  const ev = normalizar(evento)
  const aprovado = !acao || normalizar(acao).startsWith('aprovad')

  if (ev.includes('emissao'))                                  return 'EMITIDO'
  if (ev.includes('cancelamento') || ev.includes('revogacao')) return 'CANCELADO'
  if (ev.includes('verificacao') || ev.includes('confirmacao'))
    return aprovado ? 'VERIFICADO' : null

  return null  // Solicitação, Validação e demais eventos informativos — sem mudança de status
}

export async function POST(req: NextRequest) {
  let payload: PayloadWebhook

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  const { evento, protocolo, acao, motivoRecusa } = payload

  if (!protocolo) {
    return NextResponse.json({ erro: 'Protocolo não informado' }, { status: 400 })
  }

  const pedido = await prisma.pedido.findFirst({
    where: { OR: [{ numeroCompra: protocolo }, { safewebProtocolo: protocolo } as any] },
    select: {
      id:             true,
      numero:         true,
      status:         true,
      clienteId:      true,
      parceiroId:     true,
      numeroCompra:   true,
      valorFinal:     true,
      formaPagamento: true,
      itens: {
        select: {
          modeloId: true,
          modelo:   { select: { validadeMeses: true } },
        },
      },
      cliente: { select: { nome: true } },
    },
  })

  if (!pedido) {
    // Protocolo não encontrado — retorna 200 para não acumular na fila Safeweb
    console.warn(`[Safeweb Webhook] Protocolo ${protocolo} não encontrado no CertFlow`)
    return NextResponse.json({ ok: true, aviso: 'Protocolo não encontrado' })
  }

  const statusEvento = motivoRecusa
    ? `${evento}: ${motivoRecusa}`
    : acao ? `${evento} (${acao})` : evento

  const novoStatus = eventoParaStatus(evento, acao)

  if (novoStatus && novoStatus !== pedido.status) {
    const agora = new Date()
    const atualizacao: Record<string, unknown> = { safewebStatus: statusEvento }

    if (novoStatus === 'EMITIDO') {
      atualizacao.status               = 'EMITIDO'
      atualizacao.emitidoEm            = agora
      atualizacao.popupNotificacaoVisto = false // garante que o popup dispara para o AGR
    } else if (novoStatus === 'VERIFICADO') {
      atualizacao.status       = 'VERIFICADO'
      atualizacao.verificadoEm = agora
    } else if (novoStatus === 'CANCELADO') {
      atualizacao.status = 'CANCELADO'
    }

    await prisma.pedido.update({
      where: { id: pedido.id },
      data:  atualizacao as any,
    })

    // Quando emitido: cria Certificado e Lançamento financeiro,
    // replicando a mesma lógica do PATCH /api/pedidos/[id] (botão "Finalizar").
    if (novoStatus === 'EMITIDO') {
      try {
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
      } catch (e) {
        // Não bloqueia o webhook. O cron de reconciliação (30 min) vai criar o certificado.
        console.error(`[Webhook Safeweb] ${pedido.numero}: falha ao criar certificado:`, (e as Error).message)
      }

      try {
        const valorNumerico = Number(pedido.valorFinal)
        const lancExistente = await prisma.lancamento.findFirst({ where: { pedidoId: pedido.id } })
        if (!lancExistente && valorNumerico > 0) {
          await prisma.lancamento.create({
            data: {
              tipo:           'RECEBER',
              descricao:      `${pedido.cliente.nome} — Pedido ${pedido.numero}`,
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
      } catch (e) {
        // Não bloqueia o webhook. O cron de reconciliação vai criar o lançamento.
        console.error(`[Webhook Safeweb] ${pedido.numero}: falha ao criar lançamento:`, (e as Error).message)
      }

      await registrarAuditoria({
        acao:       'UPDATE',
        entidade:   'Pedido',
        entidadeId: pedido.id,
        dados: {
          numero:            pedido.numero,
          'Status (antes)':  pedido.status,
          'Status (depois)': 'EMITIDO',
          origem:            'webhook-safeweb',
          evento,
          protocolo,
        },
      })
    }

    console.log(`[Safeweb Webhook] ${pedido.numero} ${pedido.status} → ${novoStatus} (${evento})`)
  } else {
    // Evento informativo ou recusa — registra sem mudar status
    await prisma.pedido.update({
      where: { id: pedido.id },
      data:  { safewebStatus: statusEvento } as any,
    })
  }

  return NextResponse.json({ ok: true })
}

// GET para verificar se o webhook está ativo (útil para diagnóstico)
export async function GET() {
  return NextResponse.json({ ok: true, servico: 'Safeweb Webhook CertFlow', ativo: true })
}
