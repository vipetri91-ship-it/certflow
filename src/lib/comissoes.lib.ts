// Regra pura de cálculo de comissão — extraída para testes automatizados
// sem dependência de banco. Ver docs/changelog.md (23/06/2026).

export interface DadosComissaoModelo {
  valorCusto:   unknown
  valorCliente: unknown
}

// Comissão = valor de venda ao cliente - valor de custo, cadastrados por
// parceiro+modelo. Retorna null quando o modelo não tem os dois valores
// configurados (não gera comissão — não há fallback para percentual ou
// valor fixo: decisão de negócio do Vinicius em 23/06/2026, hoje só se usa
// a modalidade "preço de custo").
export function calcularComissaoPedido(comissao: DadosComissaoModelo | null | undefined): number | null {
  if (!comissao?.valorCusto || !comissao?.valorCliente) return null
  const custo   = Number(comissao.valorCusto)
  const cliente = Number(comissao.valorCliente)
  return cliente - custo
}

export function periodoMesAno(mes: number, ano: number): { inicio: Date; fim: Date } {
  return { inicio: new Date(ano, mes - 1, 1), fim: new Date(ano, mes, 1) }
}
