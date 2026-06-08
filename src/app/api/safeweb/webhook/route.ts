export const preferredRegion = 'gru1' // São Paulo — IP brasileiro para a Safeweb

// Webhook da Safeweb — recebe notificações automáticas sobre o ciclo de vida dos protocolos
// Configurado via tag "UrlSolicitacao" em cada requisição POST à API Safeweb
// Para configuração global (todos os protocolos), abrir chamado na AC Safeweb

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// A Safeweb envia o nome do evento com grafias inconsistentes — confirmado na
// documentação oficial de Notifica Eventos (acentos e maiúsculas variam conforme
// o tipo, ex.: "emissao", "Cancelamento", "Confirmação de Cadastro", "Solicitação").
// Por isso comparamos a versão normalizada (sem acento, minúscula) em vez de um enum fixo.
interface PayloadWebhook {
  evento:        string  // nome do evento, grafia variável — normalizar antes de comparar
  protocolo:     string  // número do protocolo Safeweb
  acao?:         string  // presente em Verificação/Confirmação de Cadastro: "aprovado" | "Reprovado" etc.
  motivoRecusa?: string
  [key: string]: unknown
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Mapeamento de evento Safeweb → status no CertFlow.
// Verificação e Confirmação de Cadastro trazem um campo "acao" (aprovado/recusado) —
// só avançam o status quando aprovados; quando recusados mantemos o status atual e
// apenas registramos o motivo em safewebStatus para o time acompanhar.
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

  // Busca o pedido pelo número do protocolo — aceita tanto numeroCompra quanto
  // safewebProtocolo, pois nem todo pedido antigo teve os dois campos sincronizados
  const pedido = await prisma.pedido.findFirst({
    where: { OR: [{ numeroCompra: protocolo }, { safewebProtocolo: protocolo } as any] },
    select: { id: true, status: true, clienteId: true },
  })

  if (!pedido) {
    // Protocolo não encontrado — retorna 200 para não acumular na fila Safeweb
    console.warn(`[Safeweb Webhook] Protocolo ${protocolo} não encontrado no CertFlow`)
    return NextResponse.json({ ok: true, aviso: 'Protocolo não encontrado' })
  }

  // Texto registrado em safewebStatus — inclui motivo quando o evento foi recusado/rejeitado
  const statusEvento = motivoRecusa ? `${evento}: ${motivoRecusa}` : (acao ? `${evento} (${acao})` : evento)

  // Atualiza status do pedido conforme o evento
  const novoStatus = eventoParaStatus(evento, acao)

  if (novoStatus && novoStatus !== pedido.status) {
    const atualizacao: Record<string, unknown> = {
      safewebStatus: statusEvento,
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
    // Evento informativo, ou recusa que não avança o status — só registra para acompanhamento
    await prisma.pedido.update({
      where: { id: pedido.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { safewebStatus: statusEvento } as any,
    })
  }

  return NextResponse.json({ ok: true })
}

// GET para verificar se o webhook está ativo (útil para diagnóstico)
export async function GET() {
  return NextResponse.json({ ok: true, servico: 'Safeweb Webhook CertFlow', ativo: true })
}
