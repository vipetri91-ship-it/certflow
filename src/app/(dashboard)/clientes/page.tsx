import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { ClientesTabela } from './tabela'
import Link from 'next/link'
import { UserPlus, Upload } from 'lucide-react'

interface Props {
  searchParams: Promise<{ q?: string; tipo?: string; grupo?: string; page?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  const pagina = Number(params.page ?? 1)
  const porPagina = 20
  const skip = (pagina - 1) * porPagina

  const where = {
    ativo: true,
    ...(params.q
      ? {
          OR: [
            { nome:        { contains: params.q, mode: 'insensitive' as const } },
            { razaoSocial: { contains: params.q, mode: 'insensitive' as const } },
            { nomeFantasia: { contains: params.q, mode: 'insensitive' as const } },
            { email: { contains: params.q, mode: 'insensitive' as const } },
            { cpf:  { contains: params.q } },
            { cnpj: { contains: params.q } },
          ],
        }
      : {}),
    ...(params.tipo  ? { tipoPessoa: params.tipo as 'PF' | 'PJ' } : {}),
    ...(params.grupo ? { grupo: { contains: params.grupo, mode: 'insensitive' as const } } : {}),
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: {
        parceiro:           { select: { nome: true } },
        empresasResponsavel: { select: { id: true, nome: true, razaoSocial: true } },
        _count: { select: { certificados: true } },
      },
      orderBy: { nome: 'asc' },
      skip,
      take: porPagina,
    }),
    prisma.cliente.count({ where }),
  ])

  return (
    <div>
      <Header titulo="Clientes" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {total.toLocaleString('pt-BR')} cliente{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/clientes/importar"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Link>
            <Link
              href="/clientes/novo"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              Novo Cliente
            </Link>
          </div>
        </div>

        <ClientesTabela
          isAdmin={isAdmin}
          clientes={clientes.map((c) => ({
            ...c,
            cpf:          c.cpf          ?? undefined,
            cnpj:         c.cnpj         ?? undefined,
            email:        c.email        ?? undefined,
            celular:      c.celular      ?? undefined,
            razaoSocial:  c.razaoSocial  ?? undefined,
            nomeFantasia: c.nomeFantasia ?? undefined,
            parceiro:     c.parceiro     ?? undefined,
            empresasResponsavel: c.empresasResponsavel,
          }))}
          total={total}
          pagina={pagina}
          porPagina={porPagina}
        />
      </div>
    </div>
  )
}