'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'

// ─── Detecção de gênero pelo primeiro nome ────────────────────────────────────
// Nomes masculinos explícitos para evitar falsos femininos
const NOMES_MASCULINOS = ['arlen', 'vinicius', 'lucas', 'pedro', 'carlos', 'joão', 'joao',
  'andre', 'rafael', 'guilherme', 'rodrigo', 'felipe', 'bruno', 'marcos', 'leandro']

function detectarGenero(nome: string): 'M' | 'F' {
  const n = nome.toLowerCase().trim()
  if (NOMES_MASCULINOS.some(m => n === m || n.startsWith(m))) return 'M'
  // Maioria dos nomes femininos brasileiros terminam em 'a'
  if (n.endsWith('a') || n.endsWith('ane') || n.endsWith('ine') || n.endsWith('isse')) return 'F'
  return 'M'
}

// ─── Variações de gênero ──────────────────────────────────────────────────────
function g(genero: 'M' | 'F', masc: string, fem: string): string {
  return genero === 'F' ? fem : masc
}

// ─── Mensagens por contexto do dia ───────────────────────────────────────────

type MsgFn = (nome: string, gen: 'M' | 'F') => string

// Segunda-feira — começando a semana
const MSG_SEGUNDA: MsgFn[] = [
  (n, _g2) => `Segunda-feira chegou, ${n}! Nova semana, novas oportunidades. Que essa semana seja cheia de emissões e clientes satisfeitos! 💪`,
  (n, g2) => `Bora começar a semana com tudo, ${n}! A V&G está aqui, os clientes estão esperando e você está ${g(g2, 'pronto', 'pronta')} para arrasar! 🚀`,
  (n, _g2) => `${n}, a semana acabou de começar e você já está aqui. Isso diz muito sobre quem você é! Vamos nessa? 🌟`,
]

// Terça, Quarta, Quinta — meio da semana, neutro
const MSG_MEIOSEMANA: MsgFn[] = [
  (n, _g2) => `${n}, você transforma burocracia em solução! Isso é um superpoder — usa ele bem hoje! 🦸`,
  (n, _g2) => `Que bom ver você por aqui, ${n}! A V&G fica mais forte com você aqui. Hoje vai ser incrível! 🌟`,
  (n, _g2) => `${n}, cada certificado emitido é uma empresa que opera com mais segurança. Você faz parte disso! ⚙️✨`,
  (n, _g2) => `Ei ${n}! Cada cliente que você atende vai embora mais tranquilo do que chegou. Isso tem valor imensurável! 💛`,
  (n, _g2) => `${n}, hoje é mais um dia para fazer a diferença na vida dos seus clientes. Eles confiam em você — e fazem muito bem! 🌟`,
  (n, g2) => `${g(g2, 'Preparado', 'Preparada')} para mais um dia incrível, ${n}? O seu desempenho prova que você nasceu pra isso! 📈🔥`,
  (n, _g2) => `${n}, você é o tipo de pessoa que faz a diferença só por estar presente. Continue assim! ✨`,
  (n, _g2) => `Bora ${n}! Os clientes estão esperando por aquele atendimento incrível que só você sabe dar. 💥`,
]

// Sexta-feira — fim de semana chegando
const MSG_SEXTA: MsgFn[] = [
  (n, _g2) => `Sexta-feira, ${n}! Fecha com chave de ouro que o fim de semana vem aí! 🎉`,
  (n, _g2) => `${n}, é sexta! Último sprint da semana — depois é merecido descanso. Bora fechar com o pé direito? 🏁`,
  (n, _g2) => `A semana foi intensa, ${n}, mas aqui você está na sexta! Isso já é vitória. Termina o dia com tudo! 🏆`,
]

// Final de semana — raro mas possível
const MSG_FDS: MsgFn[] = [
  (n, g2) => `${g(g2, 'Dedicado', 'Dedicada')} até no final de semana, ${n}? Essa é a diferença! Seja bem-${g(g2, 'vindo', 'vinda')}! 💪`,
  (n, _g2) => `${n} no sistema no final de semana — isso é comprometimento de verdade! Bom trabalho! 🌟`,
]

function getMensagens(diaSemana: number): MsgFn[] {
  if (diaSemana === 1) return MSG_SEGUNDA         // Segunda
  if (diaSemana === 5) return MSG_SEXTA            // Sexta
  if (diaSemana === 0 || diaSemana === 6) return MSG_FDS  // Sábado/Domingo
  return MSG_MEIOSEMANA                            // Ter, Qua, Qui
}

function getMensagem(nome: string): string {
  const genero = detectarGenero(nome)
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const msgs = getMensagens(diaSemana)

  // Hash determinístico por dia + nome para variar sem repetir no mesmo dia
  const seed = hoje.toDateString() + nome
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i)
  const idx = Math.abs(hash) % msgs.length

  return msgs[idx](nome, genero)
}

function getSaudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props { nomeUsuario: string }

export function WelcomePopup({ nomeUsuario }: Props) {
  const [visivel, setVisivel] = useState(false)
  const primeiroNome = nomeUsuario.split(' ')[0]
  const chaveHoje    = `certflow_welcome_${new Date().toDateString()}_${primeiroNome}`

  useEffect(() => {
    const jaViu = localStorage.getItem(chaveHoje)
    if (!jaViu) {
      const t = setTimeout(() => setVisivel(true), 800)
      return () => clearTimeout(t)
    }
  }, [chaveHoje])

  function fechar() {
    localStorage.setItem(chaveHoje, '1')
    setVisivel(false)
  }

  if (!visivel) return null

  const saudacao = getSaudacao()
  const mensagem = getMensagem(primeiroNome)
  const hora     = new Date().getHours()

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
      onClick={fechar}>
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="text-4xl mb-2">
              {hora < 12 ? '🌅' : hora < 18 ? '☀️' : '🌙'}
            </div>
            <p className="text-blue-100 text-sm font-medium">{saudacao},</p>
            <h2 className="text-2xl font-black mt-0.5">{primeiroNome}! 👋</h2>
          </div>
        </div>

        {/* Mensagem */}
        <div className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-gray-700 dark:text-gray-200 text-base leading-relaxed font-medium">
            {mensagem}
          </p>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <span>V&G Certificação Digital</span>
            <span>·</span>
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          </div>
        </div>

        {/* Botão */}
        <div className="px-6 pb-6">
          <button onClick={fechar}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition text-sm">
            Vamos lá! 🚀
          </button>
        </div>

        {/* Fechar */}
        <button onClick={fechar}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}