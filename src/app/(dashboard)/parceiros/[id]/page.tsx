import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Users, ShoppingBag, Percent, Landmark, User, Building2 } from 'lucide-react'
import { formatarData, formatarMoeda, formatarCPF, formatarCNPJ, formatarTelefone } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_COR: Record<string, string> = {
  EMITIDO: 'bg-green-100 text-green-700',
  VERIFICADO: 'bg-yellow-100 text-yellow-700',
  GERADO: 'bg-blue-100 text-blue-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

export default async function ParceiroDetalhePage({ params }: Props) {
  const { id } = await params

  const parceiro = await prisma.parceiro.findUnique({
    where: { id },
    include: {
      clientes: {
        where: { ativo: true },
        select: { id: true, nome: true, tipoPessoa: true, cpf: true, cnpj: true, createdAt: true },
        orderBy: { nome: 'asc' },
      },
      comissoes: {
        include: { modelo: { select: { nome: true, preco: true } } },
      },
      pedidos: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          cliente: { select: { nome: true } },
          itens: { include: { modelo: { select: { nome: true } } } },
        },
      },
    },
  })

  if (!parceiro) notFound()

  const totalVendas = parceiro.pedidos.reduce((acc, p) => acc + Number(p.valorFinal), 0)

  return (
    <div>
      <Header titulo="Detalhes do Parceiro" />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

        {/* Cabeçalho */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                {parceiro.tipoPessoa === 'PJ' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{parceiro.nome}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{parceiro.tipo}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{parceiro.tipoPessoa}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  {parceiro.cpf && <span className="font-mono">CPF: {formatarCPF(parceiro.cpf)}</span>}
                  {parceiro.cnpj && <span className="font-mono">CNPJ: {formatarCNPJ(parceiro.cnpj)}</span>}
                  {parceiro.email && <span>{parceiro.email}</span>}
                  {parceiro.celular && <span>{formatarTelefone(parceiro.celular)}</span>}
                  {parceiro.telefone && <span>{formatarTelefone(parceiro.telefone)}</span>}
                </div>
                {(parceiro.contadorResponsavel || parceiro.pessoaContato) && (
                  <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-500">
                    {parceiro.contadorResponsavel && (
                      <span><span className="text-gray-400">Contador:</span> <span className="font-medium text-gray-700">{parceiro.contadorResponsavel}</span></span>
                    )}
                    {parceiro.pessoaContato && (
                      <span><span className="text-gray-400">Contato:</span> <span className="font-medium text-gray-700">{parceiro.pessoaContato}</span></span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/parceiros/${id}/editar`} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
                <Edit className="w-4 h-4" /> Editar
              </Link>
              <Link href="/parceiros" className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Link>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{parceiro.clientes.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Clientes indicados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{parceiro.pedidos.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pedidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{formatarMoeda(totalVendas)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total em vendas</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Dados bancários */}
          {(parceiro.chavePix || parceiro.banco) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Landmark className="w-4 h-4 text-blue-600" /> Dados Bancários
              </h2>
              <div className="space-y-2 text-sm">
                {parceiro.chavePix && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chave PIX</span>
                    <span className="font-medium font-mono text-gray-800">{parceiro.chavePix}</span>
                  </div>
                )}
                {parceiro.banco && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Banco</span>
                    <span className="font-medium text-gray-800">{parceiro.banco}</span>
                  </div>
                )}
                {parceiro.tipoConta && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo de conta</span>
                    <span className="font-medium text-gray-800">{parceiro.tipoConta}</span>
                  </div>
                )}
                {parceiro.agencia && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Agência</span>
                    <span className="font-mono text-gray-800">{parceiro.agencia}</span>
                  </div>
                )}
                {parceiro.conta && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conta</span>
                    <span className="font-mono text-gray-800">{parceiro.conta}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comissões */}
          {parceiro.comissoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Percent className="w-4 h-4 text-blue-600" /> Comissões por Modelo
              </h2>
              <div className="space-y-2">
                {parceiro.comissoes.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{c.modelo.nome}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-blue-700">{Number(c.percentual).toFixed(0)}%</span>
                      {c.valorFixo && (
                        <span className="text-xs text-gray-400 ml-2">ou {formatarMoeda(Number(c.valorFixo))}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clientes indicados */}
        {parceiro.clientes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Clientes Indicados
              </h2>
              <span className="text-xs text-gray-400">{parceiro.clientes.length} cliente{parceiro.clientes.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {parceiro.clientes.map(c => (
                <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {c.tipoPessoa === 'PF' && c.cpf ? formatarCPF(c.cpf) : c.cnpj ? formatarCNPJ(c.cnpj) : c.tipoPessoa}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{formatarData(c.createdAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Últimos pedidos */}
        {parceiro.pedidos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" /> Últimos Pedidos
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pedido</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parceiro.pedidos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.numero}</td>
                      <td className="px-4 py-3 text-gray-700">{p.cliente.nome}</td>
                      <td className="px-4 py-3 text-gray-500">{formatarData(p.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatarMoeda(Number(p.valorFinal))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}