import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { ConciliacoesClient } from './conciliacoes-client'

export default async function ConciliacoesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'financeiro:read')) redirect('/dashboard')
  return <ConciliacoesClient />
}
