// Lógica de mesclagem/limpeza dos resultados de busca de CNPJ no modal de
// lead do módulo SST (sst/page.tsx, buscarCnpj). Extraída para um módulo
// isolado e puro para permitir testes automatizados de regressão — mesmo
// padrão de clientes/novo/lib/merge-dados-cnpj.ts (ONDA 2).

export interface DadosEmpresaSst {
  empresa: string
}

export interface CnpjEncontradoSst {
  razaoSocial?: string | null
}

/**
 * Monta o novo estado do campo "empresa" do lead após a busca por CNPJ
 * (buscarCnpj, SST).
 *
 * Regra obrigatória (mesmo padrão de isolamento-de-formularios.md):
 *  - Se `data` for `null` (CNPJ não encontrado ou erro de consulta), o
 *    campo "empresa" volta para vazio — não herda o valor de uma empresa
 *    pesquisada anteriormente.
 *  - Quando `data` existe mas não traz `razaoSocial`, mantém o valor
 *    atual do formulário.
 */
export function mergeDadosEmpresaPorCnpjSst(
  f: DadosEmpresaSst,
  data: CnpjEncontradoSst | null | undefined,
): DadosEmpresaSst {
  if (!data) return { empresa: '' }
  return { empresa: data.razaoSocial ?? f.empresa }
}
