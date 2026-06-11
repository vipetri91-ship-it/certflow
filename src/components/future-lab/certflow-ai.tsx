import { Sparkles, Users, Calendar, Wallet, Briefcase, UserCircle } from 'lucide-react'
import type { InsightIA } from '@/mocks/future-dashboard'

const CATEGORIA_ICON: Record<InsightIA['categoria'], React.ReactNode> = {
  comercial: <Briefcase className="w-4 h-4" />,
  agenda: <Calendar className="w-4 h-4" />,
  financeiro: <Wallet className="w-4 h-4" />,
  equipe: <Users className="w-4 h-4" />,
  cliente: <UserCircle className="w-4 h-4" />,
}

const PRIORIDADE_COR: Record<InsightIA['prioridade'], string> = {
  alta: '#f87171',
  media: '#fbbf24',
  baixa: '#22d3ee',
}

export function CertflowAI({ insights }: { insights: InsightIA[] }) {
  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-purple)]/30 to-[var(--fl-cyan)]/20 border border-white/10">
          <Sparkles className="w-4 h-4 text-[var(--fl-cyan)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">CertFlow AI</h2>
          <p className="fl-label">Copiloto operacional</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--fl-text-mid)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--fl-cyan)] fl-dot-live" />
          ao vivo
        </span>
      </div>

      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div
            key={insight.id}
            className="fl-rise flex items-start gap-3 rounded-xl px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span
              className="mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${PRIORIDADE_COR[insight.prioridade]}1a`, color: PRIORIDADE_COR[insight.prioridade] }}
            >
              {CATEGORIA_ICON[insight.categoria]}
            </span>
            <p className="text-sm text-[var(--fl-text-hi)]/90 leading-snug">{insight.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
