import { prisma } from './prisma'
import { calcularComissaoPedido } from './comissoes.lib'
import { resolverValorCusto } from './tabela-preco.lib'

export interface LinhaComissaoPedido {
  comissaoPedidoId: string | null // null = ainda não sincronizado (sem comissão configurada)
  pedidoId:     string
  numero:       string
  protocolo:    string | null
  clienteNome:  string
  modeloNome:   string
  valorCusto:   number
  valorCliente: number
  comissao:     number
  emitidoEm:    Date
  status:       'PENDENTE' | 'PAGO'
  pagoEm:       Date | null
}

export interface ResumoParceiroComissao {
  parceiroId:   string
  parceiroNome: string
  pendentes:    LinhaComissaoPedido[]
  pagas:        LinhaComissaoPedido[]
  totalPendente: number
  // Pedidos do parceiro cujo modelo não tem valorCusto/valorCliente
  // configurados — não entram na lista, mas são sinalizados.
  pedidosSemComissaoConfigurada: number
}

// Garante que todo Pedido EMITIDO com parceiro tenha uma linha em
// ComissaoPedido. Para as que ainda estão PENDENTE, recalcula o valor de
// custo a cada chamada — porque o parceiro pode estar vinculado a uma
// tabela de preço "ao vivo" (editar a tabela reflete sem precisar tocar em
// cada pedido). Linhas já PAGAS nunca são recalculadas (ficam congeladas
// com o valor de quando foram pagas).
async function sincronizarComissoesPedido(parceiroId: string): Promise<void> {
  const parceiro = await prisma.parceiro.findUnique({
    where: { id: parceiroId },
    select: { tabelaPrecoId: true },
  })
  if (!parceiro) return

  const itensTabela = parceiro.tabelaPrecoId
    ? await prisma.tabelaPrecoItem.findMany({ where: { tabelaPrecoId: parceiro.tabelaPrecoId } })
    : []

  const pedidos = await prisma.pedido.findMany({
    where: { status: 'EMITIDO', parceiroId },
    include: { itens: { include: { modelo: true } } },
  })

  const comissoesModelo = await prisma.comissao.findMany({ where: { parceiroId } })
  const comissaoPorModelo = new Map(comissoesModelo.map((c) => [c.modeloId, c]))

  const existentes = await prisma.comissaoPedido.findMany({ where: { parceiroId } })
  const existentePorPedido = new Map(existentes.map((c) => [c.pedidoId, c]))

  for (const pedido of pedidos) {
    const item = pedido.itens[0]
    if (!item) continue

    const existente = existentePorPedido.get(pedido.id)
    if (existente?.status === 'PAGO') continue // congelado, nunca recalcula

    const comissaoModelo = comissaoPorModelo.get(item.modeloId)
    const valorCusto = resolverValorCusto(item.modeloId, itensTabela, comissaoModelo?.valorCusto)
    const valorCliente = comissaoModelo?.valorCliente

    const valorComissao = calcularComissaoPedido({ valorCusto, valorCliente })
    if (valorComissao === null) {
      if (existente) await prisma.comissaoPedido.delete({ where: { id: existente.id } })
      continue
    }

    await prisma.comissaoPedido.upsert({
      where: { pedidoId: pedido.id },
      create: {
        pedidoId: pedido.id,
        parceiroId,
        valorCusto: Number(valorCusto),
        valorCliente: Number(valorCliente),
        valorComissao,
      },
      update: {
        valorCusto: Number(valorCusto),
        valorCliente: Number(valorCliente),
        valorComissao,
      },
    })
  }
}

