import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { HistoricoClient } from './client'

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default async function HistoricoPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:write')) redirect('/performance')

  const indicadores = await prisma.indicadorMensal.findMany({
    orderBy: [{ ano: 'asc' }, { mes: 'asc' }],
  })

  const dados = indicadores.map(i => ({
    label: `${NOMES_MES[i.mes - 1]}/${String(i.ano).slice(2)}`,
    mes: i.mes,
    ano: i.ano,
    icf: i.icf,
    producao: i.producaoPercentual,
    qualidade: i.qualidadePontuacao,
    renovacao: i.renovacaoPercentual,
    producaoResultado: i.producaoResultado,
    producaoMeta: i.producaoMeta,
    qualidadeOcorrencias: i.qualidadeOcorrencias,
  }))

  return (
    <div>
      <div className="no-print">
        <Header titulo="Histórico do ICF" />
      </div>
      <HistoricoClient dados={dados} />
    </div>
  )
}
