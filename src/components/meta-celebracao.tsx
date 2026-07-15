'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { X, Trophy } from 'lucide-react'

interface Props {
  vendasMes: number
  meta: number
}

export function MetaCelebracao({ vendasMes, meta }: Props) {
  const [visivel, setVisivel] = useState(false)

  const chave = `certflow_meta_celebracao_${new Date().getFullYear()}_${new Date().getMonth() + 1}`

  useEffect(() => {
    if (vendasMes < meta) return
    const jaComemorou = localStorage.getItem(chave)
    if (jaComemorou) return

    // Aguarda 1.5s para o sistema carregar completamente
    const t = setTimeout(() => {
      setVisivel(true)
      dispararConfete()
    }, 1500)

    return () => clearTimeout(t)
  }, [vendasMes, meta, chave])

  function dispararConfete() {
    const duracao = 6000
    const fim = Date.now() + duracao

    const cores = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4']

    // Chuva de confete dos dois lados
    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: cores,
        zIndex: 9999,
      })
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: cores,
        zIndex: 9999,
      })

      if (Date.now() < fim) requestAnimationFrame(frame)
    }

    // Explosão inicial
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
      colors: cores,
      zIndex: 9999,
    })

    setTimeout(frame, 300)
  }

  function fechar() {
    localStorage.setItem(chave, '1')
    setVisivel(false)
  }

  if (!visivel) return null

  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'bounceIn 0.6s ease-out' }}
      >
        {/* Faixa superior gradiente */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 pt-8 pb-6 text-center">
          <div className="text-6xl mb-3">🏆</div>
          <h2 className="text-2xl font-black text-white tracking-tight">META BATIDA!</h2>
          <p className="text-blue-200 text-sm mt-1 font-medium">{mes}</p>
        </div>

        {/* Conteúdo */}
        <div className="px-8 py-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="text-5xl font-black text-blue-700">{vendasMes}</div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-500 uppercase">certificados</p>
              <p className="text-sm font-bold text-gray-500 uppercase">vendidos</p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>

          <p className="text-gray-700 font-semibold text-base">
            Vocês superaram a meta de <strong className="text-blue-700">{meta} certificados</strong>!
          </p>

          <p className="text-gray-500 text-sm leading-relaxed">
            Cada certificado representa uma empresa ou pessoa que agora opera com mais segurança digital. Isso é o resultado do trabalho de toda a equipe V&G! 🚀
          </p>

          {/* Celebração da equipe */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
            {[
              { nome: 'Vinicius', emoji: '👏' },
              { nome: 'Arlen',    emoji: '🙌' },
              { nome: 'Ana K.',   emoji: '🎉' },
              { nome: 'Laryssa', emoji: '⭐' },
            ].map(m => (
              <div key={m.nome}
                className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                <span>{m.emoji}</span> {m.nome}
              </div>
            ))}
          </div>

          <button onClick={fechar}
            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition text-sm">
            Vamos pelo próximo mês! 🚀
          </button>

          <p className="text-xs text-gray-400">Este popup aparece uma vez por mês ao atingir a meta</p>
        </div>

        {/* Botão fechar */}
        <button onClick={fechar}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes bounceIn {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          80%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
