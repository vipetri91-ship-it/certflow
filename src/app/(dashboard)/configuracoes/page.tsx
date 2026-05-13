import { Header } from '@/components/header'
import { EmConstrucao } from '@/components/em-construcao'

export default function ConfiguracoesPage() {
  return (
    <div>
      <Header titulo="Configurações do Sistema" />
      <div className="p-6">
        <EmConstrucao modulo="Configurações do Sistema" />
      </div>
    </div>
  )
}