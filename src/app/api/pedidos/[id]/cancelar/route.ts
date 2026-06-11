import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { cancelarSolicitacao } from '@/lib/safeweb'
import { temPermissaoGranular } from '@/lib/permissoes-estrutura'
import { z } from 'zod'
import {
  MOTIVOS_CANCELAMENTO,
  podeCancelarPedido,
  validarStatusParaCancelamento,
  interpretarResultadoSafeweb,
  type ResultadoSafewebCancelamento,
} from './lib'

const schemaCancelar = z.object({
  motivoCategoria: z.enum(MOTIVOS_CANCELAMENTO),
  motivoTexto: z.string().optional(),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // 1. Autenticação
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  // 2. Permissões — trava fixa ADMIN/GERENTE + permissão granular monitor.cancelar para GERENTE
  const role = session.user.role
  const monitorCancelarGerente = role === 'GERENTE' ? await temPermissaoGranular('GERENTE', 'monitor.cancelar') : false
  if (!podeCancelarPedido(role, monitorCancelarGerente)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await ctx.params
  const ip = req.headers.get('x-forwarded-for') ?? undefined

  const pedido = await prisma.pedido.findUnique({ where: { id } })
  if (!pedido) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  // 3. Validação de status
  const validacaoStatus = validarStatusParaCancelamento(pedido.status)
  if (!validacaoStatus.ok) {
    if (pedido.status === 'CANCELADO') {
      await registrarAuditoria({
        usuarioId: session.user.id,
        acao: 'CANCELAR_PEDIDO',
        entidade: 'Pedido',
        entidadeId: id,
        dados: { numero: pedido.numero, tentativa: 'pedido_ja_cancelado' },
        ip,
      })
    }
    return NextResponse.json({ erro: validacaoStatus.erro }, { status: validacaoStatus.status })
  }

  // 4. Validação de motivo
  const body = await req.json().catch(() => ({}))
  const parsed = schemaCancelar.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }
  const { motivoCategoria, motivoTexto } = parsed.data

  // 5. Chamada Safeweb + 6. Tratamento da resposta
  let resultadoSafeweb: ResultadoSafewebCancelamento

  if (pedido.safewebProtocolo) {
    const resultado = await cancelarSolicitacao(pedido.safewebProtocolo)
    const interpretacao = interpretarResultadoSafeweb(resultado)
    if (!interpretacao.prosseguir) {
      // V1: Safeweb indisponível ou recusou o cancelamento — não cancela localmente.
      return NextResponse.json({ erro: `Falha ao cancelar na Safeweb: ${interpretacao.erro}` }, { status: 502 })
    }
    resultadoSafeweb = interpretacao.resultado
  } else {
    resultadoSafeweb = { ok: true, tratadoComo: 'sem_protocolo' }
  }

  const statusAnterior = pedido.status

  // 7. Atualização do Pedido + 8. Atualização de lançamentos (mesma transação)
  const [pedidoAtualizado] = await prisma.$transaction([
    prisma.pedido.update({
      where: { id },
      data: { status: 'CANCELADO', canceladoEm: new Date() },
    }),
    prisma.lancamento.updateMany({
      where: { pedidoId: id, status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    }),
  ])

  // 9. Auditoria
  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CANCELAR_PEDIDO',
    entidade: 'Pedido',
    entidadeId: id,
    dados: {
      numero: pedido.numero,
      statusAnterior,
      motivoCategoria,
      motivoTexto,
      protocoloSafeweb: pedido.safewebProtocolo,
      resultadoSafeweb,
    },
    ip,
  })

  // 10. Resposta ao usuário
  return NextResponse.json({ pedido: pedidoAtualizado, resultadoSafeweb })
}
