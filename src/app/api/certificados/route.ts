import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'
import { addMonths } from 'date-fns'

const schemaCertificado = z.object({
  clienteId:      z.string(),
  modeloId:       z.string(),
  pedidoId:       z.string().optional(),
  numeroSerie:    z.string().optional(),
  dataEmissao:    z.string(),
  dataVencimento: z.string().optional(), // override calculado quando informado
  status:         z.enum(['ATIVO','VENCIDO','RENOVADO','CANCELADO']).optional(),
  safewebId:      z.string().optional(),
  observacoes:    z.string().optional(),
  agr:            z.string().optional(),     // cadastro manual
  valorFinal:     z.number().optional(),     // cadastro manual
  origemManual:   z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')
  const status = searchParams.get('status')
  const vencendoEm = searchParams.get('vencendoEm') // dias
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)

  const hoje = new Date()

  const where = {
    ...(clienteId ? { clienteId } : {}),
    ...(status ? { status: status as 'ATIVO' | 'VENCIDO' | 'CANCELADO' | 'RENOVADO' } : {}),
    ...(vencendoEm
      ? {
          status: 'ATIVO' as const,
          dataVencimento: {
            gte: hoje,
            lte: new Date(hoje.getTime() + Number(vencendoEm) * 24 * 60 * 60 * 1000),
          },
        }
      : {}),
  }

  const [certificados, total] = await Promise.all([
    prisma.certificado.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, email: true, tipoPessoa: true } },
        modelo: true,
      },
      orderBy: { dataVencimento: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.certificado.count({ where }),
  ])

  return NextResponse.json({ certificados, total, page, totalPaginas: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const parsed = schemaCertificado.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
    }

    const modelo = await prisma.modeloCertificado.findUnique({ where: { id: parsed.data.modeloId } })
    if (!modelo) return NextResponse.json({ erro: 'Modelo não encontrado' }, { status: 404 })

    const dataEmissao = new Date(parsed.data.dataEmissao)
    const dataVencimento = parsed.data.dataVencimento
      ? new Date(parsed.data.dataVencimento)
      : addMonths(dataEmissao, modelo.validadeMeses)

    let observacoes = parsed.data.observacoes ?? ''
    if (parsed.data.origemManual) {
      const extras = [
        parsed.data.agr && `AGR: ${parsed.data.agr}`,
        'Cadastro manual — emitido fora do CertFlow, só anotado para controle de vencimento',
      ].filter(Boolean).join(' | ')
      observacoes = extras + (observacoes ? ` | ${observacoes}` : '')
    }

    const certificado = await prisma.certificado.create({
      data: {
        clienteId:    parsed.data.clienteId,
        modeloId:     parsed.data.modeloId,
        pedidoId:     parsed.data.pedidoId,
        numeroSerie:  parsed.data.numeroSerie,
        dataEmissao,
        dataVencimento,
        status:       parsed.data.status ?? 'ATIVO',
        safewebId:    parsed.data.safewebId,
        observacoes:  observacoes || undefined,
        valorManual:  parsed.data.valorFinal,
      },
      include: { cliente: true, modelo: true },
    })

    await registrarAuditoria({
      usuarioId: session.user.id,
      acao: 'CREATE',
      entidade: 'Certificado',
      entidadeId: certificado.id,
      dados: { cliente: certificado.cliente.nome, modelo: certificado.modelo.nome },
    })

    return NextResponse.json(certificado, { status: 201 })
  } catch (err) {
    console.error('[POST /api/certificados]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}