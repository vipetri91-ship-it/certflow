import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { calcularIndicadorCompleto } from '@/lib/performance/calcular'
import { GaugeICF } from '@/components/performance/gauge-icf'
import { DailyOverlay } from './overlay'
import { Target, Award, Users2, Sparkles, Lightbulb } from 'lucide-react'

export default async function ModoDailyPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:read')) redirect('/dashboard')

  const indicador = await calcularIndicadorCompleto()
  const { producao, qualidade, renovacao, icf, classificacao, tendencia } = indicador

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  const [focoDoDia, sugestoes] = await Promise.all([
    prisma.focoDoDia.findFirst({ orderBy: { data: 'desc' } }),
    prisma.sugestaoIA.findMany({ where: { createdAt: { gte: inicioHoje } }, orderBy: { createdAt: 'desc' }, take: 4 }),
  ])

  return (
    <DailyOverlay>
      <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-6">
        <div className="flex flex-col items-center text-center gap-2">
          <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest">Reunião Diária — Índice CertFlow</p>
          <GaugeICF valor={icf} cor={classificacao.cor} tamanho={320} />
          <p className="text-3xl font-bold text-white -mt-2">{classificacao.emoji} {classificacao.label}</p>
          {tendencia.evolucao !== null && (
            <p className="text-blue-200 text-sm">
              {tendencia.evolucao >= 0 ? '+' : ''}{tendencia.evolucao} pontos vs. mês anterior ({tendencia.icfMesAnterior})
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-blue-100 mb-2"><Target className="w-4 h-4" /><p className="font-semibold">Produção</p></div>
            <p className="text-3xl font-bold text-white">{producao.resultado}<span className="text-lg font-normal text-blue-200"> / {producao.meta}</span></p>
            <p className="text-sm text-blue-200 mt-1">{producao.diasRestantes} dias restantes · previsão {producao.previsaoFechamento}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-blue-100 mb-2"><Award className="w-4 h-4" /><p className="font-semibold">Qualidade</p></div>
            <p className="text-3xl font-bold text-white">{Math.round(qualidade.pontuacao)}<span className="text-lg font-normal text-blue-200"> / 100</span></p>
            <p className="text-sm text-blue-200 mt-1">{qualidade.ocorrencias} ocorrência{qualidade.ocorrencias !== 1 ? 's' : ''} este mês</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-blue-100 mb-2"><Users2 className="w-4 h-4" /><p className="font-semibold">Renovação</p></div>
            <p className="text-3xl font-bold text-white">{Math.round(renovacao.taxaContato)}<span className="text-lg font-normal text-blue-200">% contactados</span></p>
            <p className="text-sm text-blue-200 mt-1">{renovacao.clientesPendentes} pendentes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-orange-200 mb-2"><Target className="w-4 h-4" /><p className="font-semibold">Foco de Hoje</p></div>
            <p className="text-white text-lg">{focoDoDia?.objetivo ?? 'Nenhum foco definido ainda.'}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-orange-200 mb-2"><Sparkles className="w-4 h-4" /><p className="font-semibold">Sugestões da IA</p></div>
            {sugestoes.length > 0 ? (
              <ul className="space-y-1.5">
                {sugestoes.map(s => (
                  <li key={s.id} className="text-blue-100 text-sm flex gap-2">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-200" />{s.texto}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-blue-200 text-sm italic">Nenhuma sugestão gerada ainda hoje.</p>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200 text-sm italic pt-2">
          &quot;Problemas escondidos crescem. Problemas compartilhados são resolvidos.&quot;
        </p>
      </div>
    </DailyOverlay>
  )
}
