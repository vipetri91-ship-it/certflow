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

// Tenta reenviar sozinho antes de desistir — uma falha passageira de rede/
// config não pode custar o e-mail do cliente (caso real de 14-15/07/2026:
// e-mails de pós-emissão perdidos porque o único envio tentado falhou e
// nada reenviava de verdade a tempo). Um único EmailLog por chamada,
// independente de quantas tentativas internas rodarem — evita gerar vários
// registros de erro duplicados pro mesmo envio.
const TENTATIVAS = 3

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

  let ultimoErro: unknown
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
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
      return
    } catch (err) {
      ultimoErro = err
      if (tentativa < TENTATIVAS) {
        await new Promise(r => setTimeout(r, 2000 * tentativa))
      }
    }
  }

  await prisma.emailLog.update({
    where: { id: log.id },
    data: { status: 'ERRO', erro: String(ultimoErro), motivoFalha: String(ultimoErro) },
  })
  throw ultimoErro
}