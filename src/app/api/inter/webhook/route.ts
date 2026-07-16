import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { consultarCobranca } from '@/lib/inter'
import { enviarTelegram } from '@/lib/telegram'

// Inter envia POST nesta URL quando a cobrança é paga
// Configurar em: Inter → API → Webhooks → Cobrança
//
// SEGURANÇA (corrigido 16/07/2026): esse POST não tem nenhuma verificação de
// autenticidade — nossoNumero não é secreto, está impresso no boleto que o
// próprio cliente recebe, então qualquer um poderia forjar esse payload.
// Por isso o corpo do POST agora só serve de GATILHO ("olha, dá uma
// conferida nessa cobrança") — a baixa só acontece depois de reconfirmar
// direto com a API autenticada do Inter (consultarCobranca, mTLS), nunca
// confiando em situacao/valorPago que vieram no corpo do POST em si.
async function reconsultarComRetry(codigoSolicitacao: string, tentativas = 2) {
  let ultimoErro: unknown
  for (let i = 0; i < tentativas; i++) {
    try {
      return await consultarCobranca(codigoSolicitacao)
    } catch (err) {
      ultimoErro = err
      if (i < tentativas - 1) await new Promise(r => setTimeout(r, 1500))
    }
  }
  throw ultimoErro
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Payload Inter: { evento: 'COBRANCA_LIQUIDADA', cobranca: { nossoNumero, ... } }
    // Só usamos isso como gatilho — nossoNumero pra achar QUAL lançamento
    // conferir, nada além disso vindo do corpo é usado pra decidir a baixa.
    const evento   = body?.evento
    const cobranca = body?.cobranca

    if (evento !== 'COBRANCA_LIQUIDADA' || !cobranca?.nossoNumero) {
      return NextResponse.json({ ok: true }) // ignora outros eventos
    }

    const lancamento = await prisma.lancamento.findFirst({
      where: { interCobrancaId: cobranca.nossoNumero },
    })
    if (!lancamento || lancamento.status === 'PAGO') {
      return NextResponse.json({ ok: true })
    }

    if (!lancamento.interCodigoSolicitacao) {
      await enviarTelegram(
        `🚨 Webhook do Inter avisou pagamento do lançamento ${lancamento.id}, mas ele não tem interCodigoSolicitacao gravado — não consigo reconfirmar direto com o Inter. Verifique manualmente.`
      )
      return NextResponse.json({ ok: true })
    }

    let detalhes
    try {
      detalhes = await reconsultarComRetry(lancamento.interCodigoSolicitacao)
    } catch (err) {
      await enviarTelegram(
        `⚠️ Webhook do Inter avisou pagamento do lançamento ${lancamento.id}, mas não consegui reconfirmar com a API deles agora (${String(err)}). Vou tentar de novo na próxima verificação automática — se não resolver sozinho, dê baixa manual depois de conferir no extrato.`
      )
      return NextResponse.json({ ok: true })
    }

    // Reconfirmação real: só aceitamos "RECEBIDO" como pago de verdade
    // (confirmado testando contra a API — ver comentário em src/lib/inter.ts).
    if (detalhes.cobranca.situacao !== 'RECEBIDO') {
      await enviarTelegram(
        `⚠️ O webhook do Inter avisou pagamento do lançamento ${lancamento.id}, mas ao reconfirmar direto com o Inter a situação real é "${detalhes.cobranca.situacao}" (não "RECEBIDO"). Não dei baixa automática — pode ter sido um aviso falso ou desatualizado. Verifique manualmente.`
      )
      return NextResponse.json({ ok: true })
    }

    const valorRecebido = Number(detalhes.cobranca.valorTotalRecebido)
    const valorEsperado = Number(lancamento.valor)

    if (!Number.isFinite(valorRecebido) || valorRecebido !== valorEsperado) {
      await enviarTelegram(
        `🚨 O Inter confirmou pagamento do lançamento ${lancamento.id}, mas o valor recebido (${detalhes.cobranca.valorTotalRecebido ?? 'não informado'}) não bate exatamente com o esperado (${valorEsperado}). Não dei baixa automática — confira e dê baixa manual se estiver tudo certo.`
      )
      return NextResponse.json({ ok: true })
    }

    await prisma.lancamento.update({
      where: { id: lancamento.id },
      data: {
        status:        'PAGO',
        dataPagamento: detalhes.cobranca.dataSituacao ? new Date(detalhes.cobranca.dataSituacao) : new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Inter webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
