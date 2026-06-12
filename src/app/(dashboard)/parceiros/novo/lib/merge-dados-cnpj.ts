// Lógica de mesclagem/limpeza dos resultados de busca de CNPJ no formulário
// "Novo Parceiro" (parceiros/novo, buscarCnpj). Extraída para um módulo
// isolado e puro para permitir testes automatizados de regressão — ver
// docs/regras-negocio/isolamento-de-formularios.md.

export interface DadosParceiroCnpj {
  razaoSocial: string
  email: string
  telefone: string
}

export interface CnpjEncontradoParceiro {
  razaoSocial?: string | null
  email?: string | null
  telefone?: string | null
}

/**
 * Monta o novo estado dos campos de empresa após a busca por CNPJ
 * (buscarCnpj, parceiros/novo).
 *
 * Regra obrigatória (isolamento-de-formularios.md):
 *  - Se `data` for `null` (CNPJ não encontrado na Receita ou erro de
 *    consulta), os 3 campos voltam para vazio — nunca herdam o valor
 *    anterior (`f`), que pode pertencer a um CNPJ pesquisado antes.
 *  - Quando `data` existe, a lógica de preenchimento é idêntica à
 *    anterior (mantém `?? f.campo` como fallback para campos nulos
 *    retornados pela Receita).
 */
export function mergeDadosParceiroPorCnpj(
  f: DadosParceiroCnpj,
  data: CnpjEncontradoParceiro | null | undefined,
): DadosParceiroCnpj {
  if (!data) {
    return {
      razaoSocial: '',
      email: '',
      telefone: '',
    }
  }

  return {
    razaoSocial: data.razaoSocial ?? f.razaoSocial,
    email:       data.email       ?? f.email,
    telefone:    data.telefone    ?? f.telefone,
  }
}
