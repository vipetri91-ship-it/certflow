import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { buscarMetaVigente } from '@/lib/performance/metas'
import { SimuladorForm } from './form'

export default async function SimuladorPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:read')) redirect('/dashboard')

  const hoje = new Date()
  const meta = await buscarMetaVigente(hoje.getMonth() + 1, hoje.getFullYear())

  return (
    <div>
      <Header titulo="Simulador de Meta" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Ajuste os números hipotéticos abaixo pra ver como o ICF reagiria — nada aqui é salvo,
          é só pra planejar cenários (ex.: &quot;se produzirmos X e tivermos Y ocorrências, qual seria nosso ICF?&quot;).
        </p>
        <SimuladorForm metaAtual={meta} />
      </div>
    </div>
  )
}
