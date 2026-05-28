import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { diagnosticar, listarProdutos } from '@/lib/safeweb'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const diagnostico = await diagnosticar()

  if (!diagnostico.tokenOk) {
    return NextResponse.json({ ...diagnostico, produtos: null })
  }

  // Se autenticou com sucesso, tenta listar produtos para validar acesso completo
  const { ok, produtos, erro } = await listarProdutos()

  return NextResponse.json({
    ...diagnostico,
    produtos: ok ? produtos : null,
    erroProdutos: ok ? undefined : erro,
  })
}