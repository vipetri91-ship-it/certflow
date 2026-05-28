import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const STATUS_CONFIG = {
  EMITIDO:    { label: 'Emitido',       cls: 'bg-green-100 text-green-700' },
  GERADO:     { label: 'Em Validação',  cls: 'bg-blue-100 text-blue-700'  },
  VERIFICADO: { label: 'Em Validação',  cls: 'bg-blue-100 text-blue-700'  },
  CANCELADO:  { label: 'Cancelado',     cls: 'bg-red-100 text-red-700'    },
} as const

const AGR_NOMES: Record<string, string> = {
  'ana.karolina': 'Ana Karolina',
  'arlen':        'Arlen',
  'vinicius':     'Vinicius',
  'laryssa':      'Laryssa',
}

function fmtData(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

interface Props { searchParams: Promise<{ mes?: string; ano?: string }> }

export default async function CertificadosPage({ searchParams }: Props) {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')

  const params = await searchParams
  const hoje = new Date()
  const mes = Number(params.mes ?? hoje.getMonth() + 1)
  const ano = Number(params.ano ?? hoje.getFullYear())

  const inicio = new Date(ano, mes - 1, 1)
  const fim    = new Date(ano, mes, 0, 23, 59, 59)

  const pedidos = await prisma.pedido.findMany({
    where: {
      parceiroId: parceiro.id,
      createdAt: { gte: inicio, lte: fim },
    },
    include: {
      cliente: { select: { nome: true, razaoSocial: true } },
      itens:   { include: { modelo: { select: { nome: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const emitidos   = pedidos.filter(p => p.status === 'EMITIDO').length
  const validacao  = pedidos.filter(p => p.status === 'GERADO' || p.status === 'VERIFICADO').length
  const cancelados = pedidos.filter(p => p.status === 'CANCELADO').length

  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' }),
  }))
  const anos = [hoje.getFullYear() - 1, hoje.getFullYear()]

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Certificados Indicados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pedidos vinculados ao seu cadastro</p>
        </div>
        <form className="flex gap-2">
          <select name="mes" defaultValue={mes}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</option>
            ))}
          </select>
          <select name="ano" defaultValue={ano}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
            Filtrar
          </button>
        </form>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Em Validação ({validacao})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Cancelado ({cancelados})</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Emitido ({emitidos})</div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {pedidos.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Nenhum certificado neste período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Data', 'Status', 'Cliente', 'Modelo', 'AGR', 'Protocolo'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidos.map(p => {
                  const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
                  const nomeCliente = p.cliente.razaoSocial || p.cliente.nome
                  const modelo = p.itens[0]?.modelo?.nome ?? '—'
                  const agr = AGR_NOMES[p.agr ?? ''] ?? p.agr ?? '—'
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtData(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{nomeCliente}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{modelo}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{agr}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{p.numero}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
