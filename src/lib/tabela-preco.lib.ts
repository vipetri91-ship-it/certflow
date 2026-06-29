// Resolve o "valor de custo" efetivo de um modelo para um parceiro: se o
// parceiro está vinculado a uma tabela de preço E a tabela tem um valor
// cadastrado para esse modelo, usa o valor da tabela (vínculo "ao vivo" —
// editar a tabela depois reflete sem precisar tocar em cada parceiro).
// Senão, usa o valor manual cadastrado em Comissao.valorCusto (cobre os
// modelos que não existem em todas as tabelas, ex.: Cartão+Leitora e Nuvem
// nas tabelas 4 e 5).
export interface ItemTabelaPreco {
  modeloId: string
  valorCusto: unknown
}

export function resolverValorCusto(
  modeloId: string,
  itensTabela: ItemTabelaPreco[] | null | undefined,
  valorCustoManual: unknown
): unknown {
  const itemTabela = itensTabela?.find((i) => i.modeloId === modeloId)
  return itemTabela ? itemTabela.valorCusto : valorCustoManual
}
