import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Header } from '@/components/header'
import { NovaVendaWizard } from './wizard'
import { redirect } from 'next/navigation'

// Deriva o identificador do AGR a partir do e-mail do usuário logado
function deriveAgr(email: string): string {
  const prefix = email.split('@')[0].toLowerCase()
  if (prefix.includes('arlen'))    return 'arlen'
  if (prefix.includes('ana'))      return 'ana.karolina'
  if (prefix.includes('laryssa'))  return 'laryssa'
  return 'vinicius'
}

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
      <NovaVendaWizard
        defaultAgr={defaultAgr}
        modelos={modelos.map(m => ({
          id:             m.id,
          nome:           m.nome,
          tipoPessoa:     m.tipoPessoa,
          tipoCertificado: m.tipoCertificado,
          suporte:        m.suporte,
          validadeMeses:  m.validadeMeses,
          preco:          Number(m.preco),
        }))}
        parceiros={parceiros}
      />
    </div>
  )
}
