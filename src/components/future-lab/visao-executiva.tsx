import { AlertTriangle, TrendingUp, Hourglass, UserCheck, ShieldAlert } from 'lucide-react'
import { visaoExecutiva } from '@/mocks/future-dashboard'

interface Props {
  dados: typeof visaoExecutiva
}

export function VisaoExecutiva({ dados }: Props) {
  const blocos = [
    {
      titulo: 'Riscos',
      icone: <AlertTriangle className="w-4 h-4" />,
      cor: '#f87171',
      itens: dados.riscos,
    },
    {
      titulo: 'Oportunidades',
      icone: <TrendingUp className="w-4 h-4" />,
      cor: '#34d399',
      itens: dados.oportunidades,
    },
    {
      titulo: 'Gargalos',
      icone: <Hourglass className="w-4 h-4" />,
      cor: '#fbbf24',
      itens: dados.gargalos,
    },
  ]

  return (
    <div className="fl-panel p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--fl-purple)]/20 to-transparent border border-white/10">
          <ShieldAlert className="w-4 h-4 text-[var(--fl-purple)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--fl-text-hi)]">Visão Executiva</h2>
          <p className="fl-label">Leitura em 5 segundos</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {blocos.map(bloco => (
          <div key={bloco.titulo} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
            <div className="flex items-center gap-2 mb-2.5" style={{ color: bloco.cor }}>
              {bloco.icone}
              <span className="text-xs font-semibold uppercase tracking-wider">{bloco.titulo}</span>
            </div>
            {bloco.itens.length === 0 ? (
              <p className="text-xs text-[var(--fl-text-lo)]">Nenhum item no momento</p>
            ) : (
              <ul className="space-y-1.5">
                {bloco.itens.map(item => (
                  <li key={item} className="text-xs text-[var(--fl-text-hi)]/80 leading-snug pl-2.5 border-l-2" style={{ borderColor: `${bloco.cor}55` }}>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
          <div className="flex items-center gap-2 mb-2.5 text-[var(--fl-cyan)]">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Equipe que precisa de apoio</span>
          </div>
          <ul className="space-y-1.5">
            {dados.colaboradoresSuporte.map(c => (
              <li key={c.nome} className="text-xs text-[var(--fl-text-hi)]/80">
                <span className="font-medium">{c.nome}</span> — {c.motivo}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
          <div className="flex items-center gap-2 mb-2.5 text-[var(--fl-pink)]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Clientes críticos</span>
          </div>
          <ul className="space-y-1.5">
            {dados.clientesCriticos.map(c => (
              <li key={c.nome} className="text-xs text-[var(--fl-text-hi)]/80">
                <span className="font-medium">{c.nome}</span> — {c.motivo}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
