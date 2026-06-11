import Link from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { NucleoOperacionalView } from '@/components/future-lab/nucleo-operacional'
import { CertflowAI } from '@/components/future-lab/certflow-ai'
import { RadarOperacional } from '@/components/future-lab/radar-operacional'
import { TimelineViva } from '@/components/future-lab/timeline-viva'
import { PainelEnergia } from '@/components/future-lab/painel-energia'
import { VisaoExecutiva } from '@/components/future-lab/visao-executiva'
import { ModoMissao } from '@/components/future-lab/modo-missao'
import { RedeEquipe } from '@/components/future-lab/rede-equipe'
import { FluxoFinanceiro } from '@/components/future-lab/fluxo-financeiro'
import {
  nucleoOperacional,
  insightsIA,
  sinaisRadar,
  eventosTimeline,
  energiaEmpresa,
  visaoExecutiva,
  missaoDoDia,
  equipeRede,
  fluxoFinanceiro,
} from '@/mocks/future-dashboard'

export default function DashboardFuturePage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Cabeçalho */}
      <div className="fl-rise flex items-center justify-between mb-8">
        <div>
          <span className="fl-label flex items-center gap-2 text-[var(--fl-cyan)]">
            <FlaskConical className="w-3.5 h-3.5" />
            CertFlow Future Lab — Protótipo experimental
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1.5 bg-gradient-to-r from-white via-[var(--fl-cyan)] to-[var(--fl-purple)] bg-clip-text text-transparent">
            Centro de Comando
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--fl-text-mid)] border border-white/10 hover:bg-white/[0.06] hover:text-[var(--fl-text-hi)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao sistema
        </Link>
      </div>

      {/* Núcleo Operacional */}
      <div className="fl-rise fl-panel mb-6" style={{ animationDelay: '60ms' }}>
        <NucleoOperacionalView data={nucleoOperacional} />
      </div>

      {/* Missão do dia + Energia */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="fl-rise" style={{ animationDelay: '100ms' }}>
          <ModoMissao
            titulo={missaoDoDia.titulo}
            objetivo={missaoDoDia.objetivo}
            concluidas={missaoDoDia.concluidas}
            faltam={missaoDoDia.faltam}
            probabilidadeSucesso={missaoDoDia.probabilidadeSucesso}
          />
        </div>
        <div className="fl-rise" style={{ animationDelay: '140ms' }}>
          <PainelEnergia percentual={energiaEmpresa.percentual} fatores={energiaEmpresa.fatores} />
        </div>
      </div>

      {/* IA + Radar */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="fl-rise" style={{ animationDelay: '180ms' }}>
          <CertflowAI insights={insightsIA} />
        </div>
        <div className="fl-rise" style={{ animationDelay: '220ms' }}>
          <RadarOperacional sinais={sinaisRadar} />
        </div>
      </div>

      {/* Visão executiva */}
      <div className="fl-rise mb-5" style={{ animationDelay: '260ms' }}>
        <VisaoExecutiva dados={visaoExecutiva} />
      </div>

      {/* Timeline + Rede da equipe */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="fl-rise" style={{ animationDelay: '300ms' }}>
          <TimelineViva eventos={eventosTimeline} />
        </div>
        <div className="fl-rise" style={{ animationDelay: '340ms' }}>
          <RedeEquipe equipe={equipeRede} />
        </div>
      </div>

      {/* Fluxo financeiro */}
      <div className="fl-rise mb-10" style={{ animationDelay: '380ms' }}>
        <FluxoFinanceiro
          saudeFinanceira={fluxoFinanceiro.saudeFinanceira}
          previsaoHoje={fluxoFinanceiro.previsaoHoje}
          pontos={fluxoFinanceiro.pontos}
        />
      </div>
    </div>
  )
}
