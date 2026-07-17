// Chamada ao Google Apps Script que cria o evento na Google Agenda — usada
// tanto na hora da venda (src/app/api/pedidos/nova-venda/route.ts) quanto
// pelo robô de retry (src/lib/robo/verificacao-leve.ts), com o mesmo
// payload já resolvido e persistido no Pedido. Extraído em 17/07/2026: uma
// falha isolada de rede/timeout na hora da venda não pode custar o
// compromisso do cliente pra sempre — precisa de alguém tentando de novo
// sozinho até dar certo, não só um alerta avisando que falhou.

export interface PayloadEventoAgenda {
  titulo: string
  descricao: string
  inicio: Date
  duracaoMin: number
  agrCalendario: string   // vinicius | ana | arlen | pessoal — já resolvido
  tipo: string             // presencial | videoconferencia | bonificado | pessoal — já resolvido
  pedidoId: string
}

export interface ResultadoEventoAgenda {
  ok: boolean
  eventoId?: string
  calendario?: string
  erro?: string
}

// Tenta 2x (com pausa curta entre as tentativas) antes de desistir — cada
// chamador decide o que fazer com uma falha final (o robô de retry mantém
// tentando em rodadas futuras; a venda só persiste o estado pendente).
export async function criarEventoAgenda(payload: PayloadEventoAgenda): Promise<ResultadoEventoAgenda> {
  const scriptUrl   = process.env.APPS_SCRIPT_URL
  const scriptToken = process.env.APPS_SCRIPT_TOKEN
  if (!scriptUrl) return { ok: false, erro: 'APPS_SCRIPT_URL não configurado' }

  let ultimoErro: unknown
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo:    payload.titulo,
          descricao: payload.descricao,
          inicio:    payload.inicio.toISOString(),
          duracao:   payload.duracaoMin,
          agr:       payload.agrCalendario,
          tipo:      payload.tipo,
          pedidoId:  payload.pedidoId,
          token:     scriptToken,
        }),
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      })
      const texto = await res.text().catch(() => '')
      let corpo: Record<string, unknown> = {}
      try { corpo = JSON.parse(texto) } catch { /* resposta não é JSON (ex: HTML de erro) */ }
      if (corpo.ok) {
        return { ok: true, eventoId: corpo.eventoId as string | undefined, calendario: corpo.calendario as string | undefined }
      }
      const resumo = texto.length > 300 ? texto.slice(0, 300) + '…' : texto
      ultimoErro = corpo.msg ?? resumo ?? 'resposta sem detalhe'
    } catch (err) {
      ultimoErro = err
    }
    if (tentativa < 2) await new Promise(r => setTimeout(r, 2000))
  }
  return { ok: false, erro: String(ultimoErro) }
}
