import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarWhatsApp, gerarMensagemWhatsApp } from '@/lib/digisac'
import { z } from 'zod'

const schema = z.object({
  certificadoId: z.string(),
  telefone: z.string(),
  nomeCliente: z.string(),
  modeloCertificado: z.string(),
  dataVencimento: z.string(),
  diasRestantes: z.number(),
  mensagemCustom: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })

  const mensagem = parsed.data.mensagemCustom ?? gerarMensagemWhatsApp({
    nomeCliente: parsed.data.nomeCliente,
    modeloCertificado: parsed.data.modeloCertificado,
    dataVencimento: parsed.data.dataVencimento,
    diasRestantes: parsed.data.diasRestantes,
  })

  const resultado = await enviarWhatsApp({
    telefone:    parsed.data.telefone,
    mensagem,
    nomeCliente: parsed.data.nomeCliente,
  })

  if (resultado.ok) {
    // Registra no histórico de contatos
    const cert = await prisma.certificado.findUnique({
      where: { id: parsed.data.certificadoId },
      select: { clienteId: true },
    })
    if (cert) {
      await prisma.historicoContato.create({
        data: {
          clienteId: cert.clienteId,
          certificadoId: parsed.data.certificadoId,
          observacao: `WhatsApp enviado para ${parsed.data.telefone}. Mensagem: "${mensagem.slice(0, 100)}..."`,
          usuarioId: session.user.id,
        },
      })
    }
    return NextResponse.json({ ok: true, mensagem: 'WhatsApp enviado com sucesso' })
  }

  return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 500 })
}