export async function obterComissoesParceiro(parceiroId: string): Promise<ResumoParceiroComissao | null> {
  const parceiro = await prisma.parceiro.findUnique({ where: { id: parceiroId }, select: { id: true, nome: true } })
  if (!parceiro) return null

  await sincronizarComissoesPedido(parceiroId)

  const totalEmitidos = await prisma.pedido.count({ where: { status: 'EMITIDO', parceiroId } })

  const linhas = await prisma.comissaoPedido.findMany({
    where: { parceiroId },
    include: {
      pedido: { select: { numero: true, safewebProtocolo: true, numeroCompra: true, emitidoEm: true, cliente: { select: { nome: true } }, itens: { include: { modelo: { select: { nome: true } } } } } },
    },
    orderBy: { pedido: { emitidoEm: 'asc' } },
  })

  const todasLinhas: LinhaComissaoPedido[] = linhas.map((l) => ({
    comissaoPedidoId: l.id,
    pedidoId:     l.pedidoId,
    numero:       l.pedido.numero,
    protocolo:    l.pedido.safewebProtocolo ?? l.pedido.numeroCompra ?? null,
    clienteNome:  l.pedido.cliente.nome,
    modeloNome:   l.pedido.itens[0]?.modelo.nome ?? '—',
    valorCusto:   Number(l.valorCusto),
    valorCliente: Number(l.valorCliente),
    comissao:     Number(l.valorComissao),
    emitidoEm:    l.pedido.emitidoEm ?? l.createdAt,
    status:       l.status as 'PENDENTE' | 'PAGO',
    pagoEm:       l.pagoEm,
  }))

  const pendentes = todasLinhas.filter((l) => l.status === 'PENDENTE')
  const pagas = todasLinhas.filter((l) => l.status === 'PAGO')

  return {
    parceiroId: parceiro.id,
    parceiroNome: parceiro.nome,
    pendentes,
    pagas,
    totalPendente: pendentes.reduce((s, l) => s + l.comissao, 0),
    pedidosSemComissaoConfigurada: totalEmitidos - todasLinhas.length,
  }
}

// Marca um conjunto de comissões pendentes como pagas, criando um único
// Lançamento (PAGAR) com a soma exata dos selecionados — sem campo de
// valor livre, por decisão do Vinicius (29/06/2026), pra evitar erro de
// digitação. Quem ficar de fora continua PENDENTE indefinidamente.
export async function pagarComissoesPedido(
  comissaoPedidoIds: string[],
  dataPagamento: Date
): Promise<{ ok: boolean; erro?: string; valorTotal?: number }> {
  if (comissaoPedidoIds.length === 0) return { ok: false, erro: 'Nenhuma comissão selecionada.' }

  const linhas = await prisma.comissaoPedido.findMany({
    where: { id: { in: comissaoPedidoIds } },
    include: { parceiro: { select: { nome: true } } },
  })
  if (linhas.length !== comissaoPedidoIds.length) {
    return { ok: false, erro: 'Alguma comissão selecionada não foi encontrada.' }
  }
  if (linhas.some((l) => l.status === 'PAGO')) {
    return { ok: false, erro: 'Alguma comissão selecionada já foi paga.' }
  }
  const parceiroIds = new Set(linhas.map((l) => l.parceiroId))
  if (parceiroIds.size > 1) {
    return { ok: false, erro: 'Só é possível pagar comissões de um parceiro por vez.' }
  }

  const valorTotal = linhas.reduce((s, l) => s + Number(l.valorComissao), 0)
  const parceiroNome = linhas[0].parceiro.nome
  const parceiroId = linhas[0].parceiroId

  const lancamento = await prisma.lancamento.create({
    data: {
      tipo: 'PAGAR',
      descricao: `Comissão — ${parceiroNome} (${linhas.length} certificado${linhas.length !== 1 ? 's' : ''})`,
      valor: valorTotal,
      dataVencimento: dataPagamento,
      status: 'PAGO',
      categoriaId: 'cat02', // "Comissões Parceiros"
      parceiroId,
      tipoConta: 'Comissão',
    },
  })

  await prisma.comissaoPedido.updateMany({
    where: { id: { in: comissaoPedidoIds } },
    data: { status: 'PAGO', pagoEm: dataPagamento, lancamentoId: lancamento.id },
  })

  return { ok: true, valorTotal }
}
