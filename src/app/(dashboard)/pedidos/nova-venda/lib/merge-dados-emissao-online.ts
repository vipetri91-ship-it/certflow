// Lógica de mesclagem/limpeza dos dados extraídos na validação do certificado
// A3 PF no fluxo "Emissão Online" (emissao-online.tsx, validar()). Extraída
// para um módulo isolado e puro para permitir testes automatizados de
// regressão — ver docs/regras-negocio/isolamento-de-formularios.md.

function fmtCPF(v: string) {
  return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4').replace(/-$/,'')
}
function fmtCNPJ(v: string) {
  return v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5').replace(/-$/,'')
}

export interface DadosCertificadoExtraidos {
  nome: string
  cpf: string
  cnpj: string
  email: string
}

export interface DadosEmissaoOnline {
  nome: string
  documento: string
  email: string
}

/**
 * Monta o novo estado de `nome`/`documento`/`email` (etapa "Dados da
 * Renovação") após uma validação bem-sucedida do certificado A3 PF
 * (validar(), emissao-online.tsx).
 *
 * Regra obrigatória (isolamento-de-formularios.md):
 *  - Os 3 campos são sempre completamente substituídos pelo resultado da
 *    validação atual (`ext`) — nunca herdam o valor de uma validação
 *    anterior. Se `ext.email`/`ext.cpf`/`ext.cnpj` vierem vazios, os
 *    campos correspondentes voltam para vazio, evitando que dados de um
 *    certificado validado antes (de outro cliente) permaneçam na tela
 *    após revalidar com uma série diferente.
 */
export function mergeDadosEmissaoOnline(ext: DadosCertificadoExtraidos): DadosEmissaoOnline {
  const docRaw = ext.cnpj || ext.cpf
  const digits = docRaw.replace(/\D/g, '')

  return {
    nome: ext.nome,
    documento: digits ? (digits.length === 14 ? fmtCNPJ(digits) : fmtCPF(digits)) : '',
    email: ext.email || '',
  }
}
