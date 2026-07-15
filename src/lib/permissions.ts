import type { Role } from '../generated/prisma/client'

type Permission =
  | 'clientes:read'
  | 'clientes:write'
  | 'clientes:delete'
  | 'certificados:read'
  | 'certificados:write'
  | 'certificados:delete'
  | 'parceiros:read'
  | 'parceiros:write'
  | 'parceiros:delete'
  | 'pedidos:read'
  | 'pedidos:write'
  | 'pedidos:delete'
  | 'financeiro:read'
  | 'financeiro:write'
  | 'financeiro:delete'
  | 'relatorios:read'
  | 'usuarios:read'
  | 'usuarios:write'
  | 'usuarios:delete'
  | 'configuracoes:read'
  | 'configuracoes:write'
  | 'auditoria:read'
  | 'performance:read'   // ver o dashboard de Performance/ICF
  | 'performance:write'  // área administrativa: ocorrências, metas, foco do dia
  | 'melhorias:write'    // registrar ideia no quadro de Melhoria Contínua — todo colaborador

const PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'clientes:read', 'clientes:write', 'clientes:delete',
    'certificados:read', 'certificados:write', 'certificados:delete',
    'parceiros:read', 'parceiros:write', 'parceiros:delete',
    'pedidos:read', 'pedidos:write', 'pedidos:delete',
    'financeiro:read', 'financeiro:write', 'financeiro:delete',
    'relatorios:read',
    'usuarios:read', 'usuarios:write', 'usuarios:delete',
    'configuracoes:read', 'configuracoes:write',
    'auditoria:read',
    'performance:read', 'performance:write', 'melhorias:write',
  ],
  GERENTE: [
    'clientes:read', 'clientes:write', 'clientes:delete',
    'certificados:read', 'certificados:write', 'certificados:delete',
    'parceiros:read', 'parceiros:write',
    'pedidos:read', 'pedidos:write', 'pedidos:delete',
    'financeiro:read', 'financeiro:write',
    'relatorios:read',
    'usuarios:read',
    'configuracoes:read',
    'auditoria:read',
    'performance:read', 'performance:write', 'melhorias:write',
  ],
  OPERADOR: [
    'clientes:read', 'clientes:write',
    'certificados:read', 'certificados:write',
    'parceiros:read',
    'pedidos:read', 'pedidos:write',
    'relatorios:read',
    'performance:read', 'melhorias:write',
  ],
  FINANCEIRO: [
    'financeiro:read',
    'performance:read', 'melhorias:write',
  ],
  VISUALIZADOR: [
    'clientes:read',
    'certificados:read',
    'parceiros:read',
    'pedidos:read',
    'financeiro:read',
    'relatorios:read',
    'performance:read',
  ],
  // Mesmo acesso do OPERADOR + leitura de Contas a Receber (não inclui
  // 'financeiro:write' — sem criar/editar lançamento; dar baixa é liberado
  // à parte, por role, direto nas rotas de baixa/comprovante).
  OPERADOR_FINANCEIRO: [
    'clientes:read', 'clientes:write',
    'certificados:read', 'certificados:write',
    'parceiros:read',
    'pedidos:read', 'pedidos:write',
    'relatorios:read',
    'financeiro:read',
    'performance:read', 'melhorias:write',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: Role): Permission[] {
  return PERMISSIONS[role] ?? []
}