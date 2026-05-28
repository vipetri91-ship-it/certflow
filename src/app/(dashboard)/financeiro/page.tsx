import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export default async function FinanceiroPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'financeiro:read')) redirect('/dashboard')
  redirect('/financeiro/contas-a-receber')
}
