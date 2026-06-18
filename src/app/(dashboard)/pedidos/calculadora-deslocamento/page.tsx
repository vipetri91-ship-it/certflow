import { Header } from '@/components/header'
import { WidgetCalculadora } from '../../dashboard/widget-calculadora'

export default function CalculadoraDeslocamentoPage() {
  return (
    <div>
      <Header titulo="Calculadora de Deslocamento" />
      <div className="p-4 lg:p-6 max-w-md mx-auto">
        <WidgetCalculadora />
      </div>
    </div>
  )
}
