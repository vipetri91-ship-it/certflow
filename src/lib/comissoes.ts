import { prisma } from './prisma'
import { calcularComissaoPedido, periodoMesAno } from './comissoes.lib'

export interface PedidoComissao {
  pedidoId:    string
  numero:      string
  clienteNome: string
  modeloNome:  string
  valorCusto:  number
  valorCliente: number
  comissao:    number
  emitidoEm:   Date
}

export interface ResumoParceiroComissao {
  parceiroId:   string
  parceiroNome: string
  diaPagamento: number | null
  qtdPedidos:   number
  valorTotal:   number
  pedidos:      PedidoComissao[]
  // Pedidos do parceiro no período cujo modelo não tem valorCusto/valorCliente
  // configurados em Comissao — não entram no total, mas são sinalizados.
  pedidosSemComissaoConfigurada: number
}

// Comissão = valorCliente - valorCusto (cadastrados por parceiro+modelo em
// Comissao), somado sobre todos os Pedidos EMITIDOS daquele parceiro no
// período. Modelos sem valorCusto/valorCliente configurados são ignorados
// (não geram comissão — decisão de negócio: percentual/valorFixo não são
// usados na prática hoje, ver docs/changelog.md 23/06/2026). Fórmula
// extraída para `comissoes.lib.ts` (testável sem banco).
export async function calcularComissoesPeriodo(mes: number, ano: number): Promise<ResumoParceiroComissao[]> {
  const { inicio, fim } = periodoMesAno(mes, ano)

  const pedidos = await prisma.pedido.findMany({
    where: {
      status: 'EMITIDO',
      parceiroId: { not: null },
      emitidoEm: { gte: inicio, lt: fim },
    },
    include: {
      parceiro: { select: { id: true, nome: true, diaPagamento: true } },
      cliente: { select: { nome: true } },
      itens: { include: { modelo: { select: { id: true, nome: true } } } },
    },
  })

  if (pedidos.length === 0) return []

  const comissoes = await prisma.comissao.findMany({
    where: { parceiroId: { in: [...new Set(pedidos.map(p => p.parceiroId!))] } },
  })
  const comissaoPorChave = new Map(comissoes.map(c => [`${c.parceiroId}:${c.modeloId}`, c]))

  const porParceiro = new Map<string, ResumoParceiroComissao>()

  for (const pedido of pedidos) {
    const item = pedido.itens[0]
    if (!item || !pedido.parceiro) continue

    const resumo = porParceiro.get(pedido.parceiro.id) ?? {
      parceiroId:   pedido.parceiro.id,
      parceiroNome: pedido.parceiro.nome,
      diaPagamento: pedido.parceiro.diaPagamento,
      qtdPedidos:   0,
      valorTotal:   0,
      pedidos:      [],
      pedidosSemComissaoConfigurada: 0,
    }

    const comissao = comissaoPorChave.get(`${pedido.parceiro.id}:${item.modeloId}`)
    const valorComissao = calcularComissaoPedido(comissao)
    if (valorComissao === null) {
      resumo.pedidosSemComissaoConfigurada += 1
      porParceiro.set(pedido.parceiro.id, resumo)
      continue
    }

    resumo.qtdPedidos += 1
    resumo.valorTotal += valorComissao
    resumo.pedidos.push({
      pedidoId:     pedido.id,
      numero:       pedido.numero,
      clienteNome:  pedido.cliente.nome,
      modeloNome:   item.modelo.nome,
      valorCusto:   Number(comissao!.valorCusto),
      valorCliente: Number(comissao!.valorCliente),
      comissao:     valorComissao,
      emitidoEm:    pedido.emitidoEm!,
    })
    porParceiro.set(pedido.parceiro.id, resumo)
  }

  return [...porParceiro.values()]
    .filter(r => r.qtdPedidos > 0)
    .sort((a, b) => b.valorTotal - a.valorTotal)
}

export async function calcularComissaoParceiro(parceiroId: string, mes: number, ano: number): Promise<ResumoParceiroComissao | null> {
  const todas = await calcularComissoesPeriodo(mes, ano)
  return todas.find(r => r.parceiroId === parceiroId) ?? null
}
