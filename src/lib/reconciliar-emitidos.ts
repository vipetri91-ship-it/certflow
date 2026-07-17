import { prisma } from './prisma'
import { registrarAuditoria } from './audit'

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

      const certificado = await prisma.certificado.create({
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
      // Criação automática (robô de reconciliação) não deixava rastro de
      // auditoria — sem usuarioId porque não é uma ação de pessoa, é do
      // sistema (achado 17/07/2026, auditoria de segurança).
      await registrarAuditoria({
        acao: 'CREATE', entidade: 'Certificado', entidadeId: certificado.id,
        dados: { pedidoNumero: pedido.numero, origem: 'robo-reconciliacao' },
      })
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
      const lancamento = await prisma.lancamento.create({
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
      await registrarAuditoria({
        acao: 'CREATE', entidade: 'Lancamento', entidadeId: lancamento.id,
        dados: { pedidoNumero: pedido.numero, valor: Number(pedido.valorFinal), bonificado: isBonificado, origem: 'robo-reconciliacao' },
      })
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