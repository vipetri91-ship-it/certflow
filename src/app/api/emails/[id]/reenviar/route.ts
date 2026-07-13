import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarEmail } from '@/lib/email/enviar'
import {
  templatePosEmissao,
  templateVencimento,
  templateVencido,
  templateNutricao,
} from '@/lib/email/templates'
import { differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const log = await prisma.emailLog.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true, email: true } },
      certificado: {
        select: {
          id: true,
          dataVencimento: true,
          dataEmissao: true,
          numeroSerie: true,
          modelo: { select: { nome: true } },
        },
      },
    },
  })

  if (!log) return NextResponse.json({ erro: 'Log não encontrado' }, { status: 404 })
  if (!log.cliente.email) return NextResponse.json({ erro: 'Cliente sem e-mail cadastrado' }, { status: 400 })

  const nomeCliente = log.cliente.nome
  const modeloCertificado = log.certificado?.modelo.nome ?? 'Certificado Digital'
  const dest = log.cliente.email
  const hoje = new Date()

  let assunto: string
  let html: string

  if (log.tipo === 'POS_EMISSAO') {
    const t = templatePosEmissao({
      nomeCliente,
      modeloCertificado,
      protocolo: log.certificado?.numeroSerie ?? undefined,
    })
    assunto = t.assunto; html = t.html

  } else if (log.tipo.startsWith('VENCIMENTO_')) {
    if (!log.certificado?.dataVencimento)
      return NextResponse.json({ erro: 'Certificado sem data de vencimento — reenvio não aplicável' }, { status: 400 })
    const dias = differenceInCalendarDays(log.certificado.dataVencimento, hoje)
    const t = templateVencimento({
      nomeCliente,
      modeloCertificado,
      dataVencimento: format(log.certificado.dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      diasRestantes: Math.max(dias, 1),
    }, Math.max(dias, 1))
    assunto = t.assunto; html = t.html

  } else if (log.tipo.startsWith('VENCIDO_')) {
    if (!log.certificado?.dataVencimento)
      return NextResponse.json({ erro: 'Certificado sem data de vencimento — reenvio não aplicável' }, { status: 400 })
    const dias = differenceInCalendarDays(hoje, log.certificado.dataVencimento)
    const t = templateVencido({
      nomeCliente,
      modeloCertificado,
      dataVencimento: format(log.certificado.dataVencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    }, Math.max(dias, 1))
    assunto = t.assunto; html = t.html

  } else if (log.tipo === 'NUTRICAO_3M') {
    const t = templateNutricao({ nomeCliente }, 1)
    assunto = t.assunto; html = t.html
  } else if (log.tipo === 'NUTRICAO_6M') {
    const t = templateNutricao({ nomeCliente }, 2)
    assunto = t.assunto; html = t.html
  } else if (log.tipo === 'NUTRICAO_9M') {
    const t = templateNutricao({ nomeCliente }, 3)
    assunto = t.assunto; html = t.html

  } else {
    return NextResponse.json({ erro: `Tipo "${log.tipo}" não suporta reenvio manual` }, { status: 400 })
  }

  await enviarEmail({
    clienteId:     log.cliente.id,
    certificadoId: log.certificado?.id,
    tipo:          log.tipo,
    destinatario:  dest,
    assunto,
    html,
  })

  return NextResponse.json({ ok: true })
}
