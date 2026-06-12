// Lógica de mesclagem do resultado da consulta de CPF (validarPF) no
// formulário de "Nova Venda". Extraída para um módulo isolado e puro para
// permitir testes automatizados de regressão — ver
// docs/regras-negocio/consulta-cpf.md e
// docs/regras-negocio/isolamento-de-formularios.md.

export const fmtCEP = (v: string) =>
  v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '')

// Separa um celular salvo no banco (com ou sem DDD) em { ddd, telefone } de 2 e 9 dígitos,
// evitando que o DDD fique duplicado quando o autopreenchimento ocorre
export function telefoneFromCelular(
  celular: string | null | undefined,
  dddOrigem: string | null | undefined,
  atual: { ddd: string; telefone: string }
): { ddd: string; telefone: string } {
  const digitos = (celular ?? '').replace(/\D/g, '')
  if (digitos.length >= 10) return { ddd: digitos.slice(0, 2), telefone: digitos.slice(2, 11) }
  if (digitos.length > 0)   return { ddd: dddOrigem || atual.ddd, telefone: digitos.slice(0, 9) }
  return atual
}

export interface ClienteExistentePF {
  id?: string
  nome?: string | null
  email?: string | null
  celular?: string | null
  ddd?: string | null
  pisNis?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

export interface DadosResponsavelPF {
  validado: boolean
  nomeResponsavel: string
  nome: string
  clienteId: string
  email: string
  ddd: string
  telefone: string
  pisNis: string
  cep: string
  logradouro: string
  numero: string
  bairro: string
  municipio: string
  estado: string
}

/**
 * Monta o novo estado do responsável/titular PF após a consulta de CPF.
 *
 * Regra obrigatória (isolamento-de-formularios.md):
 *  - Se `clienteDb` não existir para o CPF consultado, todos os campos de
 *    contato/endereço começam vazios — nunca herdam o valor anterior (`d`).
 *  - O nome pode vir da Receita Federal (`nomeRfb`), independente de existir
 *    `clienteDb`.
 */
export function mergeDadosResponsavelPF(
  d: Pick<DadosResponsavelPF, 'nomeResponsavel' | 'nome'>,
  params: { nomeRfb: string; clienteDb: ClienteExistentePF | null | undefined },
): DadosResponsavelPF {
  const { nomeRfb, clienteDb } = params
  return {
    validado:        true,
    nomeResponsavel: nomeRfb || (clienteDb?.nome ?? d.nomeResponsavel),
    nome:            nomeRfb || (clienteDb?.nome ?? d.nome),
    clienteId:       clienteDb?.id ?? '',
    email:           clienteDb?.email ?? '',
    ...telefoneFromCelular(clienteDb?.celular, clienteDb?.ddd, { ddd: '', telefone: '' }),
    pisNis:          clienteDb?.pisNis ?? '',
    cep:             clienteDb?.cep ? fmtCEP(clienteDb.cep) : '',
    logradouro:      clienteDb?.logradouro ?? '',
    numero:          clienteDb?.numero ?? '',
    bairro:          clienteDb?.bairro ?? '',
    municipio:       clienteDb?.cidade ?? '',
    estado:          clienteDb?.estado ?? '',
  }
}

export interface ClienteEncontradoPorCPF {
  id: string
  tipoPessoa?: string | null
  cpf?: string | null
  nome?: string | null
  dataNascimento?: string | null
  email?: string | null
  celular?: string | null
  ddd?: string | null
  pisNis?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

export interface DadosClientePorCPF {
  clienteId: string
  validado: boolean
  nomeResponsavel: string
  nome: string
  dataNascimento: string
  dataNasc: string
  email: string
  ddd: string
  telefone: string
  pisNis: string
  cep: string
  logradouro: string
  numero: string
  bairro: string
  municipio: string
  estado: string
}

/**
 * Monta o novo estado do responsável/titular após a busca de CPF no step
 * "Identificação" (buscarClientePorCPF, wizard de Nova Venda).
 *
 * Regra obrigatória (isolamento-de-formularios.md):
 *  - Se o CPF buscado não corresponder a nenhum cliente, todos os campos de
 *    contato/endereço voltam para vazio — nunca herdam o valor anterior (`d`).
 *  - `clienteId`/`validado` só são alterados quando `d.tipoPessoa === 'PF'`
 *    (para PJ, esses campos pertencem à empresa, não ao responsável).
 */
export function mergeDadosClientePorCPF(
  d: Pick<DadosClientePorCPF, 'clienteId' | 'validado'> & { tipoPessoa: 'PF' | 'PJ' },
  cliente: ClienteEncontradoPorCPF | null | undefined,
  cpfBuscado: string,
): DadosClientePorCPF {
  const c = cliente?.cpf?.replace(/\D/g, '') === cpfBuscado ? cliente : null

  if (!c) {
    return {
      clienteId:       d.tipoPessoa === 'PF' ? '' : d.clienteId,
      validado:        d.tipoPessoa === 'PF' ? false : d.validado,
      nomeResponsavel: '',
      nome:            '',
      dataNascimento:  '',
      dataNasc:        '',
      email:           '',
      ddd:             '',
      telefone:        '',
      pisNis:          '',
      cep:             '',
      logradouro:      '',
      numero:          '',
      bairro:          '',
      municipio:       '',
      estado:          '',
    }
  }

  const dataNasc = c.dataNascimento ? c.dataNascimento.split('T')[0] : ''
  return {
    clienteId:       d.tipoPessoa === 'PF' ? c.id : d.clienteId,
    validado:        d.tipoPessoa === 'PF' ? true : d.validado,
    nomeResponsavel: c.nome ?? '',
    nome:            c.nome ?? '',
    dataNascimento:  dataNasc,
    dataNasc:        dataNasc,
    email:           c.email ?? '',
    ...telefoneFromCelular(c.celular, c.ddd, { ddd: '', telefone: '' }),
    pisNis:          c.pisNis ?? '',
    cep:             c.cep ? fmtCEP(c.cep) : '',
    logradouro:      c.logradouro ?? '',
    numero:          c.numero ?? '',
    bairro:          c.bairro ?? '',
    municipio:       c.cidade ?? '',
    estado:          c.estado ?? '',
  }
}
