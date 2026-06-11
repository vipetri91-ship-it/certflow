import './future-lab.css'

export const metadata = {
  title: 'Centro de Comando | CertFlow Future Lab',
}

export default function DashboardFutureLayout({ children }: { children: React.ReactNode }) {
  return <div className="fl-root">{children}</div>
}
