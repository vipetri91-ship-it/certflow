import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ESTRUTURA_PERMISSOES, PERMISSOES_PADRAO } from '@/lib/permissoes-estrutura'
import { PermissoesEditor } from './editor'

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  gerente:      'Gerente',
  operador:     'Agente de Registro',
  financeiro:   'Aux Financeiro',
  visualizador: 'Visualizador',
}

const ROLES_VALIDOS = ['admin', 'gerente', 'operador', 'financeiro', 'visualizador']

interface Props { params: Promise<{ role: string }> }

export default async function PermissoesPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const { role } = await params
  if (!ROLES_VALIDOS.includes(role)) redirect('/configuracoes/perfis')

  const roleUpper = role.toUpperCase()
  const chave = `permissoes_${roleUpper}`

  const config = await prisma.configuracao.findUnique({ where: { chave } })
  let permissoes: Record<string, boolean>

  if (config?.valor) {
    try { permissoes = JSON.parse(config.valor) } catch { permissoes = PERMISSOES_PADRAO[roleUpper] ?? {} }
  } else {
    permissoes = PERMISSOES_PADRAO[roleUpper] ?? {}
  }

  const isAdmin = roleUpper === 'ADMIN'

  return (
    <div>
      <Header titulo={`Permissões — ${ROLE_LABELS[role]}`} />
      <PermissoesEditor
        role={roleUpper}
        roleLabel={ROLE_LABELS[role]}
        permissoesIniciais={permissoes}
        estrutura={ESTRUTURA_PERMISSOES}
        isAdmin={isAdmin}
      />
    </div>
  )
}
