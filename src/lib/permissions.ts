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
  ],
  OPERADOR: [
    'clientes:read', 'clientes:write',
    'certificados:read', 'certificados:write',
    'parceiros:read',
    'pedidos:read', 'pedidos:write',
    'relatorios:read',
  ],
  FINANCEIRO: [
    'clientes:read',
    'certificados:read',
    'pedidos:read',
    'financeiro:read', 'financeiro:write', 'financeiro:delete',
    'relatorios:read',
  ],
  VISUALIZADOR: [
    'clientes:read',
    'certificados:read',
    'parceiros:read',
    'pedidos:read',
    'financeiro:read',
    'relatorios:read',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: Role): Permission[] {
  return PERMISSIONS[role] ?? []
}