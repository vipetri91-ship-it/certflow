'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, TrendingUp } from 'lucide-react'

const AGR_LABELS: Record<string, string> = {
  'ana.karolina': 'Ana Karolina',
  'arlen': 'Arlen',
  'vinicius': 'Vinicius',
  'laryssa': 'Laryssa',
}

const AGR_COLORS: Record<string, { bg: string; light: string; darkLight: string; text: string; darkText: string }> = {
  'ana.karolina': { bg: 'bg-violet-400', light: 'bg-violet-50',  darkLight: 'dark:bg-violet-900/40', text: 'text-violet-600', darkText: 'dark:text-violet-400' },
  'arlen':        { bg: 'bg-blue-500',   light: 'bg-blue-50',    darkLight: 'dark:bg-blue-900/40',   text: 'text-blue-600',   darkText: 'dark:text-blue-400'   },
  'vinicius':     { bg: 'bg-green-500',  light: 'bg-green-50',   darkLight: 'dark:bg-green-900/40',  text: 'text-green-600',  darkText: 'dark:text-green-400'  },
  'laryssa':      { bg: 'bg-pink-500',   light: 'bg-pink-50',    darkLight: 'dark:bg-pink-900/40',   text: 'text-pink-600',   darkText: 'dark:text-pink-400'   },
}

interface AGRPerf {
  agr: string; vendas: number; valorVendas: number; emissoes: number; mediadiaria: number
}

