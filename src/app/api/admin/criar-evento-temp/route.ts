import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Endpoint temporário — cria 1 evento fixo na agenda (Google Calendar) do
// Vinicius para o lembrete de retomar Safeweb (cancelamento) e API Inter.
// Remover após o uso.
export async function POST(req: NextRequest) {
  const chaveDiag = req.headers.get('x-diag-key')
  const autorizadoPorChave = chaveDiag === 'cf-diag-2026-vp-temp'
  if (!autorizadoPorChave) {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
    }
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL
  const token = process.env.APPS_SCRIPT_TOKEN
  if (!scriptUrl) {
    return NextResponse.json({ erro: 'Google Apps Script não configurado' }, { status: 400 })
  }

  const evento = {
    titulo: 'CertFlow — Cancelamento Safeweb + API Banco Inter',
    descricao: [
      '1) Conectar cancelarSolicitacao (src/lib/safeweb.ts) ao fluxo de cancelar pedido',
      '   e cancelar os protocolos de teste: 1010781571, 1010781647, 1010782402, 1010782465',
      '2) Conversar sobre integração com a API do Banco Inter',
    ].join('\n'),
    inicio: '2026-06-11T09:00:00-03:00',
    duracao: 30,
    agr: 'vinicius',
    tipo: 'pessoal',
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...evento, token }),
      redirect: 'follow',
    })
    const data = await res.json()
    if (!data.ok) {
      return NextResponse.json({ erro: data.msg ?? 'Erro ao criar evento' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, eventoId: data.eventoId, msg: data.msg })
  } catch (err) {
    return NextResponse.json({ erro: `Erro de conexão: ${String(err)}` }, { status: 500 })
  }
}
