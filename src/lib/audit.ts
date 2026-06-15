import { prisma } from './prisma'

interface AuditParams {
  usuarioId?: string
  acao: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'CANCELAR_PEDIDO'
  entidade: string
  entidadeId?: string
  dados?: object
  ip?: string
}

export async function registrarAuditoria(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId: params.usuarioId,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        dados: params.dados ? JSON.parse(JSON.stringify(params.dados)) : undefined,
        ip: params.ip,
      },
    })
  } catch {
    // nunca deixar falha de auditoria derrubar a operação principal
  }
}

function normalizarValor(v: unknown): string {
  if (v instanceof Date) return v.toISOString()
  if (v === null || v === undefined) return ''
  return String(v)
}

// Compara `antes` e `depois` apenas nos campos informados e retorna os nomes
// dos campos cujo valor mudou — sem expor os valores em si (LGPD/auditoria).
export function camposAlterados(
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
  campos: string[],
): string[] {
  return campos.filter(campo => normalizarValor(antes[campo]) !== normalizarValor(depois[campo]))
}