import { transporte } from './transporte'
import { prisma } from '../prisma'
import type { TipoEmailAutomatico } from '../../generated/prisma/client'

interface EnvioParams {
  clienteId: string
  certificadoId?: string
  tipo: TipoEmailAutomatico
  destinatario: string
  assunto: string
  html: string
  attachments?: { name: string; contentBase64: string }[]
}

export async function enviarEmail(params: EnvioParams): Promise<void> {
  const log = await prisma.emailLog.create({
    data: {
      clienteId: params.clienteId,
      certificadoId: params.certificadoId,
      tipo: params.tipo,
      destinatario: params.destinatario,
      assunto: params.assunto,
      status: 'PENDENTE',
    },
  })

  try {
    await transporte.sendMail({
      from: process.env.SMTP_FROM,
      to: params.destinatario,
      subject: params.assunto,
      html: params.html,
      tag: log.id,
      attachments: params.attachments,
    })

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'ENVIADO', enviadoEm: new Date() },
    })
  } catch (err) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'ERRO', erro: String(err), motivoFalha: String(err) },
    })
    throw err
  }
}