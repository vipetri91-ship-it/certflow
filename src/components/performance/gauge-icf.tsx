'use client'

// Velocímetro semicircular — mesmo padrão SVG de
// src/app/(dashboard)/dashboard/widget-meta-vendas.tsx, generalizado pra
// aceitar cor dinâmica conforme a classificação do ICF.
const ARC_LENGTH = Math.PI * 90

const CORES: Record<string, string> = {
  verde: '#22c55e',
  azul: '#3b82f6',
  amarelo: '#eab308',
  laranja: '#f97316',
  vermelho: '#ef4444',
}

interface Props {
  valor: number // 0-100
  cor: 'verde' | 'azul' | 'amarelo' | 'laranja' | 'vermelho'
  tamanho?: number
}

export function GaugeICF({ valor, cor, tamanho = 260 }: Props) {
  const progresso = Math.min(Math.max(valor, 0), 100) / 100
  const offset = ARC_LENGTH * (1 - progresso)
  const corHex = CORES[cor] ?? CORES.azul

  return (
    <svg viewBox="0 0 200 115" style={{ width: tamanho, maxWidth: '100%', overflow: 'visible' }}>
      <path
        d="M 10 110 A 90 90 0 0 1 190 110"
        fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round"
        className="dark:[stroke:#334155]"
      />
      <path
        d="M 10 110 A 90 90 0 0 1 190 110"
        fill="none"
        stroke={corHex}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${ARC_LENGTH} ${ARC_LENGTH}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
      />
      <text x="100" y="90" textAnchor="middle" fill="currentColor"
        fontSize="40" fontWeight="bold" className="text-gray-900 dark:text-white" fontFamily="inherit">
        {Math.round(valor)}
      </text>
    </svg>
  )
}
