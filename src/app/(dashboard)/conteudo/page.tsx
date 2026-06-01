'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Sparkles, CheckCircle, Clock, Loader2, RefreshCw } from 'lucide-react'

interface Post {
  id: string; categoria: string; diaSemana: string; semana: number
  headline: string; legenda: string; hashtags: string
  status: string; criadoEm: string
}

const CATEGORIA_LABEL: Record<string, string> = {
  EDUCATIVO: '📚 Educativo', BENEFICIO: '💼 Benefício', CTA: '🎯 CTA Direto',
  SEGMENTO: '🏢 Segmento', DICA_SEGURANCA: '💡 Dica de Segurança', DATA_EVENTO: '📅 Data/Evento',
}

export default function ConteudoPage() {
  const [posts,    setPosts]    = useState<Post[]>([])
  const [loading,  setLoading]  = useState(true)
  const [gerando,  setGerando]  = useState(false)
  const [aberto,   setAberto]   = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const res  = await fetch('/api/social/posts')
    const data = await res.json()
    setPosts(data.posts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function gerarAgora() {
    setGerando(true)
    await fetch('/api/social/gerar', { method: 'POST' })
    await carregar()
    setGerando(false)
  }

  async function aprovar(id: string) {
    await fetch(`/api/social/posts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APROVADO' }) })
    await carregar()
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Conteúdo para Redes Sociais" />
      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-5">

        {/* Header com ação */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Grade: Segunda · Quarta · Sexta</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Posts gerados automaticamente às 8h</p>
          </div>
          <button onClick={gerarAgora} disabled={gerando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
            {gerando ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar agora</>}
          </button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Carregando...</div>}

        {/* Lista de posts */}
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={() => setAberto(aberto === post.id ? null : post.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{post.diaSemana}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                      {CATEGORIA_LABEL[post.categoria] ?? post.categoria}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post.status === 'APROVADO' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {post.status === 'APROVADO' ? '✓ Aprovado' : '⏳ Pendente'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">"{post.headline}"</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {new Date(post.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <RefreshCw className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform ${aberto === post.id ? 'rotate-180' : ''}`} />
              </div>

              {aberto === post.id && (
                <div className="border-t border-gray-100 dark:border-slate-700 p-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Headline para a imagem</p>
                    <p className="text-base font-bold text-blue-700 dark:text-blue-400">"{post.headline}"</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Legenda completa</p>
                    <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{post.legenda}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Hashtags</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{post.hashtags}</p>
                  </div>
                  {post.status === 'PENDENTE' && (
                    <button onClick={() => aprovar(post.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition">
                      <CheckCircle className="w-4 h-4" /> Aprovar post
                    </button>
                  )}
                  {post.status === 'APROVADO' && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" /> Aprovado — pronto para postar
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!loading && posts.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum post gerado ainda.</p>
              <p className="text-gray-400 text-xs mt-1">Clique em "Gerar agora" para criar o primeiro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}