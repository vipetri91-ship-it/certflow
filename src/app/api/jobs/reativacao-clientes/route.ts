import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp } from '@/lib/digisac'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { addDays } from 'date-fns'

function autenticado(req: NextRequest): boolean {
  return req.headers.get('x-job-token') === process.env.AUTH_SECRET
}

const DIAS_LIMITE = 60
const MARCA = 'WhatsApp reativação — cliente vencido há mais de 60 dias'

// Certificados vencidos há mais de 60 dias, que nunca foram renovados
// (certificadoRenovacao null = nenhum certificado novo aponta pra este como
// anterior) e ainda não receberam esta campanha. Dispara 1x por certificado —
// não repete, pra não virar spam.
export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const limite = addDays(hoje, -DIAS_LIMITE)
  const resultado = { enviados: 0, pulados: 0, erros: 0 }

  const candidatos = await prisma.certificado.findMany({
    where: {
      status: { in: ['VENCIDO', 'ATIVO'] },
      dataVencimento: { lt: limite },
      certificadoRenovacao: null,
      cliente: { ativo: true, OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
    },
    include: {
      cliente: { select: { id: true, nome: true, celular: true, telefone: true } },
      modelo: { select: { nome: true } },
    },
  })

  for (const cert of candidatos) {
    const telefone = cert.cliente.celular ?? cert.cliente.telefone
    if (!telefone) { resultado.pulados++; continue }

    const jaEnviado = await prisma.historicoContato.findFirst({
      where: { certificadoId: cert.id, observacao: MARCA },
      select: { id: true },
    })
    if (jaEnviado) { resultado.pulados++; continue }

    const primeiroNome = cert.cliente.nome.split(' ')[0]
    const mensagem =
      `👋 Olá, ${primeiroNome}!\n\n` +
      `Notamos que seu certificado digital *${cert.modelo.nome}* está vencido há um tempo e ainda não foi renovado.\n\n` +
      `Sem o certificado ativo você fica sem acesso a e-CAC, emissão de notas fiscais e assinatura digital de documentos.\n\n` +
      `Temos condições especiais pra te ajudar a voltar a ficar em dia — fale com a gente:\n` +
      `👉 wa.me/5511933323003\n\n` +
      `_V&G Certificação Digital_`

    try {
      const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: cert.cliente.nome })
      if (envio.ok) {
        await prisma.historicoContato.create({
          data: { clienteId: cert.cliente.id, certificadoId: cert.id, observacao: MARCA },
        })
        resultado.enviados++
      } else {
        resultado.erros++
      }
    } catch {
      resultado.erros++
    }
    await new Promise(r => setTimeout(r, 300))
  }

  await registrarHeartbeat('reativacao-clientes')
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
