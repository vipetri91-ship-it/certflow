import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Handshake } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { obterComissoesParceiro } from '@/lib/comissoes'
import { prisma } from '@/lib/prisma'
import { ComissoesParceiroPainel } from '@/components/comissoes-parceiro-painel'

interface Props {
  searchParams: Promise<{ parceiroId?: string }>
}

export default async function ComissoesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  const { parceiroId } = await searchParams

  const parceiros = await prisma.parceiro.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  const resumo = parceiroId ? await obterComissoesParceiro(parceiroId) : null

  return (
    <div>
      <Header titulo="Comissões de Parceiros" />
      <div className="p-4 lg:p-6 space-y-5">

        {/* Seletor de parceiro */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-3">
            <Handshake className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Selecione o parceiro</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {parceiros.map((p) => (
              <Link
                key={p.id}
                href={`/financeiro/comissoes?parceiroId=${p.id}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${p.id === parceiroId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {p.nome}
              </Link>
            ))}
          </div>
        </div>

        {!parceiroId && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            Escolha um parceiro acima para ver as comissões pendentes e já pagas.
          </div>
        )}

        {parceiroId && !resumo && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            Parceiro não encontrado.
          </div>
        )}

        {resumo && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-medium uppercase text-gray-500 mb-2">Total Pendente</p>
                <p className="text-xl font-bold text-orange-700">{formatarMoeda(resumo.totalPendente)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-medium uppercase text-gray-500 mb-2">Clientes Pendentes</p>
                <p className="text-xl font-bold text-gray-900">{resumo.pendentes.length}</p>
              </div>
              {resumo.pedidosSemComissaoConfigurada > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-medium uppercase text-gray-500 mb-2">Sem comissão configurada</p>
                  <p className="text-xl font-bold text-gray-400">{resumo.pedidosSemComissaoConfigurada}</p>
                </div>
              )}
            </div>

            <ComissoesParceiroPainel
              parceiroId={resumo.parceiroId}
              pendentes={resumo.pendentes.map((l) => ({ ...l, emitidoEm: l.emitidoEm.toISOString(), pagoEm: l.pagoEm ? l.pagoEm.toISOString() : null }))}
              pagas={resumo.pagas.map((l) => ({ ...l, emitidoEm: l.emitidoEm.toISOString(), pagoEm: l.pagoEm ? l.pagoEm.toISOString() : null }))}
            />
          </>
        )}
      </div>
    </div>
  )
}
