import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { adicionarVideoconferencia, integracaoHope, buscarProduto } from '@/lib/safeweb'
import { z } from 'zod'

function gerarNumero(): string {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `PED-${ano}${mes}-${rand}`
}

const schemaCliente = z.object({
  tipoPessoa: z.enum(['PF', 'PJ']),
  nome: z.string().min(2),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  responsavel: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
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
})

const schemaResponsavel = z.object({
  nome: z.string().min(2),
  cpf: z.string().optional(),
  dataNascimento: z.string().optional(),
  pisNis: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  ddd: z.string().optional(),
  celular: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
})

const schema = z.object({
  clienteId: z.string().nullable().optional(),
  clienteDados: schemaCliente,
  responsavelDados: schemaResponsavel.optional(),
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
  valorVenda: z.number().min(0),
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

  const { clienteId, clienteDados, responsavelDados, modeloId, valorVenda, valorDeslocamento, atendimentoExterno, desconto, agendamento, ...pedidoDados } = parsed.data

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

  // 1b. Para PJ: criar/atualizar cliente PF (responsável) separadamente
  if (clienteDados.tipoPessoa === 'PJ' && responsavelDados?.cpf) {
    const cpfPF = responsavelDados.cpf
    const dadosPF = {
      tipoPessoa: 'PF' as const,
      nome:          responsavelDados.nome,
      email:         responsavelDados.email || null,
      ddd:           responsavelDados.ddd   || null,
      celular:       responsavelDados.celular || null,
      dataNascimento: responsavelDados.dataNascimento ? new Date(responsavelDados.dataNascimento) : null,
      pisNis:        responsavelDados.pisNis    || null,
      cep:           responsavelDados.cep       || null,
      logradouro:    responsavelDados.logradouro || null,
      numero:        responsavelDados.numero     || null,
      complemento:   responsavelDados.complemento || null,
      bairro:        responsavelDados.bairro     || null,
      cidade:        responsavelDados.cidade     || null,
      estado:        responsavelDados.estado     || null,
    }
    const pfExistente = await prisma.cliente.findUnique({ where: { cpf: cpfPF } })
    if (pfExistente) {
      await prisma.cliente.update({ where: { cpf: cpfPF }, data: dadosPF })
    } else {
      await prisma.cliente.create({ data: { ...dadosPF, cpf: cpfPF } })
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

  // 3. Protocolo Safeweb automático (apenas videoconferência) — máx 15s
  let safewebProtocolo: string | undefined
  if (pedidoDados.tipoAtendimento === 'videoconferencia') {
    const limite = new Promise<void>(resolve => setTimeout(resolve, 15000))
    const tarefa = (async () => {
      const modeloDb = await prisma.modeloCertificado.findUnique({
        where: { id: modeloId },
        select: { tipoPessoa: true, tipoCertificado: true, validadeMeses: true },
      })
      const clienteDb = await prisma.cliente.findUnique({
        where: { id: idCliente! },
        select: { nome: true, razaoSocial: true, cpf: true, cnpj: true, email: true, celular: true },
      })
      const responsavelPf = responsavelDados?.cpf
        ? await prisma.cliente.findUnique({ where: { cpf: responsavelDados.cpf }, select: { nome: true, cpf: true } })
        : null

      if (!modeloDb || !clienteDb) return

      const prod = await buscarProduto({
        tipoPessoa:      clienteDados.tipoPessoa,
        tipoCertificado: modeloDb.tipoCertificado as 'A1' | 'A3',
        validadeMeses:   modeloDb.validadeMeses,
        idTipoEmissao:   3,
      })
      if (!prod.ok || !prod.idProduto) return

      const nomeCliente = clienteDb.razaoSocial || clienteDb.nome
      const resultado = await adicionarVideoconferencia({
        cpf:       clienteDados.tipoPessoa === 'PF' ? (clienteDb.cpf ?? undefined) : (responsavelPf?.cpf ?? undefined),
        cnpj:      clienteDados.tipoPessoa === 'PJ' ? (clienteDb.cnpj ?? undefined) : undefined,
        nome:      clienteDados.tipoPessoa === 'PJ' ? (responsavelPf?.nome ?? nomeCliente) : nomeCliente,
        email:     clienteDb.email ?? undefined,
        telefone:  clienteDb.celular ?? undefined,
        produtoId: String(prod.idProduto),
      })
      if (!resultado.ok || !resultado.protocolo) return

      safewebProtocolo = resultado.protocolo
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { safewebProtocolo: resultado.protocolo } as any,
      })
      await integracaoHope(resultado.protocolo).catch(() => {})
    })()

    await Promise.race([tarefa, limite]).catch(() => {})
  }

  // 4. Lançamento financeiro automático
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

  return NextResponse.json({
    id: pedido.id,
    numero: pedido.numero,
    safewebProtocolo: safewebProtocolo ?? null,
  }, { status: 201 })
}
