import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enviarWhatsApp } from '@/lib/digisac'

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

  const resultado = await enviarWhatsApp({
    telefone: numero,
    mensagem: '🧪 *Teste do sistema de alerta — CertFlow*\n\nSe você recebeu esta mensagem, o canal de alerta crítico (usado quando a emissão de certificado falha após 3 tentativas) está funcionando corretamente.',
  })

  return NextResponse.json({
    numeroTestado: numero,
    digisacConfigurado: !!(process.env.DIGISAC_URL && process.env.DIGISAC_TOKEN && process.env.DIGISAC_CHANNEL_ID),
    resultado,
  })
}
