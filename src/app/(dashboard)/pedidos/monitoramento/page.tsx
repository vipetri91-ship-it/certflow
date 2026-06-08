import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Video, MapPin, Globe } from 'lucide-react'
import { formatarData, formatarHora, formatarMoeda, formatarCPF, formatarCNPJ } from '@/lib/utils'
import { MonitoramentoAcoes } from './acoes'

interface SearchParams {
  agr?: string
  status?: string
  de?: string
  ate?: string
  busca?: string
}
interface Props { searchParams: Promise<SearchParams> }

const STATUS_MAP: Record<string, string> = {
  'em-aberto': 'GERADO',
  'pendente': 'VERIFICADO',
  'emitido': 'EMITIDO',
  'cancelado': 'CANCELADO',
}

const STATUS_COR: Record<string, string> = {
  GERADO: 'bg-yellow-100 text-yellow-700',
  VERIFICADO: 'bg-blue-100 text-blue-700',
  EMITIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  GERADO: 'Em Aberto',
  VERIFICADO: 'Pendente',
  EMITIDO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

export default async function MonitoramentoPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams
  const statusFiltro = sp.status ? STATUS_MAP[sp.status] : undefined

  const where: Record<string, unknown> = {}
  if (statusFiltro) where.status = statusFiltro
  if (!statusFiltro && !sp.status) where.status = { in: ['GERADO', 'VERIFICADO'] } // padrão: fila ativa
  if (sp.agr) where.agr = sp.agr
  if (sp.de || sp.ate) {
    where.createdAt = {
      ...(sp.de ? { gte: new Date(sp.de + 'T00:00:00') } : {}),
      ...(sp.ate ? { lte: new Date(sp.ate + 'T23:59:59') } : {}),
    }
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      cliente: { select: { nome: true, tipoPessoa: true, cpf: true, cnpj: true } },
      itens: { include: { modelo: { select: { nome: true, tipoCertificado: true, suporte: true } } } },
      parceiro: { select: { nome: true, celular: true, telefone: true, razaoSocial: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const filtrados = sp.busca
    ? pedidos.filter(p =>
        p.cliente.nome.toLowerCase().includes(sp.busca!.toLowerCase()) ||
        p.numero.includes(sp.busca!) ||
        (p.numeroCompra ?? '').includes(sp.busca!) ||
        (p.cliente.cpf ?? '').includes(sp.busca!.replace(/\D/g,'')) ||
        (p.cliente.cnpj ?? '').includes(sp.busca!.replace(/\D/g,''))
      )
    : pedidos

  return (
    <div>
      <Header titulo="Monitoramento Interno" />
      <div className="p-4 lg:p-6 space-y-4">

        {/* Filtros */}
        <form className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
              <input name="busca" defaultValue={sp.busca} placeholder="Nome, protocolo, CPF..." className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">AGR</label>
              <select name="agr" defaultValue={sp.agr ?? ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="vinicius">Vinicius</option>
                <option value="arlen">Arlen</option>
                <option value="ana.karolina">Ana Karolina</option>
                <option value="laryssa">Laryssa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select name="status" defaultValue={sp.status ?? ''} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Em Aberto + Pendentes</option>
                <option value="em-aberto">Em Aberto</option>
                <option value="pendente">Pendentes</option>
                <option value="emitido">Finalizados</option>
                <option value="cancelado">Cancelados</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
              <input type="date" name="de" defaultValue={sp.de} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
              <input type="date" name="ate" defaultValue={sp.ate} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              Pesquisar
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{filtrados.length} atendimento{filtrados.length !== 1 ? 's' : ''}</p>
          <Link href="/pedidos/nova-venda" className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition">
            + Nova Venda
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Parceiro</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Certificado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Protocolo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">AGR</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Data</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Nenhum atendimento encontrado</td>
                  </tr>
                )}
                {filtrados.map(p => {
                  const item = p.itens[0]
                  const doc = p.cliente.cpf ? formatarCPF(p.cliente.cpf) : p.cliente.cnpj ? formatarCNPJ(p.cliente.cnpj) : '—'
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <Link href={`/pedidos/${p.id}`} className="font-medium text-blue-700 hover:underline block truncate max-w-[160px]">
                          {p.cliente.nome}
                        </Link>
                        <span className="text-xs font-mono text-gray-400">{doc}</span>
                      </td>

                      {/* Coluna Parceiro */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {p.parceiro ? (
                          <>
                            <p className="text-sm text-gray-700 font-medium truncate max-w-[160px]">
                              {p.parceiro.razaoSocial ?? p.parceiro.nome}
                            </p>
                            {(p.parceiro.celular || p.parceiro.telefone) && (
                              <p className="text-xs text-gray-400">
                                {p.parceiro.celular ?? p.parceiro.telefone}
                              </p>
                            )}
                          </>
                        ) : (p as any).contabilidade ? (
                          <p className="text-sm text-gray-600 truncate max-w-[160px]">{(p as any).contabilidade}</p>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        {item ? (
                          <>
                            <p className="text-gray-800">{item.modelo.nome}</p>
                            <p className="text-xs text-gray-400">{item.modelo.tipoCertificado} · {item.modelo.suporte}</p>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold hidden sm:table-cell">{formatarMoeda(Number(p.valorFinal))}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {(p.safewebProtocolo ?? p.numeroCompra) ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-800">
                            {p.tipoAtendimento === 'videoconferencia' ? (
                              <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" aria-label="Videoconferência">
                                <title>Videoconferência</title>
                              </Video>
                            ) : p.tipoAtendimento === 'presencial' ? (
                              <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" aria-label="Presencial">
                                <title>Presencial</title>
                              </MapPin>
                            ) : p.tipoAtendimento === 'emissao-online' ? (
                              <Globe className="w-3.5 h-3.5 text-purple-600 shrink-0" aria-label="Emissão Online">
                                <title>Emissão Online</title>
                              </Globe>
                            ) : null}
                            {p.safewebProtocolo ?? p.numeroCompra}
                          </span>
                        ) : (
                          <MonitoramentoAcoes pedidoId={p.id} tipo="protocolo" />
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-gray-700 capitalize">{p.agr ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap hidden xl:table-cell">
                        <div>{formatarData(p.createdAt)}</div>
                        <div className="text-gray-400">{formatarHora(p.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MonitoramentoAcoes pedidoId={p.id} statusAtual={p.status} tipo="status" tipoAtendimento={p.tipoAtendimento} />
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
