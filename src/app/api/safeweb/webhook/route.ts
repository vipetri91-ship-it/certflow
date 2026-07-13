export const preferredRegion = 'gru1' // São Paulo — IP brasileiro para a Safeweb

// Webhook da Safeweb — recebe notificações automáticas sobre o ciclo de vida dos protocolos.
// Configurado via tag "UrlSolicitacao" em cada requisição POST à API Safeweb.
//
// REGRA DE NEGÓCIO (não há fluxo manual alternativo): quando a Safeweb confirma a
// emissão (transmissão do certificado + termo de titularidade), o pedido tem que
// virar EMITIDO, ganhar Certificado e Lançamento financeiro automaticamente, sem
// qualquer clique do AGR. Por isso a escrita roda em transação atômica (tudo ou
// nada) com retentativas — uma falha parcial deixaria o popup "certificado
// emitido" aparecer sem o certificado/lançamento existir de fato.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { enviarWhatsApp } from '@/lib/digisac'
import { transporte } from '@/lib/email/transporte'
import { enviarTelegram } from '@/lib/telegram'
import { enviarEmail } from '@/lib/email/enviar'
import { templatePosEmissao } from '@/lib/email/templates'

// Alerta crítico em três canais independentes (WhatsApp, e-mail, Telegram).
// Em 17/06/2026 descobrimos que dois dos três podem estar fora do ar ao
// mesmo tempo sem aviso nenhum: api.digisac.com.br não resolve (DNS, falha
// do lado do Digisac) e o Railway bloqueia as portas SMTP de saída (e-mail
// via Brevo dá timeout). Telegram usa HTTPS/443, não sujeito a esse
// bloqueio — por isso entra como terceira via independente.
async function alertarFalhaCritica(mensagem: string) {
  await Promise.allSettled([
    enviarWhatsApp({ telefone: process.env.BOT_ADMIN_NUMERO ?? '11943156015', mensagem }),
    transporte.sendMail({
      from: process.env.SMTP_FROM,
      to: 'vipetri91@gmail.com',
      subject: '🚨 FALHA CRÍTICA — CertFlow (emissão de certificado)',
      text: mensagem,
    }),
    enviarTelegram(mensagem),
  ])
}

