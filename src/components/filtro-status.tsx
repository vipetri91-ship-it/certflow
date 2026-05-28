'use client'

import { useRouter } from 'next/navigation'

interface Props {
  basePath: string
  mes: number
  ano: number
  statusAtual: string
}

export function FiltroStatus({ basePath, mes, ano, statusAtual }: Props) {
  const router = useRouter()
  return (
    <select
      value={statusAtual}
      onChange={e => router.push(`${basePath}?mes=${mes}&ano=${ano}&status=${e.target.value}`)}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none"
    >
      <option value="">Todos os status</option>
      <option value="PENDENTE">Pendente</option>
      <option value="PAGO">Pago</option>
      <option value="VENCIDO">Vencido</option>
      <option value="CANCELADO">Cancelado</option>
    </select>
  )
}
