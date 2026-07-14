import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp } from '@/lib/digisac'
import { registrarHeartbeat } from '@/lib/robo/heartbeat'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { MARCA_NPS_ENVIADA } from '@/lib/robo/nps'

function autenticado(req: NextRequest): boolean {
  return req.headers.get('x-job-token') === process.env.AUTH_SECRET
}

const DIAS_APOS_EMISSAO = 5

// Certificados emitidos há exatamente 5 dias (tempo pro cliente já ter usado
// o certificado pelo menos uma vez) recebem um WhatsApp pedindo nota de 0 a
// 10. A resposta é capturada em src/app/api/digisac/webhook/route.ts —
// procura por "Pesquisa NPS enviada" no histórico do cliente sem resposta
// ainda, quando ele manda só um número.
export async function POST(req: NextRequest) {
  if (!autenticado(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const alvo = subDays(hoje, DIAS_APOS_EMISSAO)
  const resultado = { enviados: 0, pulados: 0, erros: 0 }

  const candidatos = await prisma.certificado.findMany({
    where: {
      status: 'ATIVO',
      dataEmissao: { gte: startOfDay(alvo), lte: endOfDay(alvo) },
      cliente: { OR: [{ celular: { not: null } }, { telefone: { not: null } }] },
    },
    include: { cliente: { select: { id: true, nome: true, celular: true, telefone: true } } },
  })

  for (const cert of candidatos) {
    const telefone = cert.cliente.celular ?? cert.cliente.telefone
    if (!telefone) { resultado.pulados++; continue }

    const jaEnviado = await prisma.historicoContato.findFirst({
      where: { certificadoId: cert.id, observacao: MARCA_NPS_ENVIADA },
      select: { id: true },
    })
    if (jaEnviado) { resultado.pulados++; continue }

    const primeiroNome = cert.cliente.nome.split(' ')[0]
    const mensagem =
      `👋 Olá, ${primeiroNome}!\n\n` +
      `Faz alguns dias que você emitiu seu certificado digital com a gente. Queremos muito saber: como foi sua experiência?\n\n` +
      `De 0 a 10, qual nota você daria pra V&G Certificação Digital? Responda só com o número 🙂`

    try {
      const envio = await enviarWhatsApp({ telefone, mensagem, nomeCliente: cert.cliente.nome })
      if (envio.ok) {
        await prisma.historicoContato.create({
          data: { clienteId: cert.cliente.id, certificadoId: cert.id, observacao: MARCA_NPS_ENVIADA },
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

  await registrarHeartbeat('pesquisa-nps')
  return NextResponse.json({ ok: true, resultado, executadoEm: new Date().toISOString() })
}
