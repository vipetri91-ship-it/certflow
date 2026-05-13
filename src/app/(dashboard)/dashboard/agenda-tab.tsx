import Link from 'next/link'
import { Calendar } from 'lucide-react'

export function AgendaTabDash() {
  return (
    <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-64">
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
        <Calendar className="w-8 h-8 text-blue-600" />
      </div>
      <h2 className="font-semibold text-gray-900 text-lg">Google Agenda</h2>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        Agende atendimentos e visualize a agenda da equipe diretamente integrada ao Google Calendar.
      </p>
      <Link
        href="/agenda"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
      >
        Abrir Agenda
      </Link>
    </div>
  )
}