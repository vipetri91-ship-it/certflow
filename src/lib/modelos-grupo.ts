// Agrupamento/ordenação de modelos de certificado para exibição em telas
// de tabela (cadastro de parceiro, tabelas de preço) — extraído pra não
// duplicar a mesma regra em mais de um lugar.
export const GRUPO_ORDEM = [
  'A1 - Software',
  'A3 - em Cartão',
  'A3 - em Token',
  'A3 - Sem Mídia',
  'A3 - Cartão + Leitora',
  'A3 - em Nuvem',
]

export function getGrupo(nome: string): string {
  if (nome.includes('A1')) return 'A1 - Software'
  if (nome.includes('Cartão + Leitora')) return 'A3 - Cartão + Leitora'
  if (nome.includes('em Cartão')) return 'A3 - em Cartão'
  if (nome.includes('em Token')) return 'A3 - em Token'
  if (nome.includes('Sem Mídia')) return 'A3 - Sem Mídia'
  if (nome.includes('em Nuvem')) return 'A3 - em Nuvem'
  return 'Outros'
}

export function ordenarModelos<T extends { nome: string; validadeMeses: number }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    const ga = GRUPO_ORDEM.indexOf(getGrupo(a.nome))
    const gb = GRUPO_ORDEM.indexOf(getGrupo(b.nome))
    if (ga !== gb) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb)
    return a.validadeMeses - b.validadeMeses
  })
}
