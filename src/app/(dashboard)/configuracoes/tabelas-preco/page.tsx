import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Tags } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { TabelaPrecoEditor } from '@/components/tabela-preco-editor'

interface Props {
  searchParams: Promise<{ tabelaId?: string }>
}

export default async function TabelasPrecoPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  const { tabelaId } = await searchParams

  const [tabelas, modelos] = await Promise.all([
    prisma.tabelaPreco.findMany({
      include: { itens: true, _count: { select: { parceiros: true } } },
      orderBy: { nome: 'asc' },
    }),
    prisma.modeloCertificado.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, preco: true, validadeMeses: true, tipoPessoa: true },
    }),
  ])

  const tabelaSelecionada = tabelas.find((t) => t.id === tabelaId) ?? tabelas[0] ?? null

  return (
    <div>
      <Header titulo="Tabelas de Preço de Custo" />
      <div className="p-4 lg:p-6 space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-3">
            <Tags className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Tabelas cadastradas</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabelas.map((t) => (
              <Link
                key={t.id}
                href={`/configuracoes/tabelas-preco?tabelaId=${t.id}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${t.id === tabelaSelecionada?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t.nome} <span className="opacity-60">({t.itens.length} modelos · {t._count.parceiros} parceiro{t._count.parceiros !== 1 ? 's' : ''})</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Editar uma tabela atualiza automaticamente o custo de todos os parceiros vinculados a ela.
          </p>
        </div>

        {tabelaSelecionada ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="font-semibold text-gray-900 mb-3">{tabelaSelecionada.nome}</p>
            <TabelaPrecoEditor
              tabelaId={tabelaSelecionada.id}
              modelos={modelos.map((m) => ({ ...m, preco: Number(m.preco) }))}
              itensExistentes={tabelaSelecionada.itens.map((i) => ({ modeloId: i.modeloId, valorCusto: Number(i.valorCusto) }))}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
            Nenhuma tabela cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  )
}
