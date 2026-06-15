import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria, camposAlterados } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const optStr = z.string().optional().nullable()

const schemaUpdate = z.object({
  nome:                z.string().min(2).optional(),
  email:               z.string().email().optional().or(z.literal('')).nullable(),
  emailAlternativo:    optStr,
  telefone:            optStr,
  telefone2:           optStr,
  celular:             optStr,
  razaoSocial:         optStr,
  nomeFantasia:        optStr,
  tipo:                optStr,
  nivel:               optStr,
  tipoParceria:        optStr,
  renovacoes:          optStr,
  responsavelId:       z.string().optional().or(z.literal('')).nullable(),
  contadorResponsavel: optStr,
  pessoaContato:       optStr,
  informacoesEnvio:    optStr,
  tipoComissao:        optStr,
  diaPagamento:        z.number().int().optional().nullable(),
  loginParceiro:       optStr,
  senhaParceiro:       optStr,
  statusPainel:        z.boolean().optional(),
  permissoesPainel:    z.record(z.string(), z.boolean()).optional().nullable(),
  banco:               optStr,
  agencia:             optStr,
  conta:               optStr,
  tipoConta:           optStr,
  chavePix:            optStr,
  observacoes:         optStr,
  ativo:               z.boolean().optional(),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const parceiro = await prisma.parceiro.findUnique({
    where: { id },
    include: {
      responsavel: { select: { id: true, nome: true } },
      contatosParceiro: { orderBy: { createdAt: 'asc' } },
      clientes: {
        select: { id: true, nome: true, tipoPessoa: true, cpf: true, cnpj: true, createdAt: true },
        orderBy: { nome: 'asc' },
      },
      comissoes: {
        include: { modelo: { select: { id: true, nome: true, preco: true } } },
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

  if (!parceiro) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  // Nunca expor a senha hasheada
  const { senhaParceiro: _, ...semSenha } = parceiro
  return NextResponse.json({ ...semSenha, temSenha: !!_ })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const antigo = await prisma.parceiro.findUnique({ where: { id } })
  if (!antigo) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const { email, senhaParceiro, responsavelId, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }

  if (email !== undefined) data.email = email || null
  if (responsavelId !== undefined) data.responsavelId = responsavelId || null
  if (senhaParceiro) data.senhaParceiro = await bcrypt.hash(senhaParceiro, 10)

  const parceiro = await prisma.parceiro.update({ where: { id }, data })

  // senhaParceiro nunca entra na auditoria (nem o nome do campo nem o hash) —
  // alteração de senha não deve aparecer no histórico de auditoria.
  const camposAuditados = Object.keys(parsed.data).filter(c => c !== 'senhaParceiro')

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'UPDATE',
    entidade: 'Parceiro',
    entidadeId: id,
    dados: { camposAlterados: camposAlterados(antigo, parceiro, camposAuditados) },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  await prisma.parceiro.update({ where: { id }, data: { ativo: false } })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'DELETE',
    entidade: 'Parceiro',
    entidadeId: id,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
