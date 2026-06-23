import { prisma } from './prisma'

export interface ResultadoReconciliacao {
  certificadosCriados: string[]
  lancamentosCriados: string[]
  erros: string[]
  executadoEm: string
}

// Garante que todo pedido EMITIDO tenha seu Certificado e Lançamento criados.
// Chamado pelo cron interno (instrumentation.ts) e pela API /api/jobs/reconciliar-emitidos.
export async function reconciliarEmitidos(): Promise<ResultadoReconciliacao> {
  const resultado: ResultadoReconciliacao = {
    certificadosCriados: [],
    lancamentosCriados: [],
    erros: [],
    executadoEm: new Date().toISOString(),
  }

  // 1. Pedidos EMITIDOS sem certificado
  const semCertificado = await prisma.pedido.findMany({
    where: {
      status: 'EMITIDO',
      certificados: { none: {} },
    },
    include: {
      itens: { include: { modelo: { select: { validadeMeses: true } } } },
    },
  })

  for (const pedido of semCertificado) {
    const item = pedido.itens[0]
    if (!item) {
      resultado.erros.push(`${pedido.numero}: EMITIDO sem itens — certificado não pode ser criado`)
      continue
    }

    try {
      const dataEmissao    = pedido.emitidoEm ?? new Date()
      const dataVencimento = new Date(dataEmissao)
      dataVencimento.setMonth(dataVencimento.getMonth() + item.modelo.validadeMeses)

      await prisma.certificado.create({
        data: {
          clienteId:     pedido.clienteId,
          modeloId:      item.modeloId,
          pedidoId:      pedido.id,
          dataEmissao,
          dataVencimento,
          status:        'ATIVO',
          numeroSerie:   pedido.numeroCompra ?? undefined,
        },
      })
      resultado.certificadosCriados.push(pedido.numero)
      console.log(`[Reconciliação] Certificado criado: ${pedido.numero}`)
    } catch (e) {
      const msg = `${pedido.numero}: erro ao criar certificado — ${(e as Error).message}`
      resultado.erros.push(msg)
      console.error(`[Reconciliação] ${msg}`)
    }
  }

  // 2. Pedidos EMITIDOS sem lançamento (todos — incluindo bonificados).
  // Exclui pedidos marcados com ignorarReconciliacaoFinanceira (cobrança
  // feita fora do CertFlow — ver docs/changelog.md 23/06/2026).
  const semLancamento = await prisma.pedido.findMany({
    where: {
      status: 'EMITIDO',
      lancamentos: { none: {} },
      ignorarReconciliacaoFinanceira: false,
    },
    include: {
      cliente: { select: { nome: true } },
    },
  })

  for (const pedido of semLancamento) {
    const isBonificado = Number(pedido.valorFinal) === 0
    try {
      await prisma.lancamento.create({
        data: {
          tipo:           'RECEBER',
          descricao:      `${pedido.cliente.nome} — Pedido ${pedido.numero}`,
          valor:          pedido.valorFinal as any,
          dataVencimento: pedido.emitidoEm ?? new Date(),
          status:         isBonificado ? 'PAGO' : 'PENDENTE',
          pedidoId:       pedido.id,
          tipoConta:      'Certificado',
          referencia:     pedido.numero,
          formaPagamento: isBonificado ? 'Bonificado' : (pedido.formaPagamento ?? undefined),
          bonificado:     isBonificado,
          ...(pedido.parceiroId ? { parceiroId: pedido.parceiroId } : {}),
        },
      })
      resultado.lancamentosCriados.push(pedido.numero)
      console.log(`[Reconciliação] Lançamento criado: ${pedido.numero} — R$ ${pedido.valorFinal}`)
    } catch (e) {
      const msg = `${pedido.numero}: erro ao criar lançamento — ${(e as Error).message}`
      resultado.erros.push(msg)
      console.error(`[Reconciliação] ${msg}`)
    }
  }

  if (resultado.certificadosCriados.length === 0 && resultado.lancamentosCriados.length === 0 && resultado.erros.length === 0) {
    console.log('[Reconciliação] Nenhuma inconsistência encontrada.')
  }

  return resultado
}