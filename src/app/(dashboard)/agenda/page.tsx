import { Header } from '@/components/header'
import { AgendaFullScreen } from './agenda-fullscreen'

export default function AgendaPage() {
  return (
    <div className="flex flex-col h-full">
      <Header titulo="Agenda" />
      <div className="flex-1 overflow-hidden">
        <AgendaFullScreen />
      </div>
    </div>
  )
}
