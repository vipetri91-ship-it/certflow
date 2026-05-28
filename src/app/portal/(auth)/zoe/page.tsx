'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

const SUGESTOES = [
  'Como está minha carteira hoje?',
  'Quais clientes têm certificado vencendo este mês?',
  'Tem algum certificado vencido?',
  'Me dê um resumo geral da minha carteira',
]

function renderMarkdown(text: string) {
  const linhas = text.split('\n')
  const elementos: React.ReactNode[] = []
  let i = 0

  while (i < linhas.length) {
    const linha = linhas[i]

    if (linha.startsWith('### ')) {
      elementos.push(<p key={i} className="font-bold text-sm text-gray-800 mt-3 mb-1">{parseBold(linha.slice(4))}</p>)
    } else if (linha.startsWith('## ')) {
      elementos.push(<p key={i} className="font-bold text-sm text-gray-900 mt-3 mb-1">{parseBold(linha.slice(3))}</p>)
    } else if (linha.startsWith('# ')) {
      elementos.push(<p key={i} className="font-bold text-base text-gray-900 mt-2 mb-1">{parseBold(linha.slice(2))}</p>)
    } else if (linha.startsWith('  • ') || linha.startsWith('  - ')) {
      elementos.push(<p key={i} className="text-sm text-gray-700 pl-4 leading-relaxed">{parseBold(linha.slice(2))}</p>)
    } else if (linha.startsWith('- ') || linha.startsWith('• ')) {
      elementos.push(<p key={i} className="text-sm text-gray-700 leading-relaxed">{parseBold(linha)}</p>)
    } else if (linha.startsWith('---')) {
      elementos.push(<hr key={i} className="border-gray-200 my-2" />)
    } else if (linha.trim() === '') {
      elements: if (i > 0) elementos.push(<div key={i} className="h-1" />)
    } else {
      elementos.push(<p key={i} className="text-sm text-gray-700 leading-relaxed">{parseBold(linha)}</p>)
    }
    i++
  }
  return <>{elementos}</>
}

function parseBold(text: string): React.ReactNode {
  const partes = text.split(/\*\*(.*?)\*\*/)
  return partes.map((parte, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{parte}</strong> : parte
  )
}

export default function ZoePage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  async function enviar(texto?: string) {
    const msg = (texto ?? input).trim()
    if (!msg || carregando) return

    const novas: Mensagem[] = [...mensagens, { role: 'user', content: msg }]
    setMensagens(novas)
    setInput('')
    setCarregando(true)

    try {
      const res = await fetch('/api/portal/zoe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: novas }),
      })

      if (!res.ok || !res.body) throw new Error('Erro na resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let texto = ''

      setMensagens(m => [...m, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        texto += decoder.decode(value, { stream: true })
        setMensagens(m => {
          const copia = [...m]
          copia[copia.length - 1] = { role: 'assistant', content: texto }
          return copia
        })
      }
    } catch {
      setMensagens(m => [...m, { role: 'assistant', content: 'Erro ao conectar com a ZOE. Tente novamente.' }])
    } finally {
      setCarregando(false)
      inputRef.current?.focus()
    }
  }

  const semMensagens = mensagens.length === 0

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">ZOE</p>
          <p className="text-xs text-gray-400">Assistente de IA · V&G Certificação Digital</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">Online</span>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {semMensagens && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8 pt-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mb-5 shadow-lg shadow-violet-200">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Olá! Eu sou a ZOE</h2>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
              Posso te ajudar a consultar os certificados dos seus clientes, verificar vencimentos e muito mais.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGESTOES.map(s => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-left px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3',
              m.role === 'user'
                ? 'bg-gradient-to-br from-violet-600 to-blue-600 text-white rounded-br-sm'
                : 'bg-white border border-gray-100 shadow-sm rounded-bl-sm'
            )}>
              {m.role === 'user'
                ? <p className="text-sm leading-relaxed">{m.content}</p>
                : <div className="space-y-0.5">{renderMarkdown(m.content)}</div>
              }
            </div>
          </div>
        ))}

        {carregando && mensagens[mensagens.length - 1]?.role === 'user' && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={fimRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3">
        <form
          onSubmit={e => { e.preventDefault(); enviar() }}
          className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-violet-300 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pergunte sobre seus clientes ou certificados..."
            disabled={carregando}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || carregando}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-300 mt-2">
          ZOE consulta apenas os dados da sua carteira de clientes
        </p>
      </div>
    </div>
  )
}
