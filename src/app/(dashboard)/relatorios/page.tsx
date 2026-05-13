import { Header } from '@/components/header'
import { EmConstrucao } from '@/components/em-construcao'

export default function RelatoriosPage() {
  return (
    <div>
      <Header titulo="Relatórios" />
      <div className="p-6">
        <EmConstrucao modulo="Módulo de Relatórios" />
      </div>
    </div>
  )
}