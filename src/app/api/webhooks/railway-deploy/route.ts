import { NextRequest, NextResponse } from 'next/server'
import { enviarTelegram } from '@/lib/telegram'

// Mapeia type do Railway → emoji e label
const TIPO_INFO: Record<string, { emoji: string; label: string; sucesso: boolean }> = {
  DEPLOYED:    { emoji: '✅', label: 'CONCLUÍDO',  sucesso: true  },
  DEPLOY:      { emoji: '✅', label: 'CONCLUÍDO',  sucesso: true  },
  SUCCESS:     { emoji: '✅', label: 'CONCLUÍDO',  sucesso: true  },
  FAILED:      { emoji: '❌', label: 'FALHOU',     sucesso: false },
  DEPLOY_FAIL: { emoji: '❌', label: 'FALHOU',     sucesso: false },
  CRASHED:     { emoji: '💥', label: 'TRAVOU',     sucesso: false },
  CRASH:       { emoji: '💥', label: 'TRAVOU',     sucesso: false },
  OOM_KILLED:  { emoji: '💥', label: 'SEM MEMÓRIA', sucesso: false },
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAILWAY_WEBHOOK_SECRET
  const tokenUrl = req.nextUrl.searchParams.get('token')

  if (secret && tokenUrl !== secret) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  // Railway pode mandar o tipo no campo "type" ou "status" dentro de deployment
  const typeRaw    = (body.type as string | undefined)?.toUpperCase()
  const deployment = body.deployment as Record<string, unknown> | undefined
  const statusRaw  = (deployment?.status as string | undefined)?.toUpperCase()
  const service    = body.service as Record<string, unknown> | undefined

  const chave = typeRaw && TIPO_INFO[typeRaw] ? typeRaw : (statusRaw ?? '')
  const info  = TIPO_INFO[chave]

  // Ignora eventos que não são de deploy concluído/falhado
  if (!info) {
    console.log('[Railway webhook] evento ignorado:', typeRaw, statusRaw, JSON.stringify(body).slice(0, 200))
    return NextResponse.json({ ok: true, ignorado: true })
  }

  const nomeServico = (service?.name as string | undefined) ?? 'certflow'
  const meta        = deployment?.meta as Record<string, unknown> | undefined
  const commit      = meta?.commitMessage as string | undefined
  const commitHash  = meta?.commitHash   as string | undefined
  const hashCurto   = commitHash ? commitHash.slice(0, 7) : ''

  const linhas = [
    `${info.emoji} *Deploy ${info.label}* — \`${nomeServico}\``,
    commit    ? `📝 ${commit}` : null,
    hashCurto ? `🔖 \`${hashCurto}\`` : null,
    info.sucesso
      ? '🌐 Em produção: https://www.vazcertflow.com.br'
      : '⚠️ Verifique os logs no Railway.',
  ].filter(Boolean).join('\n')

  await enviarTelegram(linhas)

  return NextResponse.json({ ok: true })
}
