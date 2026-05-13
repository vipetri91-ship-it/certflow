import { prisma } from './prisma'

interface AuditParams {
  usuarioId?: string
  acao: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW'
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