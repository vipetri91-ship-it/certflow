import { Header } from '@/components/header'
import { AgendaView } from './agenda-view'

export default async function AgendaPage() {
  // Busca os calendários disponíveis via Apps Script
  let calendarios: { id: string; nome: string }[] = []
  let conectado = false

  try {
    const scriptUrl = process.env.APPS_SCRIPT_URL
    const token = process.env.APPS_SCRIPT_TOKEN

    if (scriptUrl) {
      const res = await fetch(`${scriptUrl}?token=${token}`, {
        redirect: 'follow',
        cache: 'no-store',
      })
      const data = await res.json()
      conectado = data.ok
      calendarios = data.calendarios ?? []
    }
  } catch {
    conectado = false
  }

  return (
    <div>
      <Header titulo="Google Agenda" />
      <AgendaView conectado={conectado} calendarios={calendarios} />
    </div>
  )
}