interface Props {
  performanceAgr: AGRPerf[]
  isAdmin: boolean
  userName: string
  userAgr: string | null
  compact?: boolean
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function iniciais(nome: string) {
  return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function CardAGR({ agr, onClose }: { agr: AGRPerf; onClose: () => void }) {
  const cor = AGR_COLORS[agr.agr] ?? AGR_COLORS.vinicius
  const ticket = agr.vendas > 0 ? agr.valorVendas / agr.vendas : 0

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${cor.bg} flex items-center justify-center text-white font-bold text-lg`}>
              {iniciais(AGR_LABELS[agr.agr] ?? agr.agr)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{AGR_LABELS[agr.agr]}</p>
              <p className="text-xs text-gray-400">Performance do mês</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {[
            { label: 'Vendas', valor: agr.vendas.toString(), sub: `Média: ${agr.mediadiaria.toFixed(1)}/dia` },
            { label: 'Faturamento', valor: fmt(agr.valorVendas), sub: `Ticket: ${fmt(ticket)}` },
            { label: 'Emissões', valor: agr.emissoes.toString(), sub: `${agr.vendas > 0 ? Math.round(agr.emissoes / agr.vendas * 100) : 0}% convertidas` },
          ].map(item => (
            <div key={item.label} className={`flex items-center justify-between p-3.5 ${cor.light} rounded-xl`}>
              <div>
                <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
              <p className={`text-2xl font-black ${cor.text}`}>{item.valor}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const META_DIARIA = 10 // meta individual por dia

function getEmoji(mediadiaria: number): { emoji: string; label: string; pct: number } {
  const pct = Math.round((mediadiaria / META_DIARIA) * 100)
  if (pct === 0)   return { emoji: '😭', label: 'Sem vendas ainda', pct }
  if (pct <= 20)   return { emoji: '😢', label: 'Muito abaixo da meta', pct }
  if (pct <= 40)   return { emoji: '😔', label: 'Abaixo da meta', pct }
  if (pct <= 60)   return { emoji: '😐', label: 'Metade da meta', pct }
  if (pct <= 79)   return { emoji: '🙂', label: 'Quase lá!', pct }
  if (pct <= 99)   return { emoji: '😊', label: 'Perto da meta!', pct }
  if (pct <= 119)  return { emoji: '😄', label: 'Meta batida! 🎯', pct }
  if (pct <= 149)  return { emoji: '🥳', label: 'Acima da meta!', pct }
  return               { emoji: '🚀', label: 'Mandando muito!', pct }
}

export function PainelAGR({ performanceAgr, isAdmin, userName, userAgr, compact }: Props) {
  const [idx, setIdx] = useState(0)
  const [modal, setModal] = useState(false)

  // Admin vê todos os AGRs em carrossel; outros veem só o seu
  const agrs = isAdmin
    ? performanceAgr
    : performanceAgr.filter(a =>
        a.agr === userAgr ||
        AGR_LABELS[a.agr]?.toLowerCase().split(' ')[0] === userName.toLowerCase().split(' ')[0]
      )

  const agrAtual = agrs[idx] ?? agrs[0]
  if (!agrAtual) return null

  const cor = AGR_COLORS[agrAtual.agr] ?? AGR_COLORS.vinicius
  const maxVendas = Math.max(...performanceAgr.map(a => a.vendas), 1)
  const humor = getEmoji(agrAtual.mediadiaria)

  function prev() { setIdx(i => (i - 1 + agrs.length) % agrs.length) }
  function next() { setIdx(i => (i + 1) % agrs.length) }

  // Modo compacto — horizontal para mobile
  if (compact) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-3">
        <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Performance do Mês</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {performanceAgr.map(a => {
            const c = AGR_COLORS[a.agr] ?? AGR_COLORS.vinicius
            return (
              <div key={a.agr} className={`${c.light} ${c.darkLight} rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {iniciais(AGR_LABELS[a.agr] ?? a.agr)}
                  </div>
                  <span className={`text-xs font-semibold ${c.text} ${c.darkText} truncate`}>{AGR_LABELS[a.agr]?.split(' ')[0]}</span>
                </div>
                <p className={`text-xl font-black ${c.text} ${c.darkText}`}>{a.vendas}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{fmt(a.valorVendas)}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-72 shrink-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden">

        {/* Header do painel */}
        <div className={`${cor.bg} p-5 text-white`}>
          <div className="flex items-center justify-between mb-4">
            {isAdmin && agrs.length > 1 ? (
              <button onClick={prev} className="p-1 rounded-full hover:bg-white/20 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : <div className="w-6" />}

            <div className="text-center">
              {/* Avatar com emoji de humor sobreposto */}
              <div className="relative w-14 h-14 mx-auto mb-2">
                <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-xl ring-2 ring-white/40">
                  {iniciais(AGR_LABELS[agrAtual.agr] ?? agrAtual.agr)}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 text-xl leading-none"
                  title={humor.label}
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                >
                  {humor.emoji}
                </span>
              </div>
              <button onClick={() => setModal(true)} className="hover:underline font-semibold text-sm">
                {AGR_LABELS[agrAtual.agr] ?? agrAtual.agr}
              </button>
              <p className="text-white/70 text-xs mt-0.5">Agente de Registro</p>
              {/* Barra de progresso da meta */}
              <div className="mt-2.5 px-2">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>{humor.label}</span>
                  <span>{Math.min(humor.pct, 999)}%</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(humor.pct, 100)}%` }}
                  />
                </div>
                <p className="text-white/50 text-xs mt-1">Meta: {META_DIARIA} vendas/dia</p>
              </div>
            </div>

            {isAdmin && agrs.length > 1 ? (
              <button onClick={next} className="p-1 rounded-full hover:bg-white/20 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : <div className="w-6" />}
          </div>

          {/* Dots de navegação — só para admin */}
          {isAdmin && agrs.length > 1 && (
            <div className="flex justify-center gap-1.5">
              {agrs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`rounded-full transition-all ${i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">
            <TrendingUp className="w-3.5 h-3.5" />
            Produção do Mês
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Vendas', valor: agrAtual.vendas.toString() },
              { label: 'Emissões', valor: agrAtual.emissoes.toString() },
            ].map(s => (
              <div key={s.label} className={`${cor.light} ${cor.darkLight} rounded-xl p-3`}>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">{s.label}</p>
                <p className={`text-xl font-black ${cor.text} ${cor.darkText}`}>{s.valor}</p>
              </div>
            ))}
          </div>

          <div className={`${cor.light} ${cor.darkLight} rounded-xl p-3`}>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Faturamento</p>
            <p className={`text-lg font-black ${cor.text} ${cor.darkText}`}>{fmt(agrAtual.valorVendas)}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Média: {agrAtual.mediadiaria.toFixed(1)} vendas/dia</p>
          </div>

          {/* Barra de progresso comparativa — só admin */}
          {isAdmin && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Ranking da equipe</p>
              {[...performanceAgr].sort((a, b) => b.vendas - a.vendas).map(a => {
                const c = AGR_COLORS[a.agr] ?? AGR_COLORS.vinicius
                const pct = Math.round((a.vendas / maxVendas) * 100)
                return (
                  <div key={a.agr}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-medium ${a.agr === agrAtual.agr ? `${c.text} ${c.darkText}` : 'text-gray-500 dark:text-slate-400'}`}>
                        {AGR_LABELS[a.agr]}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500">{a.vendas}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bg} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {modal && <CardAGR agr={agrAtual} onClose={() => setModal(false)} />}
    </>
  )
}