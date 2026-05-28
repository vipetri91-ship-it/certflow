import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

function gerarNumero(): string {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `PED-${ano}${mes}-${rand}`
}

const schema = z.object({
  clienteId: z.string().nullable().optional(),
  clienteDados: z.object({
    tipoPessoa: z.enum(['PF', 'PJ']),
    nome: z.string().min(2),
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    razaoSocial: z.string().optional(),
    responsavel: z.string().optional(),
    email: z.string().email().optional(),
    ddd: z.string().optional(),
    celular: z.string().optional(),
    dataNascimento: z.string().optional(),
    pisNis: z.string().optional(),
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
  }),
  modeloId: z.string(),
  parceiroId: z.string().optional(),
  agr: z.string().optional(),
  formaPagamento: z.string().optional(),
  tipoAtendimento: z.string().optional(),
  unidadeAtendimento: z.string().optional(),
  contabilidade: z.string().optional(),
  voucher: z.string().optional(),
  atendimentoExterno: z.boolean().default(false),
  valorDeslocamento: z.number().default(0),
  valorVenda: z.number().positive(),
  desconto: z.number().default(0),
  observacoes: z.string().optional(),
  agendamento: z.object({
    data: z.string(),
    hora: z.string(),
    duracao: z.number(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { clienteId, clienteDados, modeloId, valorVenda, valorDeslocamento, atendimentoExterno, desconto, agendamento, ...pedidoDados } = parsed.data

  const valorTotal = valorVenda + (atendimentoExterno ? valorDeslocamento : 0)
  const valorFinal = valorTotal - desconto

  // 1. Criar ou atualizar cliente
  let idCliente = clienteId ?? null

  const dadosCliente = {
    tipoPessoa: clienteDados.tipoPessoa,
    nome: clienteDados.nome,
    email: clienteDados.email || undefined,
    celular: clienteDados.celular || undefined,
    ddd: clienteDados.ddd || undefined,
    razaoSocial: clienteDados.razaoSocial || undefined,
    responsavel: clienteDados.responsavel || undefined,
    dataNascimento: clienteDados.dataNascimento ? new Date(clienteDados.dataNascimento) : undefined,
    pisNis: clienteDados.pisNis || undefined,
    cep: clienteDados.cep || undefined,
    logradouro: clienteDados.logradouro || undefined,
    numero: clienteDados.numero || undefined,
    complemento: clienteDados.complemento || undefined,
    bairro: clienteDados.bairro || undefined,
    cidade: clienteDados.cidade || undefined,
    estado: clienteDados.estado || undefined,
  }

  if (idCliente) {
    // Atualiza cliente existente
    await prisma.cliente.update({ where: { id: idCliente }, data: dadosCliente })
  } else {
    // Tenta buscar por CPF ou CNPJ antes de criar
    const cpf = clienteDados.cpf || undefined
    const cnpj = clienteDados.cnpj || undefined

    const existente = cpf
      ? await prisma.cliente.findUnique({ where: { cpf } })
      : cnpj ? await prisma.cliente.findUnique({ where: { cnpj } })
      : null

    if (existente) {
      idCliente = existente.id
      await prisma.cliente.update({ where: { id: idCliente }, data: dadosCliente })
    } else {
      const novoCliente = await prisma.cliente.create({
        data: { ...dadosCliente, cpf: cpf || undefined, cnpj: cnpj || undefined },
      })
      idCliente = novoCliente.id
    }
  }

  // 2. Criar pedido
  const pedido = await prisma.pedido.create({
    data: {
      numero: gerarNumero(),
      clienteId: idCliente!,
      usuarioId: session.user.id,
      status: 'GERADO',
      valorTotal,
      desconto,
      valorFinal,
      agr: pedidoDados.agr || undefined,
      formaPagamento: pedidoDados.formaPagamento || undefined,
      tipoAtendimento:    pedidoDados.tipoAtendimento    || undefined,
      unidadeAtendimento: pedidoDados.unidadeAtendimento || undefined,
      parceiroId: pedidoDados.parceiroId || undefined,
      contabilidade: pedidoDados.contabilidade || undefined,
      voucher: pedidoDados.voucher || undefined,
      atendimentoExterno,
      valorDeslocamento: atendimentoExterno && valorDeslocamento > 0 ? valorDeslocamento : null,
      observacoes: pedidoDados.observacoes || undefined,
      itens: {
        create: [{
          modeloId,
          quantidade: 1,
          precoUnit: valorVenda,
          desconto: 0,
          subtotal: valorVenda,
        }],
      },
    },
  })

  // 3. Lançamento financeiro automático
  const cliente = await prisma.cliente.findUnique({ where: { id: idCliente! }, select: { nome: true } })

  await prisma.lancamento.create({
    data: {
      tipo:           'RECEBER',
      descricao:      `${cliente?.nome ?? 'Cliente'} — Pedido ${pedido.numero}`,
      valor:          valorFinal,
      dataVencimento: new Date(),
      status:         'PENDENTE',
      pedidoId:       pedido.id,
      tipoConta:      'Certificado',
      referencia:     pedido.numero,
      formaPagamento: pedidoDados.formaPagamento ?? undefined,
      ...(pedidoDados.parceiroId ? { parceiroId: pedidoDados.parceiroId } : {}),
    },
  })

  // 4. Agendar no Google Calendar se solicitado
  if (agendamento && pedidoDados.agr) {
    try {
      const modelo = await prisma.modeloCertificado.findUnique({ where: { id: modeloId }, select: { nome: true } })
      const inicio = new Date(`${agendamento.data}T${agendamento.hora}:00`)
      await fetch(`${process.env.NEXTAUTH_URL}/api/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') ?? '' },
        body: JSON.stringify({
          titulo: `${cliente?.nome} — ${modelo?.nome}`,
          descricao: `Pedido: ${pedido.numero}\nCertificado: ${modelo?.nome}`,
          inicio: inicio.toISOString(),
          duracao: agendamento.duracao,
          agr: pedidoDados.agr,
          tipo: pedidoDados.tipoAtendimento ?? 'videoconferencia',
          pedidoId: pedido.id,
        }),
      })
    } catch { /* agenda falhou, não bloqueia */ }
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    dados: { numero: pedido.numero, valorFinal, cliente: cliente?.nome, agr: pedidoDados.agr },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({ id: pedido.id, numero: pedido.numero }, { status: 201 })
}
