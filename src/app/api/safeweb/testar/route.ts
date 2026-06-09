export const preferredRegion = 'gru1'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, getToken, listarProdutos, buscarProduto, adicionarVideoconferencia } from '@/lib/safeweb'

// Lê cfg() de fora do módulo para obter os valores de ambiente
function getCfg() {
  const homolog = process.env.SAFEWEB_HOMOLOGACAO === 'true'
  const baseUrl = homolog
    ? (process.env.SAFEWEB_BASE_URL_HOMOLOG ?? 'https://h-pss.safewebpss.com.br/Service/Microservice')
    : (process.env.SAFEWEB_BASE_URL ?? 'https://pss.safewebpss.com.br/Service/Microservice')
  return {
    baseUrl,
    codigoAR:         process.env.SAFEWEB_CODIGO_AR            ?? '',
    cnpjAR:           process.env.SAFEWEB_CNPJ_AR              ?? '',
    identificador:    process.env.SAFEWEB_IDENTIFICADOR         ?? '',
    attendancePlaceId: Number(process.env.SAFEWEB_ATTENDANCE_PLACE_ID ?? 0),
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const url = req.nextUrl
  const modo = url.searchParams.get('modo') ?? 'basico'

  const diagnostico = await diagnosticar()
  if (!diagnostico.tokenOk) return NextResponse.json({ ...diagnostico })

  // Modo hope: chama a integração Hope diretamente para um protocolo e mostra a resposta bruta
  // Modo jwt: decodifica o payload do token para ver os claims do parceiro
  if (modo === 'jwt') {
    try {
      const token = await getToken()
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
        return NextResponse.json({ token_header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8')), token_payload: payload })
      }
      return NextResponse.json({ erro: 'Token não é JWT (menos de 3 partes)', token_preview: token.slice(0, 80) })
    } catch (err) {
      return NextResponse.json({ erro: String(err) })
    }
  }

  // Modo básico: lista produtos por tipo
  if (modo === 'basico') {
    const resultados: Record<string, unknown> = {}
    for (let tipo = 1; tipo <= 5; tipo++) {
      const r = await listarProdutos(tipo)
      resultados[`tipo_${tipo}`] = r.ok
        ? { ok: true, qtd: r.produtos?.length, amostra: r.produtos?.slice(0, 3) }
        : { ok: false, erro: r.erro }
    }
    return NextResponse.json({ ...diagnostico, resultados })
  }

  // Modo produto: testa buscarProduto e mostra catálogo completo
  if (modo === 'produto') {
    const tipoPessoa      = (url.searchParams.get('tipoPessoa') ?? 'PF') as 'PF' | 'PJ'
    const tipoCertificado = (url.searchParams.get('tipoCertificado') ?? 'A3') as 'A1' | 'A3'
    const validadeMeses   = Number(url.searchParams.get('validadeMeses') ?? '12')
    const suporte         = url.searchParams.get('suporte') ?? undefined

    const prod = await buscarProduto({ tipoPessoa, tipoCertificado, validadeMeses, idTipoEmissao: 3, suporte })
    const [t1, t3, t5] = await Promise.all([listarProdutos(1), listarProdutos(3), listarProdutos(5)])
    return NextResponse.json({
      busca: { tipoPessoa, tipoCertificado, validadeMeses, suporte },
      resultado: prod,
      catalogoTipo1_presencial: t1.produtos?.map(p => ({ tipo: p.ProdutoTipo, modelo: p.ProdutoModelo, validade: p.ProdutoValidade, id: p.idProduto })),
      catalogoTipo3_videoconf:  t3.produtos?.map(p => ({ tipo: p.ProdutoTipo, modelo: p.ProdutoModelo, validade: p.ProdutoValidade, id: p.idProduto })),
      catalogoTipo5_online:     t5.produtos?.map(p => ({ tipo: p.ProdutoTipo, modelo: p.ProdutoModelo, validade: p.ProdutoValidade, id: p.idProduto })),
    })
  }

  // Modo protocolo: testa criação de protocolo com dados reais
  if (modo === 'protocolo') {
    const cpf  = url.searchParams.get('cpf')  ?? ''
    const nome = url.searchParams.get('nome') ?? 'TESTE CERTFLOW'
    const tipoPessoa = (url.searchParams.get('tipoPessoa') ?? 'PF') as 'PF' | 'PJ'
    const tipoCertificado = (url.searchParams.get('tipoCertificado') ?? 'A3') as 'A1' | 'A3'
    const validadeMeses = Number(url.searchParams.get('validadeMeses') ?? '24')

    const prod = await buscarProduto({ tipoPessoa, tipoCertificado, validadeMeses, idTipoEmissao: 3 })
    if (!prod.ok || !prod.idProduto) {
      return NextResponse.json({ etapa: 'buscarProduto', erro: prod.erro, prod })
    }

    const resultado = await adicionarVideoconferencia({
      cpf: cpf || undefined,
      nome,
      produtoId: String(prod.idProduto),
    })

    return NextResponse.json({ etapa: 'adicionarVideoconferencia', prod, resultado })
  }

  // Modo debug: envia TODOS os possíveis nomes de campo ao mesmo tempo para descobrir qual a Safeweb aceita
  if (modo === 'debug') {
    const token = await getToken()
    const { baseUrl, codigoAR, cnpjAR, identificador, attendancePlaceId } = getCfg()
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/safeweb/webhook`

    const cpf  = url.searchParams.get('cpf')  ?? '44114585869'
    const nome = url.searchParams.get('nome') ?? 'TESTE CERTFLOW'
    const idProduto = Number(url.searchParams.get('idProduto') ?? '41764')

    // CNPJ formatado: 33.638.059/0001-69
    const cnpjFormatado = cnpjAR.length === 14
      ? `${cnpjAR.slice(0,2)}.${cnpjAR.slice(2,5)}.${cnpjAR.slice(5,8)}/${cnpjAR.slice(8,12)}-${cnpjAR.slice(12,14)}`
      : cnpjAR

    const body = {
      Cpf:                    cpf,
      Nome:                   nome,
      IdProduto:              idProduto,
      UrlNotificacao:         webhookUrl,
      // Cnpj = CNPJ da AR (hipótese: campo usado pelo Safeweb como código do parceiro)
      Cnpj:                   cnpjAR,
      // demais variantes com CNPJ bruto
      CnpjAR:                 cnpjAR,
      CnpjParceiro:           cnpjAR,
      CodigoParceiro:         cnpjAR,
      CodAR:                  codigoAR,
      // variantes com UUID
      CodigoAR:               codigoAR,
      IdentificadorAR:        codigoAR,
      // variantes com SAFEWEB_IDENTIFICADOR
      Identificador:          identificador,
      // attendancePlaceId como number
      IdAtendimento:          attendancePlaceId,
    }

    const res = await fetch(`${baseUrl}/Shared/Partner/api/Add/3`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const raw = await res.text()
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(raw) } catch { data = { _raw: raw } }

    // mostra identificador parcialmente mascarado para diagnóstico
    const idMasked = identificador.length > 6
      ? `${identificador.slice(0,3)}***${identificador.slice(-3)} (${identificador.length} chars)`
      : `(${identificador.length} chars)`

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      bodyEnviado: body,
      resposta: data,
      diagnostico: {
        cnpjAR_usado: cnpjAR,
        cnpjFormatado,
        codigoAR_usado: codigoAR,
        identificador_masked: idMasked,
        attendancePlaceId,
      },
    })
  }

  // Modo scan: testa cada combinação campo+valor separadamente
  if (modo === 'scan') {
    const token = await getToken()
    const { baseUrl, codigoAR, cnpjAR, identificador, attendancePlaceId } = getCfg()
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/safeweb/webhook`
    const cpf  = url.searchParams.get('cpf')  ?? '44114585869'
    const nome = url.searchParams.get('nome') ?? 'LARYSSA SCHIAVE BUENO DE OLIVEIRA'
    const idProduto = Number(url.searchParams.get('idProduto') ?? '41764')

    const base = { Cpf: cpf, Nome: nome, IdProduto: idProduto, UrlNotificacao: webhookUrl }

    // CodigoParceiro=UUID identifica o integrador, CnpjAR identifica a AR
    // Testando combinação completa com ambos
    const base2 = { CodigoParceiro: codigoAR, CnpjAR: cnpjAR, idProduto: idProduto }

    const candidatos: Array<Record<string, unknown>> = [
      { ...base2 },                                                  // combinação principal
      { ...base2, Email: 'teste@certflow.com.br' },
      { ...base2, Telefone: '11999999999' },
      { ...base2, Email: 'teste@certflow.com.br', Telefone: '11999999999' },
      // sem CnpjAR (controle — confirma null+null)
      { CodigoParceiro: codigoAR, idProduto: idProduto },
    ]

    async function testar(extra: Record<string, unknown>) {
      const bodyFinal = { Cpf: cpf, Nome: nome, UrlNotificacao: webhookUrl, ...extra }
      const res = await fetch(`${baseUrl}/Shared/Partner/api/Add/3`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyFinal),
        signal: AbortSignal.timeout(10000),
      })
      const raw = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(raw) } catch { data = { _raw: raw } }
      return { body: bodyFinal, status: res.status, ok: res.ok, msg: data.Message ?? data.mensagem ?? data.message ?? (res.ok ? 'OK - PROTOCOLO CRIADO!' : data), protocolo: data.Protocolo ?? data.protocolo ?? data.Id ?? data.id ?? null }
    }

    const resultados = []
    for (const c of candidatos) {
      resultados.push(await testar(c))
    }

    return NextResponse.json({ resultados })
  }

  // Modo biometria-teste: descobre o endpoint de consulta de biometria PSbio
  if (modo === 'biometria-teste') {
    const cpf = (url.searchParams.get('cpf') ?? '39102744805').replace(/\D/g, '')
    const dataNasc = url.searchParams.get('data') ?? '1991-10-31' // AAAA-MM-DD ou DD/MM/AAAA
    const token = await getToken()
    const { baseUrl } = getCfg()

    // Tenta múltiplas variações: grupos, verbos e estruturas de path
    type Tentativa = { method: string; url: string; body?: object }
    const tentativas: Tentativa[] = [
      // GET — grupo PSBio como módulo raiz
      { method: 'GET',  url: `${baseUrl}/PSBio/Shared/api/ConsultarBiometria/${cpf}` },
      { method: 'GET',  url: `${baseUrl}/PSBio/api/ConsultarBiometria/${cpf}` },
      { method: 'GET',  url: `${baseUrl}/Bio/Shared/api/ConsultarBiometria/${cpf}` },
      { method: 'GET',  url: `${baseUrl}/Biometria/Shared/api/ConsultarBiometria/${cpf}` },
      // GET — grupo diferente de "Shared"
      { method: 'GET',  url: `${baseUrl}/Local/PSBio/api/ConsultarBiometria/${cpf}` },
      { method: 'GET',  url: `${baseUrl}/Global/PSBio/api/ConsultarBiometria/${cpf}` },
      // POST — igual ao Add/3 mas para biometria
      { method: 'POST', url: `${baseUrl}/Shared/PSBio/api/ConsultarBiometria`,     body: { Cpf: cpf } },
      { method: 'POST', url: `${baseUrl}/Shared/PSBio/api/Consultar`,              body: { Cpf: cpf } },
      { method: 'POST', url: `${baseUrl}/Shared/Biometria/api/ConsultarBiometria`, body: { Cpf: cpf } },
      { method: 'POST', url: `${baseUrl}/Shared/Partner/api/ConsultarBiometria`,   body: { Cpf: cpf } },
      // GET — query param em vez de path param
      { method: 'GET',  url: `${baseUrl}/Shared/PSBio/api/ConsultarBiometria?cpf=${cpf}` },
      { method: 'GET',  url: `${baseUrl}/Shared/PSBio/api/Consultar?cpf=${cpf}` },
    ]

    const resultados = []
    for (const t of tentativas) {
      try {
        const res = await fetch(t.url, {
          method: t.method,
          headers: { Authorization: token, 'Content-Type': 'application/json' },
          ...(t.body ? { body: JSON.stringify(t.body) } : {}),
          signal: AbortSignal.timeout(6000),
        })
        const raw = await res.text()
        let data: unknown
        try { data = JSON.parse(raw) } catch { data = raw.slice(0, 200) }
        resultados.push({ method: t.method, url: t.url, status: res.status, ok: res.ok, data })
      } catch (err) {
        resultados.push({ method: t.method, url: t.url, status: 0, ok: false, data: String(err).slice(0, 80) })
      }
    }
    return NextResponse.json({ cpf, resultados })
  }

  // Modo consultar: tenta buscar detalhes de um protocolo existente
  if (modo === 'consultar') {
    const prot = url.searchParams.get('protocolo') ?? '1010741604'
    const token = await getToken()
    const { baseUrl } = getCfg()

    const tentativas = [
      `/Shared/Partner/api/GetSolicitacao/${prot}`,
      `/Shared/Partner/api/Solicitacao/${prot}`,
      `/Shared/Solicitacao/api/Get/${prot}`,
      `/Shared/Partner/api/ConsultarSolicitacao/${prot}`,
      `/api/solicitacao/${prot}`,
    ]

    const resultados: Record<string, unknown>[] = []
    for (const path of tentativas) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(8000),
      })
      const raw = await res.text()
      let data: unknown
      try { data = JSON.parse(raw) } catch { data = raw.slice(0, 200) }
      resultados.push({ path, status: res.status, ok: res.ok, data })
    }
    return NextResponse.json({ protocolo: prot, resultados })
  }

  // Modo produtos-parceiro: lista produtos via codigoAR (UUID) em vez do cnpjAR
  if (modo === 'produtos-parceiro') {
    const { baseUrl, codigoAR, cnpjAR } = getCfg()
    const token = await getToken()

    const tentativas = [
      `/Shared/Product/api/GetListProdutoByAR/3/${codigoAR}`,
      `/Shared/Product/api/GetListProduto/3/${codigoAR}`,
      `/Shared/Product/api/GetListProdutoByParceiro/3/${codigoAR}`,
      `/Shared/Product/api/GetListProdutoByAR/3/${cnpjAR}`,  // controle (atual)
    ]

    const resultados: Record<string, unknown>[] = []
    for (const path of tentativas) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(10000),
      })
      const raw = await res.text()
      let data: unknown
      try { data = JSON.parse(raw) } catch { data = raw }
      resultados.push({ path, status: res.status, ok: res.ok, qtd: Array.isArray(data) ? (data as unknown[]).length : null, amostra: Array.isArray(data) ? (data as unknown[]).slice(0,3) : data })
    }
    return NextResponse.json({ resultados })
  }

  return NextResponse.json({ erro: 'modo inválido. Use ?modo=basico|produto|protocolo|debug|scan|jwt|produtos-parceiro' }, { status: 400 })
}
