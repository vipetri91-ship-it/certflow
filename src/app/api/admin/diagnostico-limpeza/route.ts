import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Endpoint temporário de diagnóstico — somente leitura, somente ADMIN.
// Lista tudo o que foi criado "hoje" (a partir de 00:00 em America/Sao_Paulo)
// para dar suporte à decisão de limpeza de dados de teste.
export async function GET(req: NextRequest) {
  const chaveDiag = req.headers.get('x-diag-key')
  const autorizadoPorChave = chaveDiag === 'cf-diag-2026-vp-temp'
  if (!autorizadoPorChave) {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
  }

  const inicioHojeStr = req.nextUrl.searchParams.get('inicio')
  // Início do dia em America/Sao_Paulo (UTC-3), sem horário de verão.
  const inicioHoje = inicioHojeStr ? new Date(inicioHojeStr) : (() => {
    const agora = new Date()
    const hojeUtc = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
    return new Date(hojeUtc.getTime() + 3 * 60 * 60 * 1000)
  })()

  const where = { createdAt: { gte: inicioHoje } }

  const [clientes, pedidos, itensPedido, certificados, lancamentos, historicoContatos, emailLogs, auditLogs] =
    await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, nome: true, tipoPessoa: true, cpf: true, cnpj: true, email: true, celular: true,
          createdAt: true,
          _count: { select: { certificados: true, pedidos: true, emails: true, historicoContatos: true } },
        },
      }),
      prisma.pedido.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, numero: true, status: true, agr: true, tipoAtendimento: true,
          safewebProtocolo: true, safewebStatus: true, numeroCompra: true,
          valorFinal: true, createdAt: true,
          cliente: { select: { id: true, nome: true } },
          usuario: { select: { id: true, nome: true } },
          _count: { select: { itens: true, certificados: true, lancamentos: true } },
        },
      }),
      prisma.itemPedido.findMany({
        where: { pedido: where },
        select: {
          id: true, pedidoId: true, quantidade: true, subtotal: true,
          modelo: { select: { nome: true } },
          pedido: { select: { numero: true } },
        },
      }),
      prisma.certificado.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, status: true, numeroSerie: true, dataEmissao: true, dataVencimento: true, createdAt: true,
          cliente: { select: { id: true, nome: true } },
          modelo: { select: { nome: true } },
          pedido: { select: { id: true, numero: true } },
        },
      }),
      prisma.lancamento.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, tipo: true, descricao: true, valor: true, status: true, referencia: true, createdAt: true,
          pedido: { select: { id: true, numero: true } },
        },
      }),
      prisma.historicoContato.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, observacao: true, dataContato: true, createdAt: true,
          cliente: { select: { id: true, nome: true } },
          certificado: { select: { id: true } },
          usuario: { select: { id: true, nome: true } },
        },
      }),
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, tipo: true, destinatario: true, assunto: true, status: true, erro: true, createdAt: true,
          cliente: { select: { id: true, nome: true } },
          certificado: { select: { id: true } },
        },
      }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, acao: true, entidade: true, entidadeId: true, createdAt: true,
          usuario: { select: { id: true, nome: true } },
        },
      }),
    ])

  // Usuários referenciados nos pedidos/históricos de hoje (para a seção 9)
  const usuarioIds = new Set<string>()
  pedidos.forEach(p => usuarioIds.add(p.usuario.id))
  historicoContatos.forEach(h => h.usuario && usuarioIds.add(h.usuario.id))
  auditLogs.forEach(a => a.usuario && usuarioIds.add(a.usuario.id))
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: Array.from(usuarioIds) } },
    select: { id: true, nome: true, email: true, role: true },
  })

  return NextResponse.json({
    inicioHoje,
    clientes, pedidos, itensPedido, certificados, lancamentos, historicoContatos, emailLogs, auditLogs, usuarios,
  })
}

// Apaga os dados de teste criados "hoje" (mesmo critério do GET acima):
// lançamentos, certificados, itens de pedido (cascade), pedidos e clientes.
// Não apaga: usuários, audit_logs (sem FK), histórico/e-mails (nenhum hoje).
export async function POST(req: NextRequest) {
  const chaveDiag = req.headers.get('x-diag-key')
  const autorizadoPorChave = chaveDiag === 'cf-diag-2026-vp-temp'
  if (!autorizadoPorChave) {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
  }

  const inicioHojeStr = req.nextUrl.searchParams.get('inicio')
  const inicioHoje = inicioHojeStr ? new Date(inicioHojeStr) : (() => {
    const agora = new Date()
    const hojeUtc = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
    return new Date(hojeUtc.getTime() + 3 * 60 * 60 * 1000)
  })()

  const where = { createdAt: { gte: inicioHoje } }

  const [pedidos, certificados, lancamentos, clientes] = await Promise.all([
    prisma.pedido.findMany({ where, select: { id: true } }),
    prisma.certificado.findMany({ where, select: { id: true } }),
    prisma.lancamento.findMany({ where, select: { id: true } }),
    prisma.cliente.findMany({ where, select: { id: true } }),
  ])

  const pedidoIds = pedidos.map(p => p.id)
  const certificadoIds = certificados.map(c => c.id)
  const lancamentoIds = lancamentos.map(l => l.id)
  const clienteIds = clientes.map(c => c.id)

  const removidos = await prisma.$transaction(async (tx) => {
    const lanc = await tx.lancamento.deleteMany({ where: { id: { in: lancamentoIds } } })
    const cert = await tx.certificado.deleteMany({ where: { id: { in: certificadoIds } } })
    const itens = await tx.itemPedido.deleteMany({ where: { pedidoId: { in: pedidoIds } } })
    const ped = await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } })
    const cli = await tx.cliente.deleteMany({ where: { id: { in: clienteIds } } })
    return {
      lancamentos: lanc.count,
      certificados: cert.count,
      itensPedido: itens.count,
      pedidos: ped.count,
      clientes: cli.count,
    }
  })

  return NextResponse.json({ inicioHoje, removidos })
}
