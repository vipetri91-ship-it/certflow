import crypto from 'node:crypto'

// Token assinado (HMAC) para liberar acesso público a um recurso pontual
// (ex: PDF de boleto) sem exigir login do cliente final, sem permitir
// enumeração de IDs.
function segredo() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET não configurado')
  return s
}

export function gerarTokenPublico(id: string): string {
  return crypto.createHmac('sha256', segredo()).update(id).digest('hex').slice(0, 32)
}

export function validarTokenPublico(id: string, token: string): boolean {
  const esperado = gerarTokenPublico(id)
  if (esperado.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(token))
}
