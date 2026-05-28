import { NextRequest, NextResponse } from 'next/server'
import { enviarWhatsApp } from '@/lib/digisac'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const para = searchParams.get('para')

  if (!para) {
    return NextResponse.json({
      instrucao: 'Adicione ?para=11999999999 na URL para enviar o teste',
      exemplo: '/api/test-whatsapp?para=11933323003',
    })
  }

  const mensagem = `✅ *Teste CertFlow — WhatsApp funcionando!*

Olá! Esta é uma mensagem de teste do sistema *CertFlow* da V&G Certificação Digital.

Se você recebeu esta mensagem, significa que a integração com o Digisac está configurada corretamente e os envios automáticos de renovação estão prontos! 🎉

✅ Digisac conectado
✅ Canal V&G ativo
✅ Envios automáticos configurados
✅ Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

_V&G Certificação Digital_`

  const resultado = await enviarWhatsApp({ telefone: para, mensagem })

  if (resultado.ok) {
    return NextResponse.json({
      ok: true,
      mensagem: `WhatsApp de teste enviado para ${para}`,
      numeroFormatado: '55' + para.replace(/\D/g,'').replace(/^55/,''),
      canal: process.env.DIGISAC_CHANNEL_ID,
    })
  }

  return NextResponse.json({
    ok: false,
    para,
    numeroFormatado: '55' + para.replace(/\D/g,'').replace(/^55/,''),
    erro: resultado.erro,
    dica: 'Verifique DIGISAC_URL, DIGISAC_TOKEN e DIGISAC_CHANNEL_ID no Vercel',
  }, { status: 500 })
}