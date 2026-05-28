import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GraficoCertificados } from '../grafico-certificados'

async function getDados(parceiroId: string) {
  const hoje = new Date()
  const meses: { mes: string; total: number; label: string }[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0, 23, 59, 59)
    const total = await prisma.pedido.count({
      where: {
        parceiroId,
        createdAt: { gte: d, lte: fim },
        status: { not: 'CANCELADO' },
      },
    })
    meses.push({
      mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      total,
    })
  }
  return meses
}

export default async function PortalPage() {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')

  const dados = await getDados(parceiro.id)
  const nomeExibicao = parceiro.nomeFantasia || parceiro.razaoSocial || parceiro.nome
  const totalMesAtual = dados[dados.length - 1]?.total ?? 0
  const totalGeral = dados.reduce((s, d) => s + d.total, 0)

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Banner de boas-vindas */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl px-6 py-5 text-white">
        <p className="text-xl md:text-2xl font-bold mb-1">Que bom ter você aqui!</p>
        <p className="text-blue-100 text-sm leading-relaxed">Acompanhe suas indicações e o desempenho da sua parceria com a V&G. Conte conosco para crescer juntos!</p>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Indicações este mês</p>
          <p className="text-3xl font-bold text-blue-600">{totalMesAtual}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total nos últimos 12 meses</p>
          <p className="text-3xl font-bold text-gray-800">{totalGeral}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Gráfico de Indicações — Últimos 12 meses</h2>
        <GraficoCertificados dados={dados} />
      </div>
    </div>
  )
}
