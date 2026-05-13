import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { DollarSign } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function FinanceiroTab() {
  const hoje = new Date()
  const inicio = startOfMonth(hoje)
  const fim = endOfMonth(hoje)

  const [receber, pagar, recebido] = await Promise.all([
    prisma.lancamento.aggregate({
      _sum: { valor: true },
      where: { tipo: 'RECEBER', status: 'PENDENTE', dataVencimento: { gte: inicio, lte: fim } },
    }),
    prisma.lancamento.aggregate({
      _sum: { valor: true },
      where: { tipo: 'PAGAR', status: 'PENDENTE', dataVencimento: { gte: inicio, lte: fim } },
    }),
    prisma.lancamento.aggregate({
      _sum: { valor: true },
      where: { tipo: 'RECEBER', status: 'PAGO', dataPagamento: { gte: inicio, lte: fim } },
    }),
  ])

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">A Receber</p>
          <p className="text-2xl font-bold text-green-700">{fmt(Number(receber._sum.valor ?? 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">A Pagar</p>
          <p className="text-2xl font-bold text-red-600">{fmt(Number(pagar._sum.valor ?? 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Recebido no Mês</p>
          <p className="text-2xl font-bold text-blue-700">{fmt(Number(recebido._sum.valor ?? 0))}</p>
        </div>
      </div>
      <div className="flex justify-center pt-2">
        <Link href="/financeiro" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          Ver Financeiro Completo
        </Link>
      </div>
    </div>
  )
}