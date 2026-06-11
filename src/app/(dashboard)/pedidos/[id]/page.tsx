import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Building2, CheckCircle2, Clock, XCircle, FileCheck, Paperclip, Ban } from 'lucide-react'
import { formatarData, formatarMoeda, formatarCPF, formatarCNPJ } from '@/lib/utils'
import { PedidoAcoes } from './acoes'
import { temPermissaoGranular } from '@/lib/permissoes-estrutura'
import { MOTIVOS_CANCELAMENTO_LABELS, podeCancelarPedido, type MotivoCancelamento } from '@/app/api/pedidos/[id]/cancelar/lib'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_INFO: Record<string, { label: string; cor: string; icone: React.ReactNode }> = {
  GERADO: { label: 'Gerado', cor: 'bg-blue-100 text-blue-700', icone: <Clock className="w-4 h-4" /> },
  VERIFICADO: { label: 'Verificado', cor: 'bg-yellow-100 text-yellow-700', icone: <FileCheck className="w-4 h-4" /> },
  EMITIDO: { label: 'Emitido', cor: 'bg-green-100 text-green-700', icone: <CheckCircle2 className="w-4 h-4" /> },
  CANCELADO: { label: 'Cancelado', cor: 'bg-red-100 text-red-700', icone: <XCircle className="w-4 h-4" /> },
}

