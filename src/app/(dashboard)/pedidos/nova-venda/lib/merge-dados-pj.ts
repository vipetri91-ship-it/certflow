// Lógica de mesclagem/limpeza dos resultados de busca de CNPJ no formulário de
// "Nova Venda" (step "Identificação", fluxo PJ). Extraída para um módulo
// isolado e puro para permitir testes automatizados de regressão — ver
// docs/regras-negocio/isolamento-de-formularios.md.

import { fmtCEP, telefoneFromCelular } from './merge-dados-pf'

// ─── autoPreencherPorCNPJ ───────────────────────────────────────────────────

export interface ClienteEncontradoPJ {
  id: string
  cnpj?: string | null
  nome?: string | null
  nomeFantasia?: string | null
  responsavel?: string | null
  email?: string | null
  celular?: string | null
  ddd?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

export interface DadosEmpresaPorCNPJ {
  clienteId: string
  nomeEmpresa: string
  razaoSocial: string
  fantasia: string
  nomeResponsavel: string
  nome: string
  cpfResponsavel: string
  dataNascimento: string
  email: string
  ddd: string
  telefone: string
  emailEmpresa: string
  dddEmpresa: string
  telEmpresa: string
  cepEmpresa: string
  logradouroEmpresa: string
  numeroEmpresa: string
  bairroEmpresa: string
  municipioEmpresa: string
  estadoEmpresa: string
}

/**
 * Monta o novo estado de empresa/responsável após o autopreenchimento por
 * CNPJ (autoPreencherPorCNPJ, wizard de Nova Venda).
 *
 * Regra obrigatória (isolamento-de-formularios.md):
 *  - Se `cliente` não existir para o CNPJ pesquisado, todos os campos de
 *    empresa/responsável voltam para vazio — nunca herdam o valor anterior
 *    (`d`), que pode pertencer a uma empresa pesquisada antes.
 *  - Quando `cliente` existe, a lógica de preenchimento é idêntica à
 *    anterior (mantém `?? d.campo` como fallback para campos nulos do
 *    cliente encontrado).
 */
export function mergeDadosEmpresaPorCNPJ(
  d: DadosEmpresaPorCNPJ,
  cliente: ClienteEncontradoPJ | null | undefined,
  responsavelPF: { cpfFormatado: string | null; dataNascimentoIso: string | null },
): DadosEmpresaPorCNPJ {
  if (!cliente) {
    return {
      clienteId: '',
      nomeEmpresa: '',
      razaoSocial: '',
      fantasia: '',
      nomeResponsavel: '',
      nome: '',
      cpfResponsavel: '',
      dataNascimento: '',
      email: '',
      ddd: '',
      telefone: '',
      emailEmpresa: '',
      dddEmpresa: '',
      telEmpresa: '',
      cepEmpresa: '',
      logradouroEmpresa: '',
      numeroEmpresa: '',
      bairroEmpresa: '',
      municipioEmpresa: '',
      estadoEmpresa: '',
    }
  }

  const c = cliente
  const telResp = telefoneFromCelular(c.celular, c.ddd, { ddd: d.ddd, telefone: d.telefone })
  const telEmp  = telefoneFromCelular(c.celular, c.ddd, { ddd: d.dddEmpresa, telefone: d.telEmpresa })
  const { cpfFormatado, dataNascimentoIso } = responsavelPF

  return {
    clienteId:        c.id,
    nomeEmpresa:      c.nome ?? d.nomeEmpresa,
    razaoSocial:      c.nome ?? d.razaoSocial,
    fantasia:         c.nomeFantasia ?? d.fantasia,
    nomeResponsavel:  c.responsavel ?? d.nomeResponsavel,
    nome:             c.responsavel ?? d.nome,
    cpfResponsavel:   cpfFormatado ? cpfFormatado : d.cpfResponsavel,
    dataNascimento:   dataNascimentoIso ? dataNascimentoIso.split('T')[0] : d.dataNascimento,
    email:            c.email ?? d.email,
    ddd:              telResp.ddd,
    telefone:         telResp.telefone,
    emailEmpresa:     c.email ?? d.emailEmpresa,
    dddEmpresa:       telEmp.ddd,
    telEmpresa:       telEmp.telefone,
    cepEmpresa:       c.cep ? fmtCEP(c.cep) : d.cepEmpresa,
    logradouroEmpresa: c.logradouro ?? d.logradouroEmpresa,
    numeroEmpresa:    c.numero ?? d.numeroEmpresa,
    bairroEmpresa:    c.bairro ?? d.bairroEmpresa,
    municipioEmpresa: c.cidade ?? d.municipioEmpresa,
    estadoEmpresa:    c.estado ?? d.estadoEmpresa,
  }
}

// ─── validarCNPJ ─────────────────────────────────────────────────────────────

export interface DadosValidacaoPJ {
  nomeEmpresa: string
  razaoSocial: string
  fantasia: string
  nomeResponsavel: string
  clienteId: string
  nome: string
  cpfResponsavel: string
  dataNascimento: string
  email: string
  ddd: string
  telefone: string
  cepEmpresa: string
  logradouroEmpresa: string
  numeroEmpresa: string
  bairroEmpresa: string
  municipioEmpresa: string
  estadoEmpresa: string
  validado: boolean
}

/**
 * Estado "vazio" dos campos de empresa/responsável preenchidos por
 * validarCNPJ. Usado em todos os retornos antecipados de erro (CNPJ não
 * encontrado, sócio não corresponde, Safeweb não libera, erro de conexão)
 * para garantir que dados de uma validação anterior nunca permaneçam na
 * tela após uma falha na validação atual.
 */
export function limparDadosValidacaoPJ(): DadosValidacaoPJ {
  return {
    nomeEmpresa: '',
    razaoSocial: '',
    fantasia: '',
    nomeResponsavel: '',
    clienteId: '',
    nome: '',
    cpfResponsavel: '',
    dataNascimento: '',
    email: '',
    ddd: '',
    telefone: '',
    cepEmpresa: '',
    logradouroEmpresa: '',
    numeroEmpresa: '',
    bairroEmpresa: '',
    municipioEmpresa: '',
    estadoEmpresa: '',
    validado: false,
  }
}
