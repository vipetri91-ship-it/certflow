// Rate limiter simples em memória (por IP)
// Bloqueia após MAX_ATTEMPTS falhas dentro de WINDOW_MS

const MAX_ATTEMPTS = 5
const WINDOW_MS    = 15 * 60 * 1000 // 15 minutos
const BLOCK_MS     = 30 * 60 * 1000 // 30 minutos de bloqueio

interface Registro {
  tentativas: number
  primeiraFalha: number
  bloqueadoAte?: number
}

const mapa = new Map<string, Registro>()

export function verificarRateLimit(ip: string): { bloqueado: boolean; tentativasRestantes: number } {
  const agora = Date.now()
  const reg   = mapa.get(ip)

  // Sem histórico — permite
  if (!reg) return { bloqueado: false, tentativasRestantes: MAX_ATTEMPTS }

  // Ainda bloqueado
  if (reg.bloqueadoAte && agora < reg.bloqueadoAte) {
    return { bloqueado: true, tentativasRestantes: 0 }
  }

  // Janela expirou — reseta
  if (agora - reg.primeiraFalha > WINDOW_MS) {
    mapa.delete(ip)
    return { bloqueado: false, tentativasRestantes: MAX_ATTEMPTS }
  }

  const restantes = Math.max(0, MAX_ATTEMPTS - reg.tentativas)
  return { bloqueado: false, tentativasRestantes: restantes }
}

export function registrarFalha(ip: string) {
  const agora = Date.now()
  const reg   = mapa.get(ip)

  if (!reg) {
    mapa.set(ip, { tentativas: 1, primeiraFalha: agora })
    return
  }

  // Janela expirou — reinicia
  if (agora - reg.primeiraFalha > WINDOW_MS) {
    mapa.set(ip, { tentativas: 1, primeiraFalha: agora })
    return
  }

  const tentativas = reg.tentativas + 1
  if (tentativas >= MAX_ATTEMPTS) {
    mapa.set(ip, { ...reg, tentativas, bloqueadoAte: agora + BLOCK_MS })
  } else {
    mapa.set(ip, { ...reg, tentativas })
  }
}

export function registrarSucesso(ip: string) {
  mapa.delete(ip)
}
