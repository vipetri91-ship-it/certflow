// Roda em São Paulo para reduzir latência com a API Safeweb (servidores BR)
export const preferredRegion = 'gru1'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { adicionarVideoconferencia, integracaoHope, buscarProduto, validarCertificadoOnline, type EnderecoSafeweb } from '@/lib/safeweb'
import { criarEventoAgenda } from '@/lib/agenda'
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

  // 1b. Para PJ: criar/atualizar cliente PF (responsável) e gravar vínculo PJ → PF
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
    let pfId: string
    const pfExistente = await prisma.cliente.findUnique({ where: { cpf: cpfPF } })
    if (pfExistente) {
      await prisma.cliente.update({ where: { cpf: cpfPF }, data: dadosPF })
      pfId = pfExistente.id
    } else {
      const novoPF = await prisma.cliente.create({ data: { ...dadosPF, cpf: cpfPF } })
      pfId = novoPF.id
    }
    // Grava vínculo no PJ: qual PF é seu responsável
    await prisma.cliente.update({ where: { id: idCliente }, data: { responsavelClienteId: pfId } })
  }

  // 2. Protocolo Safeweb automático (videoconferência, presencial ou emissão
  // online) — roda ANTES de criar o pedido. Regra de negócio (autorizada por
  // Vinicius em 18/06/2026): ou gera o protocolo automaticamente, ou a venda
  // não é criada — nunca um meio-termo manual que "poluiria" o sistema.
  let safewebProtocolo: string | undefined
  let hopeUrlDocumentos: string | undefined
  const ehVideoconferencia = pedidoDados.tipoAtendimento === 'videoconferencia'
  const ehPresencial       = pedidoDados.tipoAtendimento === 'presencial'
  const ehEmissaoOnline    = pedidoDados.tipoAtendimento === 'emissao-online'
  const exigeProtocoloAutomatico = ehVideoconferencia || ehPresencial || ehEmissaoOnline

  if (exigeProtocoloAutomatico) {
    const idTipoEmissao = ehPresencial ? 1 : ehEmissaoOnline ? 5 : 3

    type ResultadoProtocoloGeracao =
      | { ok: true; protocolo: string; usouAdd5ParaA1: boolean }
      | { ok: false; motivo: string }

    async function gerarProtocoloAutomatico(): Promise<ResultadoProtocoloGeracao> {
      try {
        const modeloDb = await prisma.modeloCertificado.findUnique({
          where: { id: modeloId },
          select: { nome: true, tipoPessoa: true, tipoCertificado: true, validadeMeses: true, suporte: true, codigoSafeweb: true },
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
          return { ok: false, motivo: 'Modelo ou cliente não encontrado para montar a solicitação Safeweb.' }
        }

        const isA1 = modeloDb.tipoCertificado === 'A1'
        const idTipoEmissaoEfetivoBusca = idTipoEmissao

        const prod = await buscarProduto({
          tipoPessoa:      clienteDados.tipoPessoa,
          tipoCertificado: modeloDb.tipoCertificado as 'A1' | 'A3',
          validadeMeses:   modeloDb.validadeMeses,
          idTipoEmissao:   idTipoEmissaoEfetivoBusca,
          suporte:         modeloDb.suporte ?? undefined,
          // Único jeito hoje de saber se o modelo inclui leitora de cartão é
          // pelo nome cadastrado (não existe campo próprio) — confirmado com
          // o Vinicius em 25/06/2026 que essa é a convenção de nomenclatura.
          comLeitora:      modeloDb.nome.toLowerCase().includes('leitora'),
        })
        if (!prod.ok || !prod.idProduto) {
          console.error('[Safeweb] produto não encontrado', { erro: prod.erro, tipoCertificado: modeloDb.tipoCertificado, suporte: modeloDb.suporte, validadeMeses: modeloDb.validadeMeses, idTipoEmissao })
          return { ok: false, motivo: prod.erro ? String(prod.erro) : 'Produto Safeweb correspondente não encontrado.' }
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
            numero:      dados.numero || db.numero || 'S/N',
            complemento: dados.complemento || db.complemento || '',
            bairro:      dados.bairro || db.bairro || '',
            cidade:      dados.cidade || db.cidade || '',
            estado:      dados.estado || db.estado || '',
          }
          // numero agora tem fallback 'S/N' — só descarta o endereço se campos essenciais faltarem
          const completo = end.cep && end.logradouro && end.bairro && end.cidade && end.estado
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

        const addParams = {
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
        }
        console.log('[Safeweb] adicionarVideoconferencia params:', JSON.stringify({ ...addParams, idTipoEmissaoEfetivo }))
        const resultado = await adicionarVideoconferencia(addParams, idTipoEmissaoEfetivo, protocoloOrigem)
        console.log('[Safeweb] resultado adicionarVideoconferencia', JSON.stringify(resultado))
        if (!resultado.ok || !resultado.protocolo) {
          console.error('[Safeweb][diag] MOTIVO DA REJEIÇÃO', { erro: resultado.erro, raw: resultado.raw })
          const motivo = resultado.erro
            ? String(resultado.erro)
            : `Sem protocolo na resposta: ${JSON.stringify(resultado.raw ?? {}).slice(0, 500)}`
          return { ok: false, motivo: motivo.slice(0, 500) }
        }

        return { ok: true, protocolo: resultado.protocolo, usouAdd5ParaA1: false }
      } catch (err) {
        const motivo = err instanceof Error ? err.message : String(err)
        console.error('[Safeweb][diag] EXCEÇÃO NÃO TRATADA no fluxo de protocolo', err instanceof Error ? { message: err.message, stack: err.stack } : err)
        return { ok: false, motivo: `Exceção no fluxo de protocolo: ${motivo}`.slice(0, 500) }
      }
    }

    const limite = new Promise<ResultadoProtocoloGeracao>(resolve =>
      setTimeout(() => resolve({ ok: false, motivo: 'Tempo limite de 40s excedido ao tentar gerar o protocolo na Safeweb.' }), 40000),
    )

    const resultadoProtocolo = await Promise.race([gerarProtocoloAutomatico(), limite])

    if (!resultadoProtocolo.ok) {
      console.error('[Safeweb][diag] Pedido NÃO criado — protocolo automático falhou', resultadoProtocolo.motivo)
      return NextResponse.json({
        erro: 'Não foi possível gerar o protocolo automaticamente na Safeweb. Nenhum pedido foi criado — tente novamente.',
        motivo: resultadoProtocolo.motivo,
      }, { status: 502 })
    }

    safewebProtocolo = resultadoProtocolo.protocolo

    // Integração HOPE — exclusiva do fluxo de videoconferência (Add/3).
    // A1 (arquivo) usa Add/5 automaticamente — sem videoconferência, sem Hope.
    if (ehVideoconferencia && !resultadoProtocolo.usouAdd5ParaA1) {
      try {
        const hope = await integracaoHope(safewebProtocolo)
        if (!hope.ok) {
          console.error('[Safeweb] falha integracaoHope', hope.erro)
        } else {
          console.log('[Safeweb] integracaoHope vinculado com sucesso', safewebProtocolo)
          if (hope.url) hopeUrlDocumentos = hope.url
        }
      } catch (err) {
        console.error('[Safeweb] exceção integracaoHope', err)
      }
    }
  }

  // 3. Criar pedido — só chega aqui se não exigia protocolo automático, ou
  // se a Safeweb já confirmou o protocolo acima.
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
      safewebProtocolo: safewebProtocolo ?? undefined,
      numeroCompra: safewebProtocolo ?? undefined,
      hopeUrlDocumentos: hopeUrlDocumentos ?? undefined,
      ...(ehEmissaoOnline && pedidoDados.safewebSerieA3 ? { safewebSerieA3: pedidoDados.safewebSerieA3 } : {}),
      itens: {
        create: [{
          modeloId,
          quantidade: 1,
          precoUnit: valorVenda,
          desconto: 0,
          subtotal: valorVenda,
        }],
      },
    } as any,
  })

  // 4. Buscar cliente (usado no agendamento e na auditoria abaixo)
  const cliente = await prisma.cliente.findUnique({ where: { id: idCliente! }, select: { nome: true } })

  // Lançamento financeiro: não é mais criado aqui — passa a ser criado
  // quando o pedido for marcado como EMITIDO (ver
  // PATCH /api/pedidos/[id], docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md)

  // 4. Agendar no Google Calendar se solicitado
  // agendaOk fica null quando não foi solicitado agendamento — o front-end só
  // mostra aviso de falha quando agendaSolicitado for true e isso for false
  // (nunca quando o agendamento nem foi pedido).
  //
  // O payload é sempre PERSISTIDO no Pedido antes de tentar, e o resultado
  // (sucesso ou falha) também — se a tentativa daqui falhar (rede, Google
  // fora do ar por um instante), o robô de retry (verificacao-leve.ts,
  // roda a cada 20 min) encontra pelo agendaOk=false e tenta de novo
  // sozinho, várias vezes, até dar certo — em vez de só avisar que falhou e
  // deixar o compromisso do cliente perdido pra sempre (achado 17/07/2026,
  // vendas do Arlen).
  let agendaOk: boolean | null = null
  if (!agendamento) {
    console.log('[Agenda] sem agendamento no pedido', pedido.numero, '— evento não criado')
  } else if (!pedidoDados.agr) {
    console.warn('[Agenda] agr ausente no pedido', pedido.numero, '— evento não criado')
    agendaOk = false
  }
  if (agendamento && pedidoDados.agr) {
    agendaOk = false
    try {
      const modelo = await prisma.modeloCertificado.findUnique({ where: { id: modeloId }, select: { nome: true } })
      const inicio = new Date(`${agendamento.data}T${agendamento.hora}:00-03:00`)

      // A agenda (Google Calendar) só conhece os AGRs vinicius/ana/arlen.
      // Quando o AGR do pedido não é nenhum desses (ex.: laryssa, que ainda
      // não tem calendário próprio), o evento é criado em vermelho (tipo
      // "pessoal") para ser recolorido manualmente depois.
      const AGR_PARA_AGENDA: Record<string, 'vinicius' | 'ana' | 'arlen'> = {
        vinicius: 'vinicius',
        arlen: 'arlen',
        'ana.karolina': 'ana',
      }
      // Mapeamento tipoAtendimento → tipo válido no schema da agenda.
      // 'emissao-online' e 'externo' não existem no enum da agenda —
      // mapear aqui evita o 422 silencioso que impedia a criação do evento.
      const TIPO_ATEND_PARA_AGENDA: Record<string, 'presencial' | 'videoconferencia' | 'bonificado' | 'pessoal'> = {
        presencial:       'presencial',
        videoconferencia: 'videoconferencia',
        'emissao-online': 'videoconferencia',
        externo:          'presencial',
        bonificado:       'bonificado',
      }
      const agrAgenda = AGR_PARA_AGENDA[pedidoDados.agr]
      const tipoAgenda = agrAgenda
        ? (TIPO_ATEND_PARA_AGENDA[pedidoDados.tipoAtendimento ?? ''] ?? 'videoconferencia')
        : 'pessoal'

      const descricao = [
        `Pedido: ${pedido.numero}`,
        `Certificado: ${modelo?.nome}`,
        safewebProtocolo ? `Protocolo Safeweb: ${safewebProtocolo}` : null,
      ].filter(Boolean).join('\n')

      // Título do evento: nome do cliente/empresa e, se houver contabilidade
      // vinculada na venda, o nome dela ao lado — ajuda a identificar o
      // cliente na agenda sem precisar abrir o evento. O modelo do
      // certificado não entra mais no título porque já está na descrição.
      const tituloEvento = pedidoDados.contabilidade
        ? `${cliente?.nome} — ${pedidoDados.contabilidade}`
        : `${cliente?.nome}`

      // Persiste o payload já resolvido ANTES de tentar — se o processo cair
      // no meio (deploy, crash), o robô de retry ainda encontra tudo que
      // precisa pra tentar de novo sozinho.
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          agendaSolicitado: true,
          agendaInicio:     inicio,
          agendaDuracaoMin: agendamento.duracao,
          agendaTitulo:     tituloEvento,
          agendaDescricao:  descricao,
          agendaAgrCalend:  agrAgenda ?? 'pessoal',
          agendaTipo:       tipoAgenda,
        },
      })

      const resultado = await criarEventoAgenda({
        titulo: tituloEvento, descricao, inicio, duracaoMin: agendamento.duracao,
        agrCalendario: agrAgenda ?? 'pessoal', tipo: tipoAgenda, pedidoId: pedido.id,
      })

      if (resultado.ok) {
        agendaOk = true
        await prisma.pedido.update({ where: { id: pedido.id }, data: { agendaOk: true, agendaEventoId: resultado.eventoId } })
        console.log('[Agenda] evento criado', pedido.numero, resultado.eventoId, 'em', resultado.calendario)
      } else {
        // Não alerta aqui — alertar sem resolver não ajuda ninguém (pedido
        // explícito do Vinicius, 17/07/2026). O robô de retry tenta de novo
        // sozinho nas próximas rodadas; só escala pro Telegram se de fato
        // esgotar as tentativas sem conseguir.
        await prisma.pedido.update({ where: { id: pedido.id }, data: { agendaOk: false, agendaTentativas: 1, agendaUltimoErro: resultado.erro } })
        console.error('[Agenda] falha ao criar evento para', pedido.numero, resultado.erro)
      }
    } catch (err) {
      console.error('[Agenda] exceção ao criar evento para o pedido', pedido.numero, err)
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { agendaSolicitado: true, agendaOk: false, agendaTentativas: 1, agendaUltimoErro: String(err) },
      }).catch(() => {})
    }
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    dados: { numero: pedido.numero, valorFinal, cliente: cliente?.nome, agr: pedidoDados.agr, agendaSolicitado: Boolean(agendamento), agendaOk },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return NextResponse.json({
    id: pedido.id,
    numero: pedido.numero,
    safewebProtocolo: safewebProtocolo ?? null,
    hopeUrlDocumentos: hopeUrlDocumentos ?? null,
    agendaOk,
  }, { status: 201 })
}