export default async function PedidoDetalhePage({ params }: Props) {
  const { id } = await params

  const session = await auth()
  const role = session?.user.role ?? ''
  const monitorCancelarGerente = role === 'GERENTE' ? await temPermissaoGranular('GERENTE', 'monitor.cancelar') : false
  const podeCancelar = podeCancelarPedido(role, monitorCancelarGerente)

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      parceiro: { select: { id: true, nome: true } },
      usuario: { select: { nome: true } },
      itens: {
        include: { modelo: true },
      },
      lancamentos: {
        include: { categoria: { select: { nome: true, cor: true } } },
      },
      certificados: {
        include: { modelo: { select: { nome: true } } },
      },
    },
  })

  if (!pedido) notFound()

  const status = STATUS_INFO[pedido.status] ?? STATUS_INFO.GERADO

  // Histórico de cancelamento — fonte oficial é o AuditLog (ver
  // docs/ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md, seção 9-10)
  let cancelamento: {
    dataHora: Date
    usuario: string
    motivoCategoria?: string
    motivoTexto?: string
    protocoloSafeweb?: string
    resultadoSafeweb?: { ok: boolean; erro?: string; tratadoComo?: string }
  } | null = null

  if (pedido.canceladoEm) {
    const logs = await prisma.auditLog.findMany({
      where: { entidade: 'Pedido', entidadeId: id, acao: 'CANCELAR_PEDIDO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { usuario: { select: { nome: true } } },
    })

    const logCancelamento = logs.find(l => {
      const dados = l.dados as Record<string, unknown> | null
      return dados && typeof dados === 'object' && 'statusAnterior' in dados
    })

    if (logCancelamento) {
      const dados = logCancelamento.dados as Record<string, unknown>
      cancelamento = {
        dataHora: pedido.canceladoEm,
        usuario: logCancelamento.usuario?.nome ?? '—',
        motivoCategoria: dados.motivoCategoria as string | undefined,
        motivoTexto: dados.motivoTexto as string | undefined,
        protocoloSafeweb: dados.protocoloSafeweb as string | undefined,
        resultadoSafeweb: dados.resultadoSafeweb as { ok: boolean; erro?: string; tratadoComo?: string } | undefined,
      }
    } else {
      cancelamento = { dataHora: pedido.canceladoEm, usuario: '—' }
    }
  }

  return (
    <div>
      <Header titulo={`Pedido ${pedido.numero}`} />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

        {/* Cabeçalho */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900 font-mono">{pedido.numero}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.cor}`}>
                  {status.icone} {status.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">Criado em {formatarData(pedido.createdAt)} por {pedido.usuario.nome}</p>
              {pedido.agr && <p className="text-sm text-gray-500">AGR: <strong>{pedido.agr}</strong></p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <PedidoAcoes pedidoId={id} numeroPedido={pedido.numero} statusAtual={pedido.status} podeCancelar={podeCancelar} />
              <Link href="/pedidos" className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                {pedido.cliente.tipoPessoa === 'PJ' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <Link href={`/clientes/${pedido.cliente.id}`} className="font-medium text-blue-700 hover:underline">
                  {pedido.cliente.nome}
                </Link>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {pedido.cliente.cpf ? formatarCPF(pedido.cliente.cpf) : pedido.cliente.cnpj ? formatarCNPJ(pedido.cliente.cnpj) : '—'}
                </p>
                {pedido.cliente.email && <p className="text-xs text-gray-500">{pedido.cliente.email}</p>}
                {pedido.cliente.celular && <p className="text-xs text-gray-500">{pedido.cliente.celular}</p>}
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Pagamento</h2>
            <div className="space-y-2 text-sm">
              {pedido.formaPagamento && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Forma de pagamento</span>
                  <span className="font-medium">{pedido.formaPagamento}</span>
                </div>
              )}
              {pedido.tipoAtendimento && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo de atendimento</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${pedido.tipoAtendimento === 'videoconferencia' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {pedido.tipoAtendimento === 'videoconferencia' ? 'Videoconferência' : 'Presencial'}
                  </span>
                </div>
              )}
              {pedido.parceiro && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Parceiro indicador</span>
                  <Link href={`/parceiros/${pedido.parceiro.id}`} className="font-medium text-blue-700 hover:underline">
                    {pedido.parceiro.nome}
                  </Link>
                </div>
              )}
              {(pedido as any).safewebProtocolo && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Protocolo Safeweb</span>
                  <span className="font-mono font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                    {(pedido as any).safewebProtocolo}
                  </span>
                </div>
              )}
              {(pedido as any).hopeUrlDocumentos && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Documentação</span>
                  <a href={(pedido as any).hopeUrlDocumentos} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-teal-700 font-medium hover:underline">
                    <Paperclip className="w-3.5 h-3.5" /> Anexar documentação
                  </a>
                </div>
              )}
              {pedido.numeroCompra && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Nº compra Safeweb</span>
                  <span className="font-mono text-gray-800">{pedido.numeroCompra}</span>
                </div>
              )}
              {pedido.voucher && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Voucher</span>
                  <span className="font-mono text-gray-800">{pedido.voucher}</span>
                </div>
              )}
              {pedido.emitidoEm && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Emitido em</span>
                  <span>{formatarData(pedido.emitidoEm)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itens do pedido */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Certificados Solicitados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Qtd</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Preço unit.</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Desconto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedido.itens.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.modelo.nome}</p>
                      <p className="text-xs text-gray-400">{item.modelo.tipoCertificado} · {item.modelo.suporte} · {item.modelo.validadeMeses} meses</p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.quantidade}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatarMoeda(Number(item.precoUnit))}</td>
                    <td className="px-4 py-3 text-right text-red-500">{Number(item.desconto) > 0 ? `- ${formatarMoeda(Number(item.desconto))}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatarMoeda(Number(item.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-100">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-500">Desconto geral</td>
                  <td className="px-4 py-3 text-right text-sm text-red-500">
                    {Number(pedido.desconto) > 0 ? `- ${formatarMoeda(Number(pedido.desconto))}` : '—'}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-blue-700">{formatarMoeda(Number(pedido.valorFinal))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Observações */}
        {pedido.observacoes && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Observações</h2>
            <p className="text-sm text-gray-600">{pedido.observacoes}</p>
          </div>
        )}

        {/* Cancelamento */}
        {cancelamento && (
          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-500" /> Cancelamento
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Data/Hora</span>
                <span className="font-medium">{formatarData(cancelamento.dataHora)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cancelado por</span>
                <span className="font-medium">{cancelamento.usuario}</span>
              </div>
              {cancelamento.motivoCategoria && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Motivo</span>
                  <span className="font-medium">
                    {MOTIVOS_CANCELAMENTO_LABELS[cancelamento.motivoCategoria as MotivoCancelamento] ?? cancelamento.motivoCategoria}
                  </span>
                </div>
              )}
              {cancelamento.motivoTexto && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500 shrink-0">Observação</span>
                  <span className="text-right text-gray-700">{cancelamento.motivoTexto}</span>
                </div>
              )}
              {cancelamento.protocoloSafeweb && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Protocolo Safeweb</span>
                  <span className="font-mono">{cancelamento.protocoloSafeweb}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Resultado Safeweb</span>
                <span className="font-medium text-right">
                  {!cancelamento.protocoloSafeweb || cancelamento.resultadoSafeweb?.tratadoComo === 'sem_protocolo'
                    ? 'Sem protocolo vinculado'
                    : cancelamento.resultadoSafeweb?.tratadoComo === 'protocolo_ja_inexistente'
                    ? 'Protocolo já não existia na Safeweb'
                    : cancelamento.resultadoSafeweb?.ok
                    ? 'Cancelado na Safeweb'
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lançamentos financeiros */}
        {pedido.lancamentos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Lançamentos Financeiros</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {pedido.lancamentos.map(l => (
                <div key={l.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{l.descricao}</p>
                    <p className="text-xs text-gray-400">Vencimento: {formatarData(l.dataVencimento)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${l.tipo === 'RECEBER' ? 'text-green-700' : 'text-red-700'}`}>
                      {formatarMoeda(Number(l.valor))}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      l.status === 'PAGO' ? 'bg-green-100 text-green-700' :
                      l.status === 'VENCIDO' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{l.status}</span>
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