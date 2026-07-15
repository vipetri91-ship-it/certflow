import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from './prisma'

function segredo(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET não configurado')
  return s
}
const COOKIE = 'portal_session'
const EXPIRA_MS = 8 * 60 * 60 * 1000 // 8 horas

export function criarToken(parceiroId: string): string {
  const payload = JSON.stringify({ parceiroId, exp: Date.now() + EXPIRA_MS })
  const b64 = Buffer.from(payload).toString('base64url')
  const hmac = crypto.createHmac('sha256', segredo()).update(b64).digest('hex')
  return `${b64}.${hmac}`
}

export function verificarToken(token: string): { parceiroId: string } | null {
  try {
    const [b64, hmac] = token.split('.')
    if (!b64 || !hmac) return null
    const esperado = crypto.createHmac('sha256', segredo()).update(b64).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(esperado, 'hex'))) return null
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString())
    if (data.exp < Date.now()) return null
    return { parceiroId: data.parceiroId }
  } catch { return null }
}

export async function getPortalSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  const sessao = verificarToken(token)
  if (!sessao) return null
  const parceiro = await prisma.parceiro.findUnique({
    where: { id: sessao.parceiroId },
    select: {
      id: true, nome: true, razaoSocial: true, nomeFantasia: true,
      email: true, cnpj: true, cpf: true, tipoPessoa: true,
      statusPainel: true, loginParceiro: true,
      telefone: true, celular: true, contadorResponsavel: true, pessoaContato: true,
      nivel: true, tipoParceria: true, banco: true, agencia: true,
      conta: true, tipoConta: true, chavePix: true,
    },
  })
  if (!parceiro || !parceiro.statusPainel) return null
  return parceiro
}

export function cookieName() { return COOKIE }
