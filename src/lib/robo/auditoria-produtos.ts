import { prisma } from '../prisma'
import { buscarProduto, listarProdutos, encontrarNosprodutos, type FiltrosProduto } from '../safeweb'

export interface AchadoAuditoriaProduto {
  modelo: string
  tipoAtendimento: 'presencial' | 'videoconferência' | 'online'
  situacao: 'bloqueado' | 'ambiguo'
  detalhe: string
}

const NOMES_TIPO_EMISSAO: Record<number, 'presencial' | 'videoconferência' | 'online'> = {
  1: 'presencial',
  3: 'videoconferência',
  5: 'online',
}

function contarTodasCorrespondencias(
  produtos: Record<string, unknown>[],
  tipoProduto: string,
  modelo: string,
  filtros: FiltrosProduto
): number {
  let restantes = [...produtos]
  let total = 0
  for (;;) {
    const achou = encontrarNosprodutos(restantes, tipoProduto, modelo, filtros)
    if (!achou) break
    total++
    restantes = restantes.filter((p) => p !== achou)
  }
  return total
}

/**
 * Reaudita todos os modelos de certificado ativos contra o catálogo real da
 * Safeweb (mesma técnica usada manualmente em 25/06/2026, agora automática).
 * Só lê — nunca corrige nada aqui, porque mudar mapeamento de produto é uma
 * decisão de negócio (já causou um incidente real quando feita sem certeza).
 */
export async function auditarProdutosSafeweb(): Promise<AchadoAuditoriaProduto[]> {
  const modelos = await prisma.modeloCertificado.findMany({
    where: { ativo: true },
    select: { nome: true, tipoPessoa: true, tipoCertificado: true, suporte: true, validadeMeses: true },
  })

  const achados: AchadoAuditoriaProduto[] = []
  const cacheCatalogo: Record<number, Record<string, unknown>[]> = {}

  async function getCatalogo(tipo: number) {
    if (!cacheCatalogo[tipo]) {
      const r = await listarProdutos(tipo)
      cacheCatalogo[tipo] = r.ok && r.produtos ? r.produtos : []
    }
    return cacheCatalogo[tipo]
  }

  for (const m of modelos) {
    const tipoProdutoTexto = m.tipoPessoa === 'PF' ? 'e-CPF' : 'e-CNPJ'

    for (const idTipoEmissao of [1, 3, 5]) {
      const filtros: FiltrosProduto = {
        tipoPessoa: m.tipoPessoa,
        tipoCertificado: m.tipoCertificado,
        validadeMeses: m.validadeMeses,
        idTipoEmissao,
        suporte: m.suporte,
        comLeitora: m.nome.toLowerCase().includes('leitora'),
      }

      const resultado = await buscarProduto(filtros)
      const catalogo = await getCatalogo(idTipoEmissao)
      const total = contarTodasCorrespondencias(catalogo, tipoProdutoTexto, m.tipoCertificado, filtros)

      if (total > 1) {
        achados.push({
          modelo: m.nome,
          tipoAtendimento: NOMES_TIPO_EMISSAO[idTipoEmissao],
          situacao: 'ambiguo',
          detalhe: `${total} produtos batem com os mesmos critérios — risco de escolher o errado.`,
        })
        continue
      }

      if (resultado.ok) continue

      // Mídia física (token/cartão/arquivo) não tem produto de vídeo/online
      // por desenho da Safeweb — confirmado na auditoria de 25/06/2026, não é
      // achado, é esperado. Só reporta bloqueio quando: é a linha NUVEM
      // (deveria funcionar em qualquer tipo) ou é o tipo presencial (todo
      // modelo deveria ter pelo menos a opção presencial).
      const ehRuidoEsperado = m.suporte !== 'NUVEM' && idTipoEmissao !== 1
      if (!ehRuidoEsperado) {
        achados.push({
          modelo: m.nome,
          tipoAtendimento: NOMES_TIPO_EMISSAO[idTipoEmissao],
          situacao: 'bloqueado',
          detalhe: resultado.erro ?? 'Produto não encontrado.',
        })
      }
    }
  }

  return achados
}
