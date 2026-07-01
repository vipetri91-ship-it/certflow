import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { EventosSafewebClient } from './client'

export default async function EventosSafewebPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const eventos = await prisma.eventoWebhook.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  // Marca todos como lidos ao abrir a página
  await prisma.eventoWebhook.updateMany({
    where: { lido: false },
    data:  { lido: true },
  })

  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Eventos Safeweb" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <EventosSafewebClient
          eventos={eventos.map((e: {
            id: string; evento: string; acao: string|null; protocolo: string
            numeroPedido: string|null; clienteNome: string|null; agr: string|null
            statusAntes: string|null; statusDepois: string|null; motivoRecusa: string|null
            lido: boolean; createdAt: Date; payload: unknown
          }) => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
            payload:   e.payload as Record<string, unknown> | null,
          }))}
        />
      </div>
    </div>
  )
}
