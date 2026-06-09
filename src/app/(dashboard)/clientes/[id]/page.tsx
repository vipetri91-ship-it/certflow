import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Award, RefreshCw, Building2, User, Phone, Mail, MapPin } from 'lucide-react'
import { formatarData, formatarMoeda, formatarCPF, formatarCNPJ, formatarTelefone, diasParaVencimento } from '@/lib/utils'
import { RenovarButton } from './renovar-button'
import { CadastrarCertificado } from './cadastrar-certificado'
import { DeletarClienteButton } from './deletar-button'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  const modelos = await prisma.modeloCertificado.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
    orderBy: [{ tipoPessoa: 'asc' }, { nome: 'asc' }],
  })

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      parceiro: { select: { id: true, nome: true } },
      certificados: {
        include: {
          modelo: true,
          pedido: { select: { numero: true, agr: true, tipoAtendimento: true, numeroCompra: true, valorFinal: true } },
        },
        orderBy: { dataEmissao: 'desc' },
      },
      pedidos: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, numero: true, valorFinal: true, status: true, createdAt: true, agr: true },
      },
    },
  })

  if (!cliente) notFound()

  const tipoBadge = cliente.tipoPessoa === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'

  return (
    <div>
      <Header titulo="Informações do Cliente" />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

        {/* Cabeçalho */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tipoBadge}`}>
                {cliente.tipoPessoa === 'PJ' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{cliente.nome}</h1>
                {cliente.nomeFantasia && <p className="text-sm text-blue-600 font-medium">{cliente.nomeFantasia}</p>}
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  {cliente.cpf && <span className="font-mono">CPF: {formatarCPF(cliente.cpf)}</span>}
                  {cliente.cnpj && <span className="font-mono">CNPJ: {formatarCNPJ(cliente.cnpj)}</span>}
                  {cliente.parceiro && <span>🤝 {cliente.parceiro.nome}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {isAdmin && (
                <DeletarClienteButton clienteId={id} nomeCliente={cliente.nome} />
              )}
              <Link
                href={`/clientes/${id}/editar`}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <Edit className="w-4 h-4" /> Editar
              </Link>
              <Link
                href="/clientes"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Link>
            </div>
          </div>

          {/* Dados de contato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            {cliente.celular && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {formatarTelefone(cliente.celular)}
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {cliente.email}
              </div>
            )}
            {cliente.cidade && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {cliente.cidade} / {cliente.estado}
              </div>
            )}
            {cliente.responsavel && (
              <div className="text-sm text-gray-600">
                <span className="text-gray-400">Responsável:</span> {cliente.responsavel}
              </div>
            )}
            {cliente.observacoes && (
              <div className="sm:col-span-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {cliente.observacoes}
              </div>
            )}
          </div>
        </div>

        {/* Certificados */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Certificado(s) do Cliente
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{cliente.certificados.length} certificado{cliente.certificados.length !== 1 ? 's' : ''}</span>
              <CadastrarCertificado clienteId={id} modelos={modelos} />
            </div>
          </div>

          {cliente.certificados.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">Nenhum certificado emitido</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Protocolo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">AGR</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Renovação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cliente.certificados.map((cert, idx) => {
                    const dias = diasParaVencimento(cert.dataVencimento)
                    const vencimentoCor = cert.status === 'VENCIDO' || dias < 0
                      ? 'text-red-600' : dias <= 30 ? 'text-orange-500' : 'text-gray-600'

                    return (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                          #{String(idx + 1).padStart(4, '0')}
                          <div className="text-blue-600 font-semibold">{cert.pedido?.numero?.replace('PED-', '') ?? ''}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatarData(cert.dataEmissao)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cert.modelo.nome}</p>
                          <p className="text-xs text-gray-400">{cert.modelo.tipoCertificado} · {cert.modelo.suporte}</p>
                          {cert.pedido?.tipoAtendimento && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cert.pedido.tipoAtendimento === 'videoconferencia' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                              {cert.pedido.tipoAtendimento === 'videoconferencia' ? 'Vídeo' : 'Presencial'}
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 ${vencimentoCor}`}>
                          {formatarData(cert.dataVencimento)}
                          {dias >= 0 && <div className="text-xs">{dias}d restantes</div>}
                          {dias < 0 && <div className="text-xs font-medium">Vencido</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatarMoeda(Number(cert.pedido?.valorFinal ?? 0))}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {cert.numeroSerie ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {cert.pedido?.agr ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            cert.status === 'ATIVO' ? 'bg-green-100 text-green-700' :
                            cert.status === 'VENCIDO' ? 'bg-red-100 text-red-700' :
                            cert.status === 'RENOVADO' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {cert.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cert.status === 'ATIVO' ? (
                            <RenovarButton certificadoId={cert.id} />
                          ) : cert.status === 'RENOVADO' ? (
                            <span className="text-xs text-blue-500">✓ Renovado</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Últimos pedidos */}
        {cliente.pedidos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Últimos Pedidos</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {cliente.pedidos.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 font-mono">{p.numero}</p>
                    <p className="text-xs text-gray-400">{formatarData(p.createdAt)} · {p.agr ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatarMoeda(Number(p.valorFinal))}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'EMITIDO' ? 'bg-green-100 text-green-700' :
                      p.status === 'VERIFICADO' ? 'bg-yellow-100 text-yellow-700' :
                      p.status === 'GERADO' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
