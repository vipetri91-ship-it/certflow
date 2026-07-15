import { Header } from '@/components/header'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Minus, Target, Award, CheckCircle2,
  Lightbulb, Sparkles, Users2, Settings, Calculator, History,
} from 'lucide-react'
import { calcularIndicadorCompleto } from '@/lib/performance/calcular'
import { GaugeICF } from '@/components/performance/gauge-icf'

const STATUS_COR: Record<string, string> = {
  excelente: 'text-green-600 bg-green-50 border-green-200',
  atencao:   'text-yellow-700 bg-yellow-50 border-yellow-200',
  abaixo:    'text-red-600 bg-red-50 border-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  excelente: 'Excelente',
  atencao:   'Atenção',
  abaixo:    'Abaixo da Meta',
}

function fmtData(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default async function PerformancePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'performance:read')) redirect('/dashboard')

  const indicador = await calcularIndicadorCompleto()
  const { producao, qualidade, renovacao, icf, classificacao, tendencia } = indicador

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  const [focoDoDia, sugestoes] = await Promise.all([
    prisma.focoDoDia.findFirst({
      orderBy: { data: 'desc' },
      include: { responsavel: { select: { nome: true } } },
    }),
    prisma.sugestaoIA.findMany({
      where: { createdAt: { gte: inicioHoje } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ])

  const EvolucaoIcone = tendencia.evolucao === null ? Minus : tendencia.evolucao > 0 ? TrendingUp : tendencia.evolucao < 0 ? TrendingDown : Minus
  const evolucaoCor = tendencia.evolucao === null || tendencia.evolucao === 0
    ? 'text-gray-400'
    : tendencia.evolucao > 0 ? 'text-green-600' : 'text-red-500'

  return (
    <div>
      <Header titulo="Gestão de Performance da Equipe" />
      <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">

        {/* ── ICF — elemento principal da tela ──────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex flex-col items-center shrink-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Índice CertFlow</p>
              <GaugeICF valor={icf} cor={classificacao.cor} tamanho={280} />
              <p className="text-2xl font-bold text-gray-900 dark:text-white -mt-2">
                {classificacao.emoji} {classificacao.label}
              </p>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Produção 40%</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{producao.pontuacao}%</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Qualidade 40%</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{Math.round(qualidade.pontuacao)}%</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Renovação 20%</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{Math.round(renovacao.percentual)}%</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Evolução</p>
                  <p className={`text-xl font-bold flex items-center justify-center gap-1 ${evolucaoCor}`}>
                    <EvolucaoIcone className="w-4 h-4" />
                    {tendencia.evolucao === null ? '—' : `${tendencia.evolucao > 0 ? '+' : ''}${tendencia.evolucao}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-slate-400">
                <p>Mês anterior: <strong className="text-gray-800 dark:text-white">{tendencia.icfMesAnterior ?? '—'}</strong></p>
                <p>Média 3 meses: <strong className="text-gray-800 dark:text-white">{tendencia.media3Meses?.toFixed(1) ?? '—'}</strong></p>
                <p>Melhor histórico: <strong className="text-gray-800 dark:text-white">{tendencia.melhorHistorico?.icf ?? '—'}</strong></p>
                <p>Pior histórico: <strong className="text-gray-800 dark:text-white">{tendencia.piorHistorico?.icf ?? '—'}</strong></p>
              </div>

              <p className="text-sm text-gray-500 dark:text-slate-400 italic border-t border-gray-100 dark:border-slate-700 pt-3">
                &quot;O sucesso da V&amp;G não depende apenas de produzir mais. Depende de produzir com
                qualidade, proteger nossos clientes e evoluir continuamente.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* ── Produção / Qualidade / Renovação ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Produção */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-gray-800 dark:text-white">Produção</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COR[producao.status]}`}>
                {STATUS_LABEL[producao.status]}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {producao.resultado}<span className="text-base font-normal text-gray-400"> / {producao.meta}</span>
            </p>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(producao.percentual, 100)}%`,
                  background: producao.status === 'excelente' ? '#22c55e' : producao.status === 'atencao' ? '#eab308' : '#ef4444',
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-500 dark:text-slate-400">
              <p>{producao.percentual}% da meta</p>
              <p>{producao.diasRestantes} dias restantes</p>
              <p>Média necessária: {producao.mediaDiariaNecessaria.toFixed(1)}/dia</p>
              <p>Previsão: {producao.previsaoFechamento}</p>
            </div>
          </div>

          {/* Qualidade */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-gray-800 dark:text-white">Qualidade</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COR[qualidade.status]}`}>
                {STATUS_LABEL[qualidade.status]}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(qualidade.pontuacao)}<span className="text-base font-normal text-gray-400"> / 100</span>
            </p>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${qualidade.pontuacao}%`,
                  background: qualidade.status === 'excelente' ? '#22c55e' : qualidade.status === 'atencao' ? '#eab308' : '#ef4444',
                }}
              />
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-slate-400 space-y-1">
              <p>{qualidade.ocorrencias} ocorrência{qualidade.ocorrencias !== 1 ? 's' : ''} este mês</p>
              <p>Última ocorrência: {qualidade.ultimaOcorrenciaData ? fmtData(qualidade.ultimaOcorrenciaData) : 'nenhuma'}</p>
            </div>
          </div>

          {/* Renovação */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users2 className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-gray-800 dark:text-white">Renovação</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COR[renovacao.status]}`}>
                {STATUS_LABEL[renovacao.status]}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(renovacao.taxaContato)}<span className="text-base font-normal text-gray-400">% contactados</span>
            </p>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${renovacao.taxaContato}%`,
                  background: renovacao.status === 'excelente' ? '#22c55e' : renovacao.status === 'atencao' ? '#eab308' : '#ef4444',
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-500 dark:text-slate-400">
              <p>Vencendo em 30d: {renovacao.clientesVencendo30}</p>
              <p>Pendentes: {renovacao.clientesPendentes}</p>
              <p className="col-span-2">Taxa de renovação: {Math.round(renovacao.taxaConversao)}%</p>
            </div>
          </div>
        </div>

        {/* ── Foco do Dia / Sugestões da IA ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-orange-500" />
              <p className="font-semibold text-gray-800 dark:text-white">Foco de Hoje</p>
            </div>
            {focoDoDia ? (
              <div className="space-y-2">
                <p className="text-gray-900 dark:text-white font-medium">{focoDoDia.objetivo}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                  {focoDoDia.responsavel && <span>Responsável: {focoDoDia.responsavel.nome}</span>}
                  {focoDoDia.prazo && <span>Prazo: {fmtData(focoDoDia.prazo)}</span>}
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${
                    focoDoDia.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700'
                    : focoDoDia.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                    {focoDoDia.status === 'CONCLUIDO' ? 'Concluído' : focoDoDia.status === 'EM_ANDAMENTO' ? 'Em andamento' : 'Pendente'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nenhum foco definido ainda — cadastre na Administração.</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <p className="font-semibold text-gray-800 dark:text-white">Sugestões da IA</p>
            </div>
            {sugestoes.length > 0 ? (
              <ul className="space-y-2">
                {sugestoes.map(s => (
                  <li key={s.id} className="text-sm text-gray-700 dark:text-slate-300 flex gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    {s.texto}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">O robô diário ainda não gerou sugestões hoje.</p>
            )}
          </div>
        </div>

        {/* ── Compromisso da V&G ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-sm p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold text-lg">Nosso Compromisso</p>
          </div>
          <p className="text-blue-50 text-sm leading-relaxed space-y-1">
            Este painel existe para melhorar nossa empresa, não para procurar culpados. Os indicadores
            nos ajudam a tomar decisões melhores. Problemas identificados cedo são oportunidades de
            melhoria. Errar faz parte do aprendizado. Esconder um erro não faz parte da cultura da V&amp;G.
            Nosso compromisso é melhorar continuamente nossos processos, proteger nossos clientes e
            crescer juntos como equipe.
          </p>
          <p className="mt-3 text-orange-200 font-semibold text-sm">
            &quot;Problemas escondidos crescem. Problemas compartilhados são resolvidos.&quot;
          </p>
        </div>

        {/* ── Atalhos ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <Link href="/performance/simulador" className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
            <Calculator className="w-4 h-4" /> Simulador de Meta
          </Link>
          <Link href="/performance/admin/historico" className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
            <History className="w-4 h-4" /> Histórico
          </Link>
          {hasPermission(session.user.role, 'performance:write') && (
            <Link href="/performance/admin" className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              <Settings className="w-4 h-4" /> Administração
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
