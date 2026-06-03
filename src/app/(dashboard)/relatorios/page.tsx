import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProducaoDetalhada } from './producao-detalhada'

interface Props {
  searchParams: Promise<{
    de?: string; ate?: string
    modelo?: string; atendimento?: string
    agr?: string; parceiro?: string
    pagamento?: string; unidade?: string
    aba?: string
  }>
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  const sp = await searchParams
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

  const dataInicio = sp.de  ? new Date(sp.de  + 'T00:00:00') : inicioMes
  const dataFim    = sp.ate ? new Date(sp.ate  + 'T23:59:59') : fimMes

  // ── Busca completa com todos os filtros ──────────────────────────────────
  const where: Record<string, unknown> = {
    createdAt: { gte: dataInicio, lte: dataFim },
    status: { not: 'CANCELADO' },
  }
  if (sp.agr)       where.agr = sp.agr
  if (sp.parceiro)  where.parceiroId = sp.parceiro
  if (sp.pagamento) where.formaPagamento = sp.pagamento
  if (sp.unidade)   where.unidadeAtendimento = sp.unidade
  if (sp.atendimento) where.tipoAtendimento = sp.atendimento

  const [pedidos, modelos, parceiros, usuarios] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: {
        cliente:  { select: { id: true, nome: true, razaoSocial: true, tipoPessoa: true, cpf: true, cnpj: true } },
        parceiro: { select: { id: true, nome: true } },
        itens: {
          include: { modelo: { select: { id: true, nome: true, tipoPessoa: true, tipoCertificado: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.modeloCertificado.findMany({ where: { ativo: true }, select: { id: true, nome: true } }),
    prisma.parceiro.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.usuario.findMany({ where: { ativo: true }, select: { id: true, nome: true, nomeAgrDs: true }, orderBy: { nome: 'asc' } }),
  ])

  // Filtra por modelo após busca (pois está nos itens)
  const pedidosFiltrados = sp.modelo
    ? pedidos.filter(p => p.itens.some(i => i.modeloId === sp.modelo))
    : pedidos

  return (
    <div className="flex flex-col min-h-screen bg-[#EEF2FF] dark:bg-[#1a1d2e]">
      <Header titulo="Produção Detalhada" />
      <div className="flex-1 p-4 lg:p-6">
        <ProducaoDetalhada
          pedidos={pedidosFiltrados.map(p => ({
            ...p,
            valorFinal: Number(p.valorFinal),
            valorTotal: Number(p.valorTotal),
            desconto:   Number(p.desconto),
            createdAt:  p.createdAt.toISOString(),
            emitidoEm:  p.emitidoEm?.toISOString() ?? null,
          }))}
          modelos={modelos}
          parceiros={parceiros}
          usuarios={usuarios}
          filtros={{
            de:          sp.de  ?? inicioMes.toISOString().split('T')[0],
            ate:         sp.ate ?? fimMes.toISOString().split('T')[0],
            modelo:      sp.modelo      ?? '',
            atendimento: sp.atendimento ?? '',
            agr:         sp.agr         ?? '',
            parceiro:    sp.parceiro    ?? '',
            pagamento:   sp.pagamento   ?? '',
            unidade:     sp.unidade     ?? '',
            aba:         sp.aba         ?? 'resumo',
          }}
        />
      </div>
    </div>
  )
}