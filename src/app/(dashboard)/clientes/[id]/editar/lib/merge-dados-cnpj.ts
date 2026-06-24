// Lógica de mesclagem/limpeza dos resultados de busca de CNPJ no formulário
// "Editar Cliente" (clientes/[id]/editar, buscarCnpj). Extraída para um
// módulo isolado e puro para permitir testes automatizados de regressão —
// mesmo padrão de clientes/novo/lib/merge-dados-cnpj.ts (ONDA 2).

import { mascararCEP as formatarCEP } from '../../../../../../lib/mascaras'

export interface DadosEmpresaCnpj {
  razaoSocial: string
  nomeFantasia: string
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
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  municipio?: string | null
  uf?: string | null
}

/**
 * Monta o novo estado dos campos de empresa após a busca por CNPJ
 * (buscarCnpj, clientes/[id]/editar).
 *
 * Regra obrigatória (mesmo padrão de isolamento-de-formularios.md):
 *  - Se `data` for `null` (CNPJ não encontrado ou erro de consulta), os
 *    campos de empresa voltam para vazio — não herdam o valor de um CNPJ
 *    pesquisado anteriormente.
 *  - Quando `data` existe, mantém `?? f.campo` como fallback para campos
 *    nulos retornados pela Receita.
 */
export function mergeDadosEmpresaPorCnpj(
  f: DadosEmpresaCnpj,
  data: CnpjEncontrado | null | undefined,
): DadosEmpresaCnpj {
  if (!data) {
    return {
      razaoSocial: '',
      nomeFantasia: '',
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
    cep:          data.cep         ? formatarCEP(data.cep)    : f.cep,
    logradouro:   data.logradouro  ?? f.logradouro,
    numero:       data.numero      ?? f.numero,
    bairro:       data.bairro      ?? f.bairro,
    cidade:       data.municipio   ?? f.cidade,
    estado:       data.uf          ?? f.estado,
  }
}
