import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Phone, Mail, Building2 } from 'lucide-react'
import { formatarCNPJ, formatarCPF, formatarTelefone } from '@/lib/utils'

export default async function FornecedoresPage() {
  const fornecedores = await prisma.parceiro.findMany({
    where: { ativo: true, tipo: 'Fornecedor' },
    include: { _count: { select: { pedidos: true } } },
    orderBy: { nome: 'asc' },
  })

  return (
    <div>
      <Header titulo="Fornecedores" />
      <div className="p-4 lg:p-6 space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {fornecedores.length} fornecedor{fornecedores.length !== 1 ? 'es' : ''} cadastrado{fornecedores.length !== 1 ? 's' : ''}
          </p>
          <Link href="/fornecedores/novo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Novo Fornecedor
          </Link>
        </div>

        {fornecedores.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum fornecedor cadastrado</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Cadastre seus fornecedores de materiais e serviços</p>
            <Link href="/fornecedores/novo"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" /> Cadastrar primeiro fornecedor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fornecedores.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <Link href={`/fornecedores/${f.id}/editar`}
                    className="text-xs text-blue-500 hover:underline">
                    Editar
                  </Link>
                </div>
                <h3 className="font-semibold text-gray-900 truncate">{f.nome}</h3>
                {f.razaoSocial && <p className="text-xs text-gray-400 truncate">{f.razaoSocial}</p>}
                {(f.cnpj || f.cpf) && (
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {f.cnpj ? formatarCNPJ(f.cnpj) : f.cpf ? formatarCPF(f.cpf) : ''}
                  </p>
                )}
                <div className="mt-3 space-y-1">
                  {f.celular && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {formatarTelefone(f.celular)}
                    </div>
                  )}
                  {f.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {f.email}
                    </div>
                  )}
                </div>
                {f.chavePix && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400">PIX: <span className="font-mono text-gray-600">{f.chavePix}</span></p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}