import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AssistenteEditor } from './editor'

export const dynamic = 'force-dynamic'

interface PdfMeta { nome: string; data: string; chars: number }

export default async function AssistentePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) redirect('/dashboard')

  let conhecimentoInicial = ''
  let pdfsAdicionados: PdfMeta[] = []

  try {
    const [cfgConhecimento, cfgPdfs] = await Promise.all([
      prisma.$queryRawUnsafe<{ valor: string }[]>(
        "SELECT valor FROM configuracoes WHERE chave = 'assistente_conhecimento' LIMIT 1"
      ),
      prisma.$queryRawUnsafe<{ valor: string }[]>(
        "SELECT valor FROM configuracoes WHERE chave = 'assistente_pdfs' LIMIT 1"
      ),
    ])
    conhecimentoInicial = cfgConhecimento[0]?.valor ?? ''
    pdfsAdicionados = cfgPdfs[0]?.valor ? JSON.parse(cfgPdfs[0].valor) : []
  } catch (err) {
    console.error('[AssistentePage]', err)
  }

  return (
    <div>
      <Header titulo="ZOE — Base de Conhecimento" />
      <AssistenteEditor
        conhecimentoInicial={conhecimentoInicial}
        pdfsAdicionados={pdfsAdicionados}
      />
    </div>
  )
}
