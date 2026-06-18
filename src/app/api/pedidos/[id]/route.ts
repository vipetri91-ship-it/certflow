import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaUpdate = z.object({
  status: z.enum(['GERADO', 'VERIFICADO', 'EMITIDO', 'CANCELADO']).optional(),
  agr: z.string().optional(),
  tipoAtendimento: z.string().optional(),
  numeroCompra: z.string().optional(),
  voucher: z.string().optional(),
  boletoUrl: z.string().optional(),
  boletoCodigo: z.string().optional(),
  boletoVencimento: z.string().optional(),
  observacoes: z.string().optional(),
  formaPagamento: z.string().optional(),
  popupNotificacaoVisto: z.boolean().optional(),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: { select: { id: true, nome: true } },
      usuario: { select: { nome: true } },
      itens: { include: { modelo: true } },
      lancamentos: true,
      certificados: { include: { modelo: { select: { nome: true } } } },
    },
  })

  if (!pedido) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const antigo = await prisma.pedido.findUnique({ where: { id } })
  if (!antigo) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  // Cancelamento passa pelo fluxo dedicado (validação de motivo, integração
  // Safeweb e auditoria) — ver POST /api/pedidos/[id]/cancelar
  if (parsed.data.status === 'CANCELADO') {
    return NextResponse.json(
      { erro: 'Use o endpoint POST /api/pedidos/[id]/cancelar para cancelar pedidos' },
      { status: 400 },
    )
  }

  const { boletoVencimento, status, ...rest } = parsed.data

  // Marcar como EMITIDO sem protocolo real da Safeweb cria um certificado
  // fictício (já aconteceu em 18/06/2026 — ver memória feedback_safeweb_sagrado).
  // Exige que o pedido já tenha um protocolo (gerado automaticamente na
  // venda) antes de permitir essa transição por aqui.
  if (status === 'EMITIDO' && antigo.status !== 'EMITIDO') {
    const numeroProtocolo = antigo.numeroCompra || (antigo as Record<string, unknown>).safewebProtocolo || rest.numeroCompra
    if (!numeroProtocolo) {
      return NextResponse.json({
        erro: 'Não é possível marcar como EMITIDO sem um protocolo Safeweb real. Este pedido não tem safewebProtocolo nem numeroCompra preenchido.',
      }, { status: 422 })
    }
  }

  const data: Record<string, unknown> = { ...rest }
  if (boletoVencimento) data.boletoVencimento = new Date(boletoVencimento)
  if (status) {
    data.status = status
    if (status === 'VERIFICADO') data.verificadoEm = new Date()
    if (status === 'EMITIDO') data.emitidoEm = new Date()
  }

  const pedido = await prisma.pedido.update({ where: { id }, data })

  // Ao marcar como EMITIDO, cria o certificado automaticamente no cliente
  if (status === 'EMITIDO' && antigo.status !== 'EMITIDO') {
    // Certificado — criação síncrona e obrigatória junto com a emissão.
    const certExistente = await prisma.certificado.findFirst({ where: { pedidoId: id } })
    if (!certExistente) {
      const pedidoCompleto = await prisma.pedido.findUnique({
        where: { id },
        include: { itens: { include: { modelo: true } } },
      })
      const item = pedidoCompleto?.itens[0]
      if (item) {
        const dataEmissao    = new Date()
        const dataVencimento = new Date()
        dataVencimento.setMonth(dataVencimento.getMonth() + item.modelo.validadeMeses)

        await prisma.certificado.create({
          data: {
            clienteId:     pedidoCompleto!.clienteId,
            modeloId:      item.modeloId,
            pedidoId:      id,
            dataEmissao,
            dataVencimento,
            status:        'ATIVO',
            numeroSerie:   antigo.numeroCompra ?? undefined,
          },
        })
      }
    }

    // Lançamento financeiro — criação síncrona. Inclui bonificados (valor = 0)
    // para controle mensal. Idempotente: ignorado se já existir lançamento.
    const lancamentoExistente = await prisma.lancamento.findFirst({ where: { pedidoId: id } })
    if (!lancamentoExistente) {
      const isBonificado = Number(pedido.valorFinal) === 0
      const cliente = await prisma.cliente.findUnique({ where: { id: antigo.clienteId }, select: { nome: true } })
      await prisma.lancamento.create({
        data: {
          tipo:           'RECEBER',
          descricao:      `${cliente?.nome ?? 'Cliente'} — Pedido ${pedido.numero}`,
          valor:          pedido.valorFinal,
          dataVencimento: new Date(),
          status:         isBonificado ? 'PAGO' : 'PENDENTE',
          pedidoId:       id,
          tipoConta:      'Certificado',
          referencia:     pedido.numero,
          formaPagamento: isBonificado ? 'Bonificado' : (pedido.formaPagamento ?? undefined),
          bonificado:     isBonificado,
          ...(pedido.parceiroId ? { parceiroId: pedido.parceiroId } : {}),
        },
      })
    }
  }

  // Monta diff dos campos alterados
  const camposAlterados: Record<string, unknown> = { numero: antigo.numero }
  const mapCampo: Record<string, string> = {
    status: 'Status', valorFinal: 'Valor Final', valorTotal: 'Valor Total',
    desconto: 'Desconto', agr: 'AGR', formaPagamento: 'Forma de Pagamento',
    tipoAtendimento: 'Tipo de Atendimento', voucher: 'Voucher',
    contabilidade: 'Contabilidade', observacoes: 'Observações',
    numeroCompra: 'Nº Compra', unidadeAtendimento: 'Unidade',
  }
  for (const [k, label] of Object.entries(mapCampo)) {
    const anterior = (antigo as Record<string, unknown>)[k]
    const novo = (pedido as Record<string, unknown>)[k]
    if (anterior !== novo) {
      camposAlterados[`${label} (antes)`] = anterior ?? '—'
      camposAlterados[`${label} (depois)`] = novo ?? '—'
    }
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Pedido',
    entidadeId: id,
    dados: camposAlterados,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json(pedido)
}
