import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { validarTokenPublico } from '@/lib/token-publico'
import { calcularIndicadorCompleto } from '@/lib/performance/calcular'
import { GaugeICF } from '@/components/performance/gauge-icf'
import { Target, Award, Users2, Sparkles, Lightbulb } from 'lucide-react'
import { AutoRefresh } from './auto-refresh'
import { RECURSO_TV } from '@/lib/performance/tv'

export default async function ModoTvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!validarTokenPublico(RECURSO_TV, token)) notFound()

  const indicador = await calcularIndicadorCompleto()
  const { producao, qualidade, renovacao, icf, classificacao, tendencia } = indicador

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  const [focoDoDia, sugestoes] = await Promise.all([
    prisma.focoDoDia.findFirst({ orderBy: { data: 'desc' } }),
    prisma.sugestaoIA.findMany({ where: { createdAt: { gte: inicioHoje } }, orderBy: { createdAt: 'desc' }, take: 3 }),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-blue-950 flex items-center justify-center p-8">
      <AutoRefresh intervalMs={60_000} />
      <div className="max-w-5xl w-full space-y-8">
        <div className="flex flex-col items-center text-center gap-2">
          <p className="text-lg font-semibold text-blue-200 uppercase tracking-widest">Índice CertFlow</p>
          <GaugeICF valor={icf} cor={classificacao.cor} tamanho={380} />
          <p className="text-4xl font-bold text-white -mt-2">{classificacao.emoji} {classificacao.label}</p>
          {tendencia.evolucao !== null && (
            <p className="text-blue-200 text-lg">
              {tendencia.evolucao >= 0 ? '+' : ''}{tendencia.evolucao} pontos vs. mês anterior
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur text-center">
            <div className="flex items-center justify-center gap-2 text-blue-100 mb-2"><Target className="w-5 h-5" /><p className="font-semibold text-lg">Produção</p></div>
            <p className="text-4xl font-bold text-white">{producao.resultado}<span className="text-xl font-normal text-blue-200"> / {producao.meta}</span></p>
          </div>
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur text-center">
            <div className="flex items-center justify-center gap-2 text-blue-100 mb-2"><Award className="w-5 h-5" /><p className="font-semibold text-lg">Qualidade</p></div>
            <p className="text-4xl font-bold text-white">{Math.round(qualidade.pontuacao)}<span className="text-xl font-normal text-blue-200"> / 100</span></p>
          </div>
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur text-center">
            <div className="flex items-center justify-center gap-2 text-blue-100 mb-2"><Users2 className="w-5 h-5" /><p className="font-semibold text-lg">Renovação</p></div>
            <p className="text-4xl font-bold text-white">{Math.round(renovacao.taxaContato)}<span className="text-xl font-normal text-blue-200">%</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-orange-200 mb-2"><Target className="w-5 h-5" /><p className="font-semibold text-lg">Foco de Hoje</p></div>
            <p className="text-white text-xl">{focoDoDia?.objetivo ?? 'Nenhum foco definido ainda.'}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-orange-200 mb-2"><Sparkles className="w-5 h-5" /><p className="font-semibold text-lg">Sugestão da IA</p></div>
            {sugestoes[0] ? (
              <p className="text-blue-100 text-base flex gap-2"><Lightbulb className="w-4 h-4 shrink-0 mt-1 text-orange-200" />{sugestoes[0].texto}</p>
            ) : (
              <p className="text-blue-200 text-base italic">Nenhuma sugestão gerada ainda hoje.</p>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200 text-base italic">
          &quot;Problemas escondidos crescem. Problemas compartilhados são resolvidos.&quot;
        </p>
      </div>
    </div>
  )
}
