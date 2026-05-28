// Webhook da Safeweb — recebe notificações automáticas sobre o ciclo de vida dos protocolos
// Configurado via tag "UrlSolicitacao" em cada requisição POST à API Safeweb
// Para configuração global (todos os protocolos), abrir chamado na AC Safeweb

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Eventos possíveis enviados pela Safeweb
// TODO: confirmar payload exato com a documentação de Notifica Eventos
type EventoSafeweb =
  | 'Emissao'
  | 'Solicitacao'
  | 'Validacao'
  | 'Verificacao'
  | 'Cancelamento'
  | 'Revogacao'
  | 'Pagamento'
  | 'ConfirmacaoCadastro'
  | 'SolicitacaoPeriodoUso'
  | 'CertificadoPeriodoUso'
  | 'ValidacaoAutonoma'
  | 'CancelamentoSolicitacao'

interface PayloadWebhook {
  evento:    EventoSafeweb
  protocolo: string          // número do protocolo Safeweb
  // TODO: confirmar demais campos retornados pela Safeweb
  [key: string]: unknown
}

// Mapeamento de evento Safeweb → status no CertFlow
function eventoParaStatus(evento: EventoSafeweb): string | null {
  switch (evento) {
    case 'Solicitacao':           return 'GERADO'
    case 'ConfirmacaoCadastro':   return 'VERIFICADO'
    case 'Validacao':             return 'VERIFICADO'
    case 'Verificacao':           return 'VERIFICADO'
    case 'Emissao':               return 'EMITIDO'
    case 'Cancelamento':          return 'CANCELADO'
    case 'CancelamentoSolicitacao': return 'CANCELADO'
    default:                      return null  // eventos informativos, sem mudança de status
  }
}

export async function POST(req: NextRequest) {
  let payload: PayloadWebhook

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  const { evento, protocolo } = payload

  if (!protocolo) {
    return NextResponse.json({ erro: 'Protocolo não informado' }, { status: 400 })
  }

  // Busca o pedido pelo número do protocolo (campo numeroCompra)
  const pedido = await prisma.pedido.findFirst({
    where: { numeroCompra: protocolo },
    select: { id: true, status: true, clienteId: true },
  })

  if (!pedido) {
    // Protocolo não encontrado — retorna 200 para não acumular na fila Safeweb
    console.warn(`[Safeweb Webhook] Protocolo ${protocolo} não encontrado no CertFlow`)
    return NextResponse.json({ ok: true, aviso: 'Protocolo não encontrado' })
  }

  // Atualiza status do pedido conforme o evento
  const novoStatus = eventoParaStatus(evento)

  if (novoStatus && novoStatus !== pedido.status) {
    const atualizacao: Record<string, unknown> = {
      safewebStatus: evento,
    }

    if (novoStatus === 'EMITIDO') {
      atualizacao.status    = 'EMITIDO'
      atualizacao.emitidoEm = new Date()
    } else if (novoStatus === 'VERIFICADO') {
      atualizacao.status      = 'VERIFICADO'
      atualizacao.verificadoEm = new Date()
    } else if (novoStatus === 'CANCELADO') {
      atualizacao.status = 'CANCELADO'
    }

    await prisma.pedido.update({
      where: { id: pedido.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  atualizacao as any,
    })

    console.log(`[Safeweb Webhook] Pedido ${pedido.id} atualizado: ${pedido.status} → ${novoStatus} (evento: ${evento})`)
  } else {
    // Evento informativo — só registra o status Safeweb
    await prisma.pedido.update({
      where: { id: pedido.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { safewebStatus: evento } as any,
    })
  }

  return NextResponse.json({ ok: true })
}

// GET para verificar se o webhook está ativo (útil para diagnóstico)
export async function GET() {
  return NextResponse.json({ ok: true, servico: 'Safeweb Webhook CertFlow', ativo: true })
}
