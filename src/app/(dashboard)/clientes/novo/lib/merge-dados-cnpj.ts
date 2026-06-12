// Lógica de mesclagem/limpeza dos resultados de busca de CNPJ no formulário
// "Novo Cliente" (clientes/novo, buscarCnpj). Extraída para um módulo isolado
// e puro para permitir testes automatizados de regressão — ver
// docs/regras-negocio/isolamento-de-formularios.md.

function formatarCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '')
}

export interface DadosEmpresaCnpj {
  razaoSocial: string
  nomeFantasia: string
  email: string
  telefone: string
  cep: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  estado: string
}

export interface CnpjEncontrado {
  razaoSocial?: string | null
  nomeFantasia?: string | null
  email?: string | null
  telefone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  municipio?: string | null
  uf?: string | null
}

/**
 * Monta o novo estado dos campos de empresa após a busca por CNPJ
 * (buscarCnpj, clientes/novo).
 *
 * Regra obrigatória (isolamento-de-formularios.md):
 *  - Se `data` for `null` (CNPJ não encontrado na Receita ou erro de
 *    consulta), todos os campos de empresa voltam para vazio — nunca
 *    herdam o valor anterior (`f`), que pode pertencer a um CNPJ
 *    pesquisado antes.
 *  - Quando `data` existe, a lógica de preenchimento é idêntica à
 *    anterior (mantém `?? f.campo` como fallback para campos nulos
 *    retornados pela Receita).
 */
export function mergeDadosEmpresaPorCnpj(
  f: DadosEmpresaCnpj,
  data: CnpjEncontrado | null | undefined,
): DadosEmpresaCnpj {
  if (!data) {
    return {
      razaoSocial: '',
      nomeFantasia: '',
      email: '',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
    }
  }

  return {
    razaoSocial:  data.razaoSocial  ?? f.razaoSocial,
    nomeFantasia: data.nomeFantasia ?? f.nomeFantasia,
    email:        data.email        ?? f.email,
    telefone:     data.telefone     ?? f.telefone,
    cep:          data.cep         ? formatarCEP(data.cep)    : f.cep,
    logradouro:   data.logradouro  ?? f.logradouro,
    numero:       data.numero      ?? f.numero,
    bairro:       data.bairro      ?? f.bairro,
    cidade:       data.municipio   ?? f.cidade,
    estado:       data.uf          ?? f.estado,
  }
}
