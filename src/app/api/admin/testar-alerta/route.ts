import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enviarWhatsApp } from '@/lib/digisac'
import { Resolver } from 'node:dns/promises'

// Endpoint de diagnóstico — somente ADMIN. Dispara o mesmo caminho de código
// usado pelo alerta crítico do webhook Safeweb (enviarWhatsApp para
// BOT_ADMIN_NUMERO), para confirmar que a rede de segurança está realmente
// funcionando em produção, sem precisar esperar uma falha real acontecer.
export async function GET(req: NextRequest) {
  const tokenJob = req.headers.get('x-job-token') ?? req.nextUrl.searchParams.get('token')
  const autorizadoPorToken = tokenJob === process.env.AUTH_SECRET

  if (!autorizadoPorToken) {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
  }

  const numero = process.env.BOT_ADMIN_NUMERO ?? '11943156015'

  // Teste 0: resolver DNS com servidor padrão do container vs. DNS público (8.8.8.8),
  // para saber se é o resolver do Railway que está com problema ou o domínio mesmo.
  const dnsResultado: Record<string, unknown> = {}
  try {
    const padrao = new Resolver()
    dnsResultado.padrao = await padrao.resolve4('api.digisac.com.br')
  } catch (e) {
    dnsResultado.padrao = `erro: ${(e as Error).message}`
  }
  try {
    const google = new Resolver()
    google.setServers(['8.8.8.8'])
    dnsResultado.google = await google.resolve4('api.digisac.com.br')
  } catch (e) {
    dnsResultado.google = `erro: ${(e as Error).message}`
  }

  // Teste 1: fetch bruto direto à API do Digisac, para isolar a causa real
  // (DNS, SSL, timeout) sem passar pela abstração de digisac.ts.
  let testeBruto: Record<string, unknown>
  try {
    const url = process.env.DIGISAC_URL
    const res = await fetch(`${url}/contacts?number=5511933323003&serviceId=${process.env.DIGISAC_CHANNEL_ID}`, {
      headers: { 'Authorization': `Bearer ${process.env.DIGISAC_TOKEN}` },
    })
    testeBruto = { ok: res.ok, status: res.status }
  } catch (e) {
    const err = e as Error & { cause?: unknown }
    testeBruto = { ok: false, erro: err.message, causa: String(err.cause ?? '') }
  }

  const resultado = await enviarWhatsApp({
    telefone: numero,
    mensagem: '🧪 *Teste do sistema de alerta — CertFlow*\n\nSe você recebeu esta mensagem, o canal de alerta crítico (usado quando a emissão de certificado falha após 3 tentativas) está funcionando corretamente.',
  })

  return NextResponse.json({
    numeroTestado: numero,
    digisacConfigurado: !!(process.env.DIGISAC_URL && process.env.DIGISAC_TOKEN && process.env.DIGISAC_CHANNEL_ID),
    dnsResultado,
    testeBruto,
    resultado,
  })
}
