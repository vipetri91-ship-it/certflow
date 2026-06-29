import { describe, it, expect } from 'vitest'
import { estaAtrasado } from './heartbeat'

describe('estaAtrasado', () => {
  it('nunca rodou (null) — sempre atrasado', () => {
    expect(estaAtrasado(null, new Date('2026-06-26T08:00:00Z'), 60, 15)).toBe(true)
  })

  it('rodou dentro do intervalo esperado — não está atrasado', () => {
    const ultima = new Date('2026-06-26T07:30:00Z')
    const agora = new Date('2026-06-26T08:00:00Z') // 30 min depois, intervalo esperado 60 min
    expect(estaAtrasado(ultima, agora, 60, 15)).toBe(false)
  })

  it('passou do intervalo mas ainda dentro da tolerância — não está atrasado', () => {
    const ultima = new Date('2026-06-26T07:00:00Z')
    const agora = new Date('2026-06-26T08:10:00Z') // 70 min depois, intervalo 60 + tolerância 15 = 75
    expect(estaAtrasado(ultima, agora, 60, 15)).toBe(false)
  })

  it('passou do intervalo + tolerância — está atrasado', () => {
    const ultima = new Date('2026-06-26T07:00:00Z')
    const agora = new Date('2026-06-26T08:20:00Z') // 80 min depois, limite é 75
    expect(estaAtrasado(ultima, agora, 60, 15)).toBe(true)
  })
})
