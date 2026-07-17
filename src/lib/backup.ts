// Backup diário completo do banco — exporta todas as tabelas em JSON,
// criptografa (AES-256-GCM) e guarda no Vercel Blob. Criado 17/07/2026: até
// aqui a única proteção contra perda de dado era o PITR do Neon, de só 6
// horas — qualquer problema percebido depois disso perdia o dado pra
// sempre, inclusive financeiro.
//
// A store de Blob existente (já usada pro upload de documentos) é do tipo
// "pública" — não dá pra criar blob privado nela sem provisionar uma store
// nova. Em vez disso, o conteúdo é criptografado com uma chave dedicada
// (`BACKUP_ENCRYPTION_KEY`, nunca usada pra mais nada) antes de subir: a URL
// pode até ser alcançável, mas o conteúdo — CPF, CNPJ, dado financeiro — só
// abre com a chave.
//
// Lista de modelos mantida manualmente (o Prisma 7 não expõe mais `dmmf`
// publicamente pra descoberta automática) — ao adicionar um model novo no
// schema, adicionar aqui também.
import crypto from 'crypto'
import { prisma } from './prisma'
import { put, list, del } from '@vercel/blob'

const RETENCAO_DIAS = 14

// Formato do arquivo final: [iv 12 bytes][authTag 16 bytes][conteúdo cifrado]
function criptografar(textoPlano: string): Buffer {
  const chaveHex = process.env.BACKUP_ENCRYPTION_KEY
  if (!chaveHex) throw new Error('BACKUP_ENCRYPTION_KEY não configurada')
  const chave = Buffer.from(chaveHex, 'hex')
  const iv = crypto.randomBytes(12)
  const cifra = crypto.createCipheriv('aes-256-gcm', chave, iv)
  const cifrado = Buffer.concat([cifra.update(textoPlano, 'utf8'), cifra.final()])
  const tag = cifra.getAuthTag()
  return Buffer.concat([iv, tag, cifrado])
}

const MODELOS = [
  'usuario', 'sessao', 'cliente', 'historicoContato', 'parceiro',
  'tabelaPreco', 'tabelaPrecoItem', 'contatoParceiro', 'comissao', 'comissaoPedido',
  'modeloCertificado', 'certificado', 'renovacaoManual', 'pedido', 'itemPedido',
  'categoriaFinanceira', 'lancamento', 'templateEmail', 'emailLog', 'auditLog',
  'eventoWebhook', 'configuracao', 'noticia', 'sSTLead', 'sSTHistorico',
  'orcamento', 'postSocial', 'sessaoAtividade', 'pendenciaProjeto', 'auditoriaRobo',
  'metaPerformance', 'ocorrenciaQualidade', 'focoDoDia', 'melhoriaContinua',
  'indicadorMensal', 'sugestaoIA', 'cobrancaAprovacao',
] as const

export interface ResultadoBackup {
  ok: boolean
  tabelas?: number
  totalLinhas?: number
  tamanhoBytes?: number
  url?: string
  removidos?: number
  erro?: string
}

export async function executarBackupDiario(): Promise<ResultadoBackup> {
  try {
    const dump: Record<string, unknown[]> = {}
    let totalLinhas = 0

    for (const modelo of MODELOS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delegate = (prisma as any)[modelo]
      if (!delegate?.findMany) continue
      const linhas = await delegate.findMany()
      dump[modelo] = linhas
      totalLinhas += linhas.length
    }

    const conteudo = JSON.stringify({ geradoEm: new Date().toISOString(), tabelas: dump })
    const conteudoCriptografado = criptografar(conteudo)
    const dataArquivo = new Date().toISOString().slice(0, 10)
    const caminho = `backups/certflow-${dataArquivo}.enc`

    const resultado = await put(caminho, conteudoCriptografado, {
      access: 'public',
      contentType: 'application/octet-stream',
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    // Retenção: apaga backups mais antigos que RETENCAO_DIAS pra não crescer
    // pra sempre (o Vercel Blob cobra por armazenamento).
    let removidos = 0
    const { blobs } = await list({ prefix: 'backups/' })
    const limite = Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000
    const antigos = blobs.filter(b => new Date(b.uploadedAt).getTime() < limite)
    if (antigos.length > 0) {
      await del(antigos.map(b => b.url))
      removidos = antigos.length
    }

    return {
      ok: true,
      tabelas: MODELOS.length,
      totalLinhas,
      tamanhoBytes: conteudoCriptografado.length,
      url: resultado.url,
      removidos,
    }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}
