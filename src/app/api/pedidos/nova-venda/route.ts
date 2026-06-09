// Roda em São Paulo para reduzir latência com a API Safeweb (servidores BR)
export const preferredRegion = 'gru1'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { adicionarVideoconferencia, integracaoHope, buscarProduto, validarCertificadoOnline, type EnderecoSafeweb } from '@/lib/safeweb'
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
  safewebSerieA3: z.string().optional(),
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
    ...(clienteDados.cpf  ? { cpf:  clienteDados.cpf  } : {}),
    ...(clienteDados.cnpj ? { cnpj: clienteDados.cnpj } : {}),
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

  // 3. Protocolo Safeweb automático (videoconferência, presencial ou emissão online) — máx 40s
  let safewebProtocolo: string | undefined
  let hopeUrlDocumentos: string | undefined
  const ehVideoconferencia = pedidoDados.tipoAtendimento === 'videoconferencia'
  const ehPresencial       = pedidoDados.tipoAtendimento === 'presencial'
  const ehEmissaoOnline    = pedidoDados.tipoAtendimento === 'emissao-online'
  if (ehVideoconferencia || ehPresencial || ehEmissaoOnline) {
    const idTipoEmissao = ehPresencial ? 1 : ehEmissaoOnline ? 5 : 3
    const limite = new Promise<void>(resolve => setTimeout(resolve, 40000))
    const tarefa = (async () => {
      const modeloDb = await prisma.modeloCertificado.findUnique({
        where: { id: modeloId },
        select: { tipoPessoa: true, tipoCertificado: true, validadeMeses: true, suporte: true, codigoSafeweb: true },
      })
      const clienteDb = await prisma.cliente.findUnique({
        where: { id: idCliente! },
        select: {
          nome: true, razaoSocial: true, nomeFantasia: true, cpf: true, cnpj: true,
          email: true, celular: true, ddd: true, dataNascimento: true,
          cep: true, logradouro: true, numero: true, complemento: true, bairro: true, cidade: true, estado: true,
        },
      })
      const responsavelPf = responsavelDados?.cpf
        ? await prisma.cliente.findUnique({
            where: { cpf: responsavelDados.cpf },
            select: {
              nome: true, cpf: true, email: true, celular: true, ddd: true, dataNascimento: true,
              cep: true, logradouro: true, numero: true, complemento: true, bairro: true, cidade: true, estado: true,
            },
          })
        : null

      if (!modeloDb || !clienteDb) {
        console.error('[Safeweb] modeloDb ou clienteDb não encontrado', { modeloId, idCliente })
        return
      }

      const prod = await buscarProduto({
        tipoPessoa:      clienteDados.tipoPessoa,
        tipoCertificado: modeloDb.tipoCertificado as 'A1' | 'A3',
        validadeMeses:   modeloDb.validadeMeses,
        idTipoEmissao,
        suporte:         modeloDb.suporte ?? undefined,
      })
      if (!prod.ok || !prod.idProduto) {
        console.error('[Safeweb] produto não encontrado', { erro: prod.erro, tipoCertificado: modeloDb.tipoCertificado, suporte: modeloDb.suporte, validadeMeses: modeloDb.validadeMeses, idTipoEmissao })
        return
      }
      const idTipoEmissaoEfetivo = (prod.idTipoEmissaoUsado ?? idTipoEmissao) as 1 | 3 | 5

      // Usa os dados do request como fonte primária (mais recentes que o banco)
      const cpfPF = clienteDados.tipoPessoa === 'PF'
        ? (clienteDados.cpf || clienteDb.cpf || undefined)
        : (responsavelDados?.cpf || responsavelPf?.cpf || undefined)

      const dataYMD = (s?: string | null) => {
        if (!s) return undefined
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
        const d = new Date(s)
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
      }

      // Monta o endereço a partir do request, com fallback para o cadastro do banco
      function montarEnderecoCompleto(
        dados: { cep?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; estado?: string },
        db: { cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null },
      ): EnderecoSafeweb | undefined {
        const end: EnderecoSafeweb = {
          cep:         dados.cep || db.cep || '',
          logradouro:  dados.logradouro || db.logradouro || '',
          numero:      dados.numero || db.numero || '',
          complemento: dados.complemento || db.complemento || '',
          bairro:      dados.bairro || db.bairro || '',
          cidade:      dados.cidade || db.cidade || '',
          estado:      dados.estado || db.estado || '',
        }
        const completo = end.cep && end.logradouro && end.numero && end.bairro && end.cidade && end.estado
        return completo ? end : undefined
      }

      const enderecoCliente = montarEnderecoCompleto(clienteDados, clienteDb)
      const dddCliente           = clienteDados.ddd || clienteDb.ddd || undefined
      const dataNascimentoCliente = clienteDados.dataNascimento || dataYMD(clienteDb.dataNascimento?.toISOString())

      const nomeCliente = clienteDb.razaoSocial || clienteDb.nome
      const ehPJ = clienteDados.tipoPessoa === 'PJ'

      // Para PJ, monta o objeto "responsavel" (Titular) — obrigatório pela Safeweb
      const responsavel = ehPJ && responsavelPf
        ? {
            nome:           responsavelPf.nome,
            cpf:            responsavelPf.cpf ?? cpfPF ?? '',
            dataNascimento: responsavelDados?.dataNascimento || dataYMD(responsavelPf.dataNascimento?.toISOString()),
            email:          responsavelDados?.email || responsavelPf.email || undefined,
            ddd:            responsavelDados?.ddd || responsavelPf.ddd || undefined,
            telefone:       responsavelDados?.celular || responsavelPf.celular || undefined,
            endereco:       montarEnderecoCompleto(responsavelDados ?? {}, responsavelPf) ?? enderecoCliente,
          }
        : undefined

      // Emissão Online: valida o cert A3 PF para obter o protocolo de origem
      let protocoloOrigem: string | undefined
      if (ehEmissaoOnline && pedidoDados.safewebSerieA3) {
        try {
          const validacao = await validarCertificadoOnline(pedidoDados.safewebSerieA3, String(prod.idProduto))
          if (validacao.ok && validacao.protocolo) {
            protocoloOrigem = validacao.protocolo
            console.log('[Safeweb] cert A3 PF validado, protocoloOrigem:', protocoloOrigem)
          } else {
            console.warn('[Safeweb] validação cert A3 PF falhou (seguindo sem protocoloOrigem):', validacao.erro)
          }
        } catch (err) {
          console.warn('[Safeweb] exceção validarCertificadoOnline (seguindo sem protocoloOrigem):', err)
        }
      }

      const resultado = await adicionarVideoconferencia({
        cpf:            ehPJ ? undefined : cpfPF,
        cnpj:           ehPJ ? (clienteDados.cnpj || clienteDb.cnpj || undefined) : undefined,
        nome:           ehPJ ? (responsavelPf?.nome ?? nomeCliente) : nomeCliente,
        razaoSocial:    clienteDb.razaoSocial ?? undefined,
        nomeFantasia:   clienteDb.nomeFantasia ?? undefined,
        email:          clienteDb.email ?? undefined,
        ddd:            dddCliente,
        telefone:       clienteDb.celular ?? undefined,
        dataNascimento: ehPJ ? undefined : dataNascimentoCliente,
        endereco:       enderecoCliente,
        responsavel,
        produtoId:      String(prod.idProduto),
      }, idTipoEmissaoEfetivo, protocoloOrigem)
      console.log('[Safeweb] resultado adicionarVideoconferencia', resultado)
      if (!resultado.ok || !resultado.protocolo) {
        console.error('[Safeweb] falha ao criar protocolo', resultado.erro, resultado.raw)
        return
      }

      safewebProtocolo = resultado.protocolo
      const updateData: Record<string, unknown> = {
        safewebProtocolo: resultado.protocolo,
        numeroCompra: resultado.protocolo,
      }
      if (ehEmissaoOnline && pedidoDados.safewebSerieA3) {
        updateData.safewebSerieA3 = pedidoDados.safewebSerieA3
      }
      await prisma.pedido.update({ where: { id: pedido.id }, data: updateData as any })

      // Integração HOPE — exclusiva do fluxo de videoconferência (gera o link
      // de upload de documentos); no presencial o cliente leva os documentos à AR
      if (ehVideoconferencia) {
        try {
          const hope = await integracaoHope(resultado.protocolo)
          if (!hope.ok) {
            console.error('[Safeweb] falha integracaoHope', hope.erro)
          } else {
            console.log('[Safeweb] integracaoHope vinculado com sucesso', resultado.protocolo)
            if (hope.url) {
              hopeUrlDocumentos = hope.url
              await prisma.pedido.update({
                where: { id: pedido.id },
                data: { hopeUrlDocumentos: hope.url } as any,
              })
            }
          }
        } catch (err) {
          console.error('[Safeweb] exceção integracaoHope', err)
        }
      }
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
      const inicio = new Date(`${agendamento.data}T${agendamento.hora}:00-03:00`)
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
    hopeUrlDocumentos: hopeUrlDocumentos ?? null,
  }, { status: 201 })
}
