'use client'

import { useRouter } from 'next/navigation'

interface Props {
  basePath: string
  mes: number
  ano: number
  statusAtual: string
  // demais filtros já aplicados, para não se perderem ao trocar o status
  outrosParams?: string
}

export function FiltroStatus({ basePath, mes, ano, statusAtual, outrosParams }: Props) {
  const router = useRouter()

  function navegar(status: string) {
    const params = new URLSearchParams(outrosParams)
    params.set('mes', String(mes))
    params.set('ano', String(ano))
    if (status) params.set('status', status)
    else params.delete('status')
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <select
      value={statusAtual}
      onChange={e => navegar(e.target.value)}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none"
    >
      <option value="">Todos os status</option>
      <option value="PENDENTE">Pendente</option>
      <option value="PAGO">Pago</option>
      <option value="VENCIDO">Vencido</option>
      <option value="CANCELADO">Cancelado</option>
      <option value="BONIFICADO">Bonificados</option>
    </select>
  )
}