async function comRetentativas<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
  let ultimoErro: unknown
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn()
    } catch (e) {
      ultimoErro = e
      if (i < tentativas - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw ultimoErro
}

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
//
// Regra de negócio (13/07/2026): o monitoramento interno finaliza o protocolo
// no momento em que a V&G confirma a identidade do cliente — não quando o cliente
// instala o certificado. Por isso:
// - Confirmação de Cadastro (Aprovado) → EMITIDO  (vídeo: fim da videoconferência)
// - Validação                          → EMITIDO  (presencial: AGR validou documentos)
// - Verificação (Aprovado)             → EMITIDO  (ACI aprovada: identidade confirmada)
// - Emissão                            → EMITIDO  (Add/5 online — evento de emissão direta)
// O evento "Emissão" real (instalação pelo cliente) é irrelevante para o monitoramento.
function eventoParaStatus(evento: string, acao?: string): string | null {
  const ev = normalizar(evento)
  const aprovado = !acao || normalizar(acao).startsWith('aprovad')

  if (ev.includes('emissao'))                                  return 'EMITIDO'
  if (ev.includes('cancelamento') || ev.includes('revogacao')) return 'CANCELADO'
  if ((ev.includes('confirmacao') || ev.includes('verificacao')) && aprovado) return 'EMITIDO'
  if (ev.includes('validacao'))                                return 'EMITIDO'

  return null  // Solicitação e demais eventos informativos — sem mudança de status
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

  // Salva o evento bruto antes de qualquer processamento para não perder o histórico
  // mesmo se o pedido não for encontrado ou o processamento falhar.
  const eventoLog = await prisma.eventoWebhook.create({
    data: {
      evento,
      acao:        acao ?? null,
      protocolo,
      motivoRecusa: motivoRecusa ?? null,
      payload:     payload as object,
    },
  }).catch(() => null) // Falha no log não deve interromper o processamento principal

  const pedido = await prisma.pedido.findFirst({
    where: { OR: [{ numeroCompra: protocolo }, { safewebProtocolo: protocolo } as any] },
    select: {
      id:             true,
      numero:         true,
      status:         true,
      agr:            true,
      clienteId:      true,
      parceiroId:     true,
      numeroCompra:   true,
      valorFinal:     true,
      formaPagamento: true,
      itens: {
        select: {
          modeloId: true,
          modelo:   { select: { validadeMeses: true, tipoCertificado: true } },
        },
      },
      cliente: { select: { nome: true, email: true } },
    },
  })

  if (!pedido) {
    console.warn(`[Safeweb Webhook] Protocolo ${protocolo} não encontrado no CertFlow`)
    return NextResponse.json({ ok: true, aviso: 'Protocolo não encontrado' })
  }

  // Complementa o log com os dados do pedido agora que o encontramos
  if (eventoLog) {
    prisma.eventoWebhook.update({
      where: { id: eventoLog.id },
      data: {
        pedidoId:    pedido.id,
        numeroPedido: pedido.numero,
        clienteNome: pedido.cliente.nome,
        agr:         pedido.agr ?? null,
        statusAntes: pedido.status,
      },
    }).catch(() => null)
  }

  const statusEvento = motivoRecusa
    ? `${evento}: ${motivoRecusa}`
    : acao ? `${evento} (${acao})` : evento

  // Mapeamento de eventos por tipo de emissão (documentação oficial Safeweb — auditado 03/07/2026):
  // - Add/1 (presencial):       Solicitação → Validação → Emissão
  // - Add/3 (videoconferência): Solicitação → Confirmação de Cadastro → [Verificação se ACI] → Emissão
  // - Add/5 (online, A1):       Solicitação → Emissão
  //
  // "validacao" é evento presencial ("no momento da validação presencial" — docs Safeweb).
  // "Confirmação de Cadastro" é evento de videoconferência ("no final da video conferência").
  // Para A1 via Add/5, o evento de emissão é "emissao" — igual A3. Nenhuma exceção por tipoCertificado.
  const novoStatus = eventoParaStatus(evento, acao)

  if (novoStatus && novoStatus !== pedido.status) {
    const agora = new Date()

    if (novoStatus === 'EMITIDO') {
      try {
        await comRetentativas(() => prisma.$transaction(async (tx) => {
          await tx.pedido.update({
            where: { id: pedido.id },
            data: {
              safewebStatus:          statusEvento,
              status:                 'EMITIDO',
              emitidoEm:              agora,
              popupNotificacaoVisto:  false, // garante que o popup dispara para o AGR
            } as any,
          })

          // Cria o certificado sem datas (dataEmissao e dataVencimento ficam nulos).
          // Isso sinaliza que o atendimento foi feito mas o cliente ainda não instalou.
          // As datas serão preenchidas quando o evento "Emissão" chegar (cliente instalou),
          // garantindo que o controle de vencimentos use a data real de instalação.
          // Exceção: se o gatilho for o próprio evento "Emissão" (Add/5 online),
          // as datas já são preenchidas agora pois a instalação é imediata.
          const eventoEhEmissao = normalizar(evento).includes('emissao')
          const certExistente = await tx.certificado.findFirst({ where: { pedidoId: pedido.id } })
          if (!certExistente && pedido.itens[0]) {
            const item = pedido.itens[0]
            const dataVencimento = eventoEhEmissao ? (() => { const d = new Date(agora); d.setMonth(d.getMonth() + item.modelo.validadeMeses); return d })() : null
            await tx.certificado.create({
              data: {
                clienteId:     pedido.clienteId,
                modeloId:      item.modeloId,
                pedidoId:      pedido.id,
                dataEmissao:   eventoEhEmissao ? agora : null,
                dataVencimento,
                status:        'ATIVO',
                numeroSerie:   pedido.numeroCompra ?? undefined,
              },
            })
          }

          const isBonificado  = Number(pedido.valorFinal) === 0
          const lancExistente = await tx.lancamento.findFirst({ where: { pedidoId: pedido.id } })
          if (!lancExistente) {
            await tx.lancamento.create({
              data: {
                tipo:           'RECEBER',
                descricao:      `${pedido.cliente.nome} — Pedido ${pedido.numero}`,
                valor:          pedido.valorFinal as any,
                dataVencimento: agora,
                status:         isBonificado ? 'PAGO' : 'PENDENTE',
                pedidoId:       pedido.id,
                tipoConta:      'Certificado',
                referencia:     pedido.numero,
                formaPagamento: isBonificado ? 'Bonificado' : (pedido.formaPagamento ?? undefined),
                bonificado:     isBonificado,
                ...(pedido.parceiroId ? { parceiroId: pedido.parceiroId } : {}),
              },
            })
          }
        }))

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

        console.log(`[Safeweb Webhook] ${pedido.numero} ${pedido.status} → EMITIDO (${evento})`)

        // E-mail automático pós-emissão — disparo imediato, sem aguardar o job diário
        if (pedido.cliente?.email) {
          const modeloNome = pedido.itens[0] ? (pedido.itens[0] as any).modelo?.nome ?? 'Certificado Digital' : 'Certificado Digital'
          const { assunto, html } = templatePosEmissao({
            nomeCliente:       pedido.cliente.nome,
            modeloCertificado: modeloNome,
            protocolo:         pedido.numeroCompra ?? protocolo,
          })
          // Busca o certificado recém-criado para registrar no EmailLog
          const certNovo = await prisma.certificado.findFirst({ where: { pedidoId: pedido.id } })
          enviarEmail({
            clienteId:     pedido.clienteId,
            certificadoId: certNovo?.id,
            tipo:          'POS_EMISSAO',
            destinatario:  pedido.cliente.email,
            assunto,
            html,
          }).catch(err => console.error('[Webhook] falha ao enviar e-mail pós-emissão:', err))
        }
      } catch (e) {
        // As 3 tentativas falharam — nada foi gravado (transação atômica), então
        // o pedido permanece no status anterior. Isso é crítico: a Safeweb já
        // emitiu o certificado de verdade, mas o CertFlow não registrou nada.
        // Precisa de intervenção humana imediata, não em 30 minutos.
        const msg = `Pedido ${pedido.numero} (${pedido.cliente.nome}) foi EMITIDO na Safeweb mas o CertFlow falhou ao gravar após 3 tentativas: ${(e as Error).message}`
        console.error(`[Webhook Safeweb] CRÍTICO: ${msg}`)

        await registrarAuditoria({
          acao:       'UPDATE',
          entidade:   'Pedido',
          entidadeId: pedido.id,
          dados: { numero: pedido.numero, erro: msg, origem: 'webhook-safeweb-falha-critica', protocolo, evento },
        })

        await alertarFalhaCritica(
          `🚨 FALHA CRÍTICA — CertFlow\n\nPedido ${pedido.numero} (${pedido.cliente.nome}) foi EMITIDO pela Safeweb (protocolo ${protocolo}) mas o sistema NÃO conseguiu gravar certificado/lançamento após 3 tentativas.\n\nVerifique manualmente o quanto antes.`,
        )

        return NextResponse.json({ ok: false, erro: 'Falha crítica ao processar emissão' }, { status: 500 })
      }
    } else if (novoStatus === 'CANCELADO') {
      await prisma.pedido.update({
        where: { id: pedido.id },
        data:  { safewebStatus: statusEvento, status: 'CANCELADO' } as any,
      })
      console.log(`[Safeweb Webhook] ${pedido.numero} ${pedido.status} → CANCELADO (${evento})`)
    }
  } else if (novoStatus === 'EMITIDO' && pedido.status === 'EMITIDO') {
    // Pedido já em Finalizados — evento "Emissão" chegou (cliente instalou).
    // Cria ou atualiza o certificado com a data real de instalação.
    // O pedido não muda de status.
    if (pedido.itens[0]) {
      const agora = new Date()
      const item = pedido.itens[0]
      const dataVencimento = new Date(agora)
      dataVencimento.setMonth(dataVencimento.getMonth() + item.modelo.validadeMeses)
      const certExistente = await prisma.certificado.findFirst({ where: { pedidoId: pedido.id } })
      if (certExistente) {
        await prisma.certificado.update({
          where: { id: certExistente.id },
          data:  { dataEmissao: agora, dataVencimento },
        })
      } else {
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
      console.log(`[Safeweb Webhook] ${pedido.numero}: certificado com data real de instalação — vence ${dataVencimento.toLocaleDateString('pt-BR')}`)
    }
    await prisma.pedido.update({
      where: { id: pedido.id },
      data:  { safewebStatus: statusEvento } as any,
    })
  } else {
    // Evento informativo ou recusa — registra sem mudar status
    await prisma.pedido.update({
      where: { id: pedido.id },
      data:  { safewebStatus: statusEvento } as any,
    })
  }

  // Registra o status final do processamento no log do evento
  if (eventoLog && novoStatus) {
    prisma.eventoWebhook.update({
      where: { id: eventoLog.id },
      data:  { statusDepois: novoStatus },
    }).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}

// GET para verificar se o webhook está ativo (útil para diagnóstico)
export async function GET() {
  return NextResponse.json({ ok: true, servico: 'Safeweb Webhook CertFlow', ativo: true })
}
