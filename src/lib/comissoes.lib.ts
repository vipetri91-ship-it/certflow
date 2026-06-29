// Regra pura de cálculo de comissão — extraída para testes automatizados
// sem dependência de banco. Ver docs/changelog.md (23/06/2026).

export interface DadosComissaoModelo {
  valorCusto:   unknown
  valorCliente: unknown
}

// Comissão = valor de venda ao cliente - valor de custo, cadastrados por
// parceiro+modelo. Retorna null quando falta o valor de custo — isso é
// intencional, não um erro de cadastro: parceiros que só têm "Valor p/
// Cliente" preenchido (sem "Valor de Custo") são, por definição, parceiros
// NÃO comissionados (ex.: indicam clientes sem cobrar nada em troca — só
// querem bom atendimento). Confirmado com o Vinicius em 23/06/2026. Não há
// fallback para percentual ou valor fixo: hoje só se usa "preço de custo".
export function calcularComissaoPedido(comissao: DadosComissaoModelo | null | undefined): number | null {
  if (!comissao?.valorCusto || !comissao?.valorCliente) return null
  const custo   = Number(comissao.valorCusto)
  const cliente = Number(comissao.valorCliente)
  return cliente - custo
}
