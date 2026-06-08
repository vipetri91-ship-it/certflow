import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Header } from '@/components/header'
import { NovaVendaEntrada } from './entrada'
import { redirect } from 'next/navigation'
import { deriveAgr } from '@/lib/utils'

export default async function NovaVendaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [modelos, parceiros] = await Promise.all([
    prisma.modeloCertificado.findMany({
      where: { ativo: true },
      orderBy: [{ tipoPessoa: 'asc' }, { tipoCertificado: 'asc' }, { suporte: 'asc' }],
    }),
    prisma.parceiro.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, tipo: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const defaultAgr = deriveAgr(session.user.email ?? '')

  return (
    <div>
      <Header titulo="Nova Venda" />
      <NovaVendaEntrada
        defaultAgr={defaultAgr}
        modelos={modelos.map(m => ({
          id:              m.id,
          nome:            m.nome,
          tipoPessoa:      m.tipoPessoa,
          tipoCertificado: m.tipoCertificado,
          suporte:         m.suporte,
          validadeMeses:   m.validadeMeses,
          preco:           Number(m.preco),
        }))}
        parceiros={parceiros}
      />
    </div>
  )
}
