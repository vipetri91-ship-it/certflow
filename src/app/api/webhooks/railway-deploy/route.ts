import { NextRequest, NextResponse } from 'next/server'
import { enviarTelegram } from '@/lib/telegram'

const STATUS_EMOJI: Record<string, string> = {
  SUCCESS: '✅',
  FAILED:  '❌',
  CRASHED: '💥',
  REMOVED: '🗑️',
  SLEEPING: '😴',
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAILWAY_WEBHOOK_SECRET
  const tokenRecebido = req.headers.get('x-railway-signature') ?? req.headers.get('authorization')?.replace('Bearer ', '')

  if (secret && tokenRecebido !== secret) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  const type       = body.type as string | undefined
  const deployment = body.deployment as Record<string, unknown> | undefined
  const service    = body.service    as Record<string, unknown> | undefined
  const status     = deployment?.status as string | undefined

  // Só notifica eventos de deploy concluído (sucesso ou falha)
  if (type !== 'DEPLOY' || !status) {
    return NextResponse.json({ ok: true, ignorado: true })
  }

  if (!['SUCCESS', 'FAILED', 'CRASHED'].includes(status)) {
    return NextResponse.json({ ok: true, ignorado: true })
  }

  const emoji       = STATUS_EMOJI[status] ?? '🔔'
  const nomeServico = (service?.name as string | undefined) ?? 'certflow'
  const commit      = (deployment?.meta as Record<string, unknown> | undefined)?.commitMessage as string | undefined
  const commitHash  = (deployment?.meta as Record<string, unknown> | undefined)?.commitHash as string | undefined
  const hashCurto   = commitHash ? commitHash.slice(0, 7) : ''

  const statusLabel = status === 'SUCCESS' ? 'CONCLUÍDO' : status === 'FAILED' ? 'FALHOU' : 'TRAVOU'

  const linhas = [
    `${emoji} *Deploy ${statusLabel}* — \`${nomeServico}\``,
    commit    ? `📝 ${commit}` : null,
    hashCurto ? `🔖 \`${hashCurto}\`` : null,
    status === 'SUCCESS'
      ? '🌐 Em produção: https://www.vazcertflow.com.br'
      : '⚠️ Verifique os logs no Railway.',
  ].filter(Boolean).join('\n')

  await enviarTelegram(linhas)

  return NextResponse.json({ ok: true })
}
