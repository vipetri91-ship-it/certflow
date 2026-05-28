import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Award, AlertTriangle, Plus } from 'lucide-react'
import { formatarData, diasParaVencimento } from '@/lib/utils'
import { addDays } from 'date-fns'

interface Props {
  searchParams: Promise<{ status?: string; vencendo?: string }>
}

export default async function CertificadosPage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = new Date()
  const em60dias = addDays(hoje, 60)

  const where = {
    ...(params.status ? { status: params.status as 'ATIVO' | 'VENCIDO' | 'CANCELADO' | 'RENOVADO' } : { status: 'ATIVO' as const }),
    ...(params.vencendo === '60' ? { dataVencimento: { gte: hoje, lte: em60dias } } : {}),
  }

  const certificados = await prisma.certificado.findMany({
    where,
    include: {
      cliente: { select: { nome: true, tipoPessoa: true } },
      modelo: true,
    },
    orderBy: { dataVencimento: 'asc' },
    take: 50,
  })

  const statusBadge = {
    ATIVO: 'bg-green-100 text-green-700',
    VENCIDO: 'bg-red-100 text-red-700',
    CANCELADO: 'bg-gray-100 text-gray-600',
    RENOVADO: 'bg-blue-100 text-blue-700',
  }

  return (
    <div>
      <Header titulo="Certificados" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/certificados"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!params.vencendo ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            Todos Ativos
          </Link>
          <Link
            href="/certificados?vencendo=60"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${params.vencendo === '60' ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Vencendo em 60 dias
          </Link>
          <Link
            href="/certificados?status=VENCIDO"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${params.status === 'VENCIDO' ? 'bg-red-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            Vencidos
          </Link>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              {certificados.length} certificado{certificados.length !== 1 ? 's' : ''}
            </p>
            <Link
              href="/pedidos/novo"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Emissão</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Dias</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {certificados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum certificado encontrado
                    </td>
                  </tr>
                )}
                {certificados.map((cert) => {
                  const dias = diasParaVencimento(cert.dataVencimento)
                  const alertaCor =
                    dias < 0
                      ? 'text-red-600 font-bold'
                      : dias <= 15
                        ? 'text-red-500 font-semibold'
                        : dias <= 30
                          ? 'text-orange-500 font-medium'
                          : 'text-gray-600'

                  return (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{cert.cliente.nome}</p>
                        <p className="text-xs text-gray-400">{cert.cliente.tipoPessoa}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{cert.modelo.nome}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-gray-700">
                            {cert.modelo.tipoCertificado}
                          </span>
                          <span className="text-xs text-gray-400">
                            {cert.modelo.suporte}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatarData(cert.dataEmissao)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatarData(cert.dataVencimento)}</td>
                      <td className={`px-4 py-3 text-center ${alertaCor}`}>
                        {dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[cert.status]}`}>
                          {cert.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}