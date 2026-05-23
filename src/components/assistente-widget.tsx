'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sparkles, X, Send, Loader2, ChevronDown, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
  carregando?: boolean
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

const BOAS_VINDAS = `Olá! Sou a ZOE, assistente da V&G Certificado Digital. Pode me perguntar sobre processos de emissão, tipos de certificado, dúvidas operacionais ou qualquer coisa relacionada ao nosso trabalho. Como posso ajudar?`

export function AssistenteWidget() {
  const { data: session } = useSession()

  const [aberto,     setAberto]     = useState(false)
  const [mensagens,  setMensagens]  = useState<Mensagem[]>([{ role: 'assistant', content: BOAS_VINDAS }])
  const [input,      setInput]      = useState('')
  const [enviando,   setEnviando]   = useState(false)
  const [gravando,   setGravando]   = useState(false)
  const [vozAtiva,   setVozAtiva]   = useState(true)
  const [suporteVoz, setSuporteVoz] = useState(false)

  // Refs para evitar closures desatualizados
  const mensagensRef  = useRef(mensagens)
  const vozAtivaRef   = useRef(vozAtiva)
  const enviandoRef   = useRef(enviando)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { mensagensRef.current = mensagens },  [mensagens])
  useEffect(() => { vozAtivaRef.current  = vozAtiva  },  [vozAtiva])
  useEffect(() => { enviandoRef.current  = enviando  },  [enviando])

  useEffect(() => {
    const ok = ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
            && ('speechSynthesis' in window)
    setSuporteVoz(ok)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 100)
  }, [aberto])

  // ── Síntese de voz ──────────────────────────────────────────────────────────
  function falar(texto: string) {
    if (!vozAtivaRef.current || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const limpo = texto
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/#{1,3} /g, '')
      .replace(/🔗[^\n]*/g, '')
      .replace(/[🔴🟠🟡🟢🔵📋📞✅⚫📊📧💬📝]/g, '')
      .trim()
      .substring(0, 600)

    const utter = new SpeechSynthesisUtterance(limpo)
    utter.lang = 'pt-BR'
    utter.rate = 1.0
    utter.pitch = 1.05

    const vozes = window.speechSynthesis.getVoices()
    const voz = vozes.find(v => v.lang === 'pt-BR') || vozes.find(v => v.lang.startsWith('pt'))
    if (voz) utter.voice = voz

    window.speechSynthesis.speak(utter)
  }

  // ── Enviar mensagem ─────────────────────────────────────────────────────────
  async function enviar(textoParam?: string) {
    const texto = (textoParam !== undefined ? textoParam : input).trim()
    if (!texto || enviandoRef.current) return

    setInput('')
    setEnviando(true)
    window.speechSynthesis?.cancel()

    // Usa ref para pegar mensagens atuais sem depender de closure
    const historiaAtual = mensagensRef.current
    const novasMensagens: Mensagem[] = [
      ...historiaAtual,
      { role: 'user',      content: texto },
      { role: 'assistant', content: '', carregando: true },
    ]
    setMensagens(novasMensagens)

    try {
      const historico = novasMensagens
        .filter(m => !m.carregando)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/assistente/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: historico }),
      })

      if (!res.ok || !res.body) throw new Error('Falha na resposta')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let resposta  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        resposta += decoder.decode(value, { stream: true })
        setMensagens(prev =>
          prev.map((m, i) => i === prev.length - 1 ? { ...m, content: resposta, carregando: false } : m)
        )
      }

      if (resposta) falar(resposta)

    } catch {
      setMensagens(prev =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: 'Desculpe, ocorreu um erro. Tente novamente.', carregando: false }
            : m
        )
      )
    } finally {
      setEnviando(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // ── Reconhecimento de voz ───────────────────────────────────────────────────
  function toggleGravacao() {
    if (gravando) {
      recognitionRef.current?.stop()
      setGravando(false)
      return
    }

    const API = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!API) return

    const rec = new API()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false

    rec.onstart  = () => setGravando(true)
    rec.onerror  = () => setGravando(false)
    rec.onend    = () => setGravando(false)

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim()
      setGravando(false)
      if (!transcript) return

      // Mostra o que foi reconhecido no input por 700ms, depois envia
      setInput(transcript)
      setTimeout(() => {
        setInput('')
        enviar(transcript)
      }, 700)
    }

    recognitionRef.current = rec
    rec.start()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function limpar() {
    window.speechSynthesis?.cancel()
    setMensagens([{ role: 'assistant', content: BOAS_VINDAS }])
  }

  function fechar() {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.stop()
    setAberto(false)
  }

  if (!session) return null

  return (
    <>
      {aberto && (
        <div
          className="fixed bottom-20 right-4 z-50 w-[360px] sm:w-[400px] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">ZOE</p>
                <p className="text-xs text-blue-200 leading-tight">Assistente V&G · {suporteVoz ? '🎤 Voz ativa' : 'Texto'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {suporteVoz && (
                <button
                  onClick={() => { window.speechSynthesis?.cancel(); setVozAtiva(v => !v) }}
                  title={vozAtiva ? 'Silenciar Zoe' : 'Ativar voz da Zoe'}
                  className="p-1.5 rounded-lg text-blue-200 hover:bg-white/20 transition"
                >
                  {vozAtiva ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              )}
              <button onClick={limpar} className="p-1.5 rounded-lg text-blue-200 hover:bg-white/20 transition text-xs">
                Limpar
              </button>
              <button onClick={fechar} className="p-1.5 rounded-lg text-blue-200 hover:bg-white/20 transition">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Indicador de gravação */}
          {gravando && (
            <div className="bg-red-500 px-4 py-2 flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs text-white font-medium">Ouvindo... fale agora</span>
              <button onClick={() => { recognitionRef.current?.stop(); setGravando(false) }}
                className="ml-auto text-white/80 hover:text-white text-xs underline">
                Cancelar
              </button>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900">
            {mensagens.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm border border-gray-100 dark:border-slate-600 rounded-bl-sm'
                }`}>
                  {m.carregando ? (
                    <span className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Pensando...
                    </span>
                  ) : (
                    <div>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                      {/* Botão para ouvir resposta individual */}
                      {m.role === 'assistant' && suporteVoz && m.content && (
                        <button
                          onClick={() => falar(m.content)}
                          title="Ouvir esta resposta"
                          className="inline-block ml-1.5 align-middle text-gray-300 hover:text-blue-400 transition"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 shrink-0">
            <div className="flex items-end gap-2">
              {suporteVoz && (
                <button
                  onClick={toggleGravacao}
                  disabled={enviando}
                  title={gravando ? 'Parar gravação' : 'Falar com a Zoe'}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition shrink-0 disabled:opacity-40 ${
                    gravando
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
                      : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300'
                  }`}
                >
                  {gravando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={suporteVoz ? 'Digite ou clique no microfone 🎤' : 'Digite sua dúvida...'}
                rows={1}
                disabled={enviando}
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
                style={{ maxHeight: '120px' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                }}
              />
              <button
                onClick={() => enviar()}
                disabled={enviando || !input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              {suporteVoz ? 'Voz disponível no Chrome/Edge · Shift+Enter para nova linha' : 'Shift+Enter para nova linha'}
            </p>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => (aberto ? fechar() : setAberto(true))}
        title={aberto ? 'Fechar assistente' : 'Abrir assistente ZOE'}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
          aberto
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
        }`}
      >
        {aberto ? <X className="w-5 h-5 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
      </button>
    </>
  )
}
