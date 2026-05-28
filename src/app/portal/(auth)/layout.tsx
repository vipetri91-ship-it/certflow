import { redirect } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-session'
import { PortalShell } from '../portal-shell'

export default async function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')
  return <PortalShell parceiro={parceiro}>{children}</PortalShell>
}