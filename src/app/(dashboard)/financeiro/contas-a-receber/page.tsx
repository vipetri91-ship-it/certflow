import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, TrendingUp, AlertCircle, DollarSign, ExternalLink, Gift } from 'lucide-react'
import { formatarMoeda, formatarData } from '@/lib/utils'
import { STATUS_BADGE } from '@/lib/financeiro-config'
import { FiltroStatus } from '@/components/filtro-status'
import { FiltroAgr } from '@/components/filtro-agr'
import { FiltroBusca } from '@/components/filtro-busca'
import { BaixaButton, CancelarButton } from '@/components/financeiro-baixa-button'
import { InterCobrancaButton } from '@/components/inter-cobranca-button'
import { EditarValorLancamento } from '@/components/editar-valor-lancamento'

interface Props {
  searchParams: Promise<{ mes?: string; ano?: string; status?: string; agr?: string; busca?: string }>
}

const AGR_LABEL: Record<string, string> = {
  'vinicius':     'Vinicius',
  'arlen':        'Arlen',
  'ana.karolina': 'Ana K.',
  'laryssa':      'Laryssa',
}

export default async function ContasReceberPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'financeiro:read')) redirect('/dashboard')

  // FINANCEIRO e OPERADOR_FINANCEIRO só visualizam e dão baixa — não criam
  // lançamento novo (isso fica com ADMIN/GERENTE/OPERADOR).
  const isFinanceiro = ['FINANCEIRO', 'OPERADOR_FINANCEIRO'].includes(session.user.role)
  const params = await searchParams
  const hoje   = new Date()
  const mes    = Number(params.mes ?? hoje.getMonth() + 1)
  const ano    = Number(params.ano ?? hoje.getFullYear())
  const status = params.status ?? ''
  const agr    = params.agr    ?? ''
  const busca  = params.busca  ?? ''

  // "Bonificados" é uma opção dentro do próprio filtro de Status — não é
  // um valor real de StatusLancamento, então tratamos separadamente.
  const filtrandoBonificados = status === 'BONIFICADO'

  const inicio = new Date(ano, mes - 1, 1)
  const fim    = new Date(ano, mes, 0)

  // Constrói a querystring completa com os filtros atuais, permitindo
  // sobrescrever um deles — usado pelos links de mês, pra nenhum outro
  // filtro se perder ao trocar de mês.
  function paramsCompletos(overrides: Record<string, string | undefined> = {}) {
    const valores: Record<string, string> = { mes: String(mes), ano: String(ano), status, agr, busca }
    Object.assign(valores, overrides)
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(valores)) if (v) sp.set(k, v)
    return sp.toString()
  }

  const contas = await prisma.lancamento.findMany({
    where: {
      tipo: 'RECEBER',
      dataVencimento: { gte: inicio, lte: fim },
      ...(filtrandoBonificados
        ? { bonificado: true }
        : status ? { status: status as 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO', bonificado: false } : {}),
      ...(agr ? { pedido: { agr } } : {}),
      ...(busca ? {
        OR: [
          { pedido: { cliente: { nome:        { contains: busca, mode: 'insensitive' } } } },
          { pedido: { cliente: { razaoSocial: { contains: busca, mode: 'insensitive' } } } },
          { pedido: { cliente: { responsavel: { contains: busca, mode: 'insensitive' } } } },
          { parceiro: { nome: { contains: busca, mode: 'insensitive' } } },
          { descricao: { contains: busca, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      pedido: {
        select: {
          numero: true,
          agr: true,
          formaPagamento: true,
          unidadeAtendimento: true,
          cliente: { select: { nome: true, razaoSocial: true, responsavel: true } },
          itens:   { select: { modelo: { select: { nome: true } } }, take: 1 },
        },
      },
      parceiro: { select: { nome: true } },
    },
    orderBy: { dataVencimento: 'desc' },
  })

  const bonificados   = contas.filter(c => c.bonificado)
  const contasReais   = contas.filter(c => !c.bonificado)
  const totalPendente = contasReais
    .filter(c => c.status !== 'PAGO' && c.status !== 'CANCELADO')
    .reduce((s, c) => s + Number(c.valor), 0)
  const totalRecebido = contasReais
    .filter(c => c.status === 'PAGO')
    .reduce((s, c) => s + Number(c.valor), 0)
  const totalMes      = totalPendente + totalRecebido
  const vencidos      = contasReais.filter(c => c.status === 'PENDENTE' && new Date(c.dataVencimento) < hoje)

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  function nomeCliente(c: typeof contas[0]) {
    if (c.pedido?.cliente) return c.pedido.cliente.razaoSocial ?? c.pedido.cliente.nome
    if (c.parceiro)        return c.parceiro.nome
    return c.descricao
  }

  // Nome da pessoa física responsável pela empresa — ajuda a localizar a
  // conta quando o Pix chega no nome da PF em vez do nome da empresa.
  function responsavelCliente(c: typeof contas[0]) {
    return c.pedido?.cliente?.responsavel ?? null
  }

  function nomeCertificado(c: typeof contas[0]) {
    return c.pedido?.itens?.[0]?.modelo?.nome ?? c.tipoConta ?? '—'
  }

  function formaPgto(c: typeof contas[0]) {
    return c.formaPagamento ?? c.pedido?.formaPagamento ?? '—'
  }

  function nomeAgr(c: typeof contas[0]) {
    const key = c.pedido?.agr ?? ''
    return AGR_LABEL[key] ?? key ?? '—'
  }

  function unidade(c: typeof contas[0]) {
    // Pedido sempre tem a cidade real (Piracaia/Bragança Paulista); centroCusto
    // só é usado em lançamentos manuais sem pedido vinculado.
    return c.pedido?.unidadeAtendimento ?? c.centroCusto ?? '—'
  }

  return (
    <div>
      <Header titulo="Contas a Receber" />
      <div className="p-4 lg:p-6 space-y-4">

        {/* ── Resumo ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total do Mês',   valor: totalMes,      cor: 'text-blue-600',   icon: DollarSign,  extra: null },
            { label: 'A Receber',      valor: totalPendente, cor: 'text-green-600',  icon: TrendingUp,  extra: null },
            { label: 'Já Recebido',    valor: totalRecebido, cor: 'text-teal-600',   icon: TrendingUp,  extra: null },
            { label: `Vencidos (${vencidos.length})`, valor: vencidos.reduce((s, c) => s + Number(c.valor), 0), cor: 'text-red-500', icon: AlertCircle, extra: null },
            { label: `Bonificados (${bonificados.length})`, valor: null, cor: 'text-purple-600', icon: Gift, extra: `${bonificados.length} cert.` },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
              <div className={`flex items-center gap-2 mb-2 ${card.cor}`}>
                <card.icon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">{card.label}</span>
              </div>
              {card.extra !== null
                ? <p className="text-lg font-bold text-gray-900 dark:text-white">{card.extra}</p>
                : <p className="text-lg font-bold text-gray-900 dark:text-white">{formatarMoeda(card.valor!)}</p>
              }
            </div>
          ))}
        </div>

        {/* ── Filtros ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm px-4 py-3 overflow-x-auto">
          {/* Meses */}
          <div className="flex gap-1 shrink-0">
            {meses.map((nome, i) => {
              const m = i + 1
              const href = `/financeiro/contas-a-receber?${paramsCompletos({ mes: String(m) })}`
              return (
                <Link key={m} href={href}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${m === mes ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {nome}
                </Link>
              )
            })}
          </div>

          {/* Controles direita */}
          <div className="flex items-center gap-2 shrink-0">
            <FiltroBusca
              basePath="/financeiro/contas-a-receber"
              buscaAtual={busca}
              outrosParams={paramsCompletos({ busca: undefined })}
            />
            <FiltroAgr
              basePath="/financeiro/contas-a-receber"
              mes={mes} ano={ano} statusAtual={status} agrAtual={agr}
              outrosParams={paramsCompletos({ agr: undefined })}
            />
            <FiltroStatus
              basePath="/financeiro/contas-a-receber"
              mes={mes} ano={ano} statusAtual={status}
              outrosParams={paramsCompletos({ status: undefined })}
            />
            {!isFinanceiro && (
              <Link href="/financeiro/contas-a-receber/novo"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
                <Plus className="w-4 h-4" /> Nova Conta
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabela ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  {['Cliente', 'Categoria', 'Forma Pgto', 'AGR', 'Unidade', 'Data', 'Valor', 'Status', 'Ação'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                {contas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                      Nenhuma conta a receber neste período
                    </td>
                  </tr>
                )}
                {contas.map(c => {
                  const diasVencido = Math.floor((hoje.getTime() - new Date(c.dataVencimento).getTime()) / 86_400_000)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                      {/* Cliente */}
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight truncate max-w-[180px]">
                          {nomeCliente(c)}
                        </p>
                        {responsavelCliente(c) && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate max-w-[180px]">
                            {responsavelCliente(c)}
                          </p>
                        )}
                      </td>

                      {/* Certificado */}
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300 max-w-[140px]">
                        <span className="truncate block">{nomeCertificado(c)}</span>
                      </td>

                      {/* Forma de pagamento */}
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                        {c.bonificado
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium"><Gift className="w-3 h-3" />Bonificado</span>
                          : formaPgto(c)
                        }
                      </td>

                      {/* AGR */}
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                          {nomeAgr(c)}
                        </span>
                      </td>

                      {/* Unidade */}
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400">
                        {unidade(c)}
                      </td>

                      {/* Data */}
                      <td className="px-3 py-3">
                        <p className="text-xs text-gray-600 dark:text-slate-300">{formatarData(c.dataVencimento)}</p>
                        {c.status === 'PENDENTE' && diasVencido > 0 && (
                          <p className="text-xs text-red-500 font-medium">{diasVencido}d atraso</p>
                        )}
                        {c.dataPagamento && (
                          <p className="text-xs text-green-600">Pago {formatarData(c.dataPagamento)}</p>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="px-3 py-3">
                        {!c.bonificado && (c.status === 'PENDENTE' || c.status === 'VENCIDO') ? (
                          <EditarValorLancamento id={c.id} valor={Number(c.valor)} />
                        ) : (
                          <span className="font-bold text-green-700 dark:text-green-400 text-sm">
                            {formatarMoeda(Number(c.valor))}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[c.status]}`}>
                          {c.status === 'PENDENTE' ? 'Pendente'
                           : c.status === 'PAGO'     ? 'Pago'
                           : c.status === 'VENCIDO'  ? 'Vencido'
                           : 'Cancelado'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {!c.bonificado && (c.status === 'PENDENTE' || c.status === 'VENCIDO') && (
                            <BaixaButton id={c.id} />
                          )}
                          {!c.bonificado && (c.status === 'PENDENTE' || c.status === 'VENCIDO') && c.pedido && (
                            <InterCobrancaButton
                              lancamentoId={c.id}
                              jaTemCobranca={!!c.interCobrancaId}
                              linhaDigitavel={c.boleto}
                              pixCopiaECola={c.pixCopiaECola}
                            />
                          )}
                          {!c.bonificado && (c.status === 'PENDENTE' || c.status === 'VENCIDO') && (
                            <CancelarButton id={c.id} />
                          )}
                          {c.status === 'PAGO' && c.comprovante && (
                            <a href={c.comprovante} target="_blank" rel="noopener noreferrer"
                              title="Ver comprovante"
                              className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da tabela */}
          {contas.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
              <span>{contas.length} registro{contas.length !== 1 ? 's' : ''}</span>
              <span>
                Pendente: <strong className="text-gray-700 dark:text-slate-300">{formatarMoeda(totalPendente)}</strong>
                {' · '}
                Recebido: <strong className="text-green-600">{formatarMoeda(totalRecebido)}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
