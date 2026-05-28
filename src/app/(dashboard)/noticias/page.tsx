'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pin, Eye, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Noticia {
  id: string
  titulo: string
  resumo: string | null
  conteudo?: string
  categoria: string
  publicada: boolean
  fixada: boolean
  autorNome: string | null
  createdAt: string
}

const CORES_CATEGORIA: Record<string, string> = {
  'Avisos':         'bg-blue-100 text-blue-700',
  'Legislação':     'bg-purple-100 text-purple-700',
  'Novos Serviços': 'bg-green-100 text-green-700',
  'Promoções':      'bg-orange-100 text-orange-700',
}

function fmtData(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function renderMarkdown(text: string) {
  return text
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-4 mb-1 text-gray-800">{line.slice(3)}</h2>
      if (line.startsWith('# '))  return <h1 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900">{line.slice(2)}</h1>
      if (line.startsWith('- '))  return <li key={i} className="ml-4 list-disc text-gray-700 text-sm">{line.slice(2)}</li>
      if (line.trim() === '')     return <br key={i} />
      return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
    })
}

function ToggleSwitch({ ativo, onChange, desabilitado }: { ativo: boolean; onChange: () => void; desabilitado?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={desabilitado}
      title={ativo ? 'Despublicar' : 'Publicar'}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 shrink-0',
        ativo ? 'bg-green-500' : 'bg-gray-200'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
        ativo ? 'translate-x-4.5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [preview, setPreview] = useState<Noticia | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)

  async function carregar() {
    setCarregando(true)
    const res = await fetch('/api/noticias')
    if (res.ok) setNoticias(await res.json())
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  async function togglePublicada(n: Noticia) {
    setToggling(n.id)
    await fetch(`/api/noticias/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicada: !n.publicada }),
    })
    await carregar()
    setToggling(null)
  }

  async function toggleFixada(n: Noticia) {
    await fetch(`/api/noticias/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixada: !n.fixada }),
    })
    carregar()
  }

  async function abrirPreview(n: Noticia) {
    setCarregandoPreview(true)
    setPreview(n)
    const res = await fetch(`/api/noticias/${n.id}`)
    if (res.ok) setPreview(await res.json())
    setCarregandoPreview(false)
  }

  async function deletar(id: string) {
    if (!confirm('Excluir esta notícia permanentemente?')) return
    setDeletando(id)
    await fetch(`/api/noticias/${id}`, { method: 'DELETE' })
    carregar()
    setDeletando(null)
  }

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notícias & Comunicados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Publique atualizações para os parceiros</p>
        </div>
        <Link href="/noticias/nova"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="w-4 h-4" />
          Nova Notícia
        </Link>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : noticias.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Nenhuma notícia ainda</p>
          <p className="text-sm mt-1">Clique em "Nova Notícia" para publicar o primeiro comunicado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {noticias.map(n => (
            <div key={n.id}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all',
                n.fixada ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'
              )}>
              {n.fixada && <Pin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 rotate-45" />}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', CORES_CATEGORIA[n.categoria] ?? 'bg-gray-100 text-gray-600')}>
                    {n.categoria}
                  </span>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                    n.publicada ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {n.publicada ? 'Publicada' : 'Rascunho'}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{n.titulo}</p>
                {n.resumo && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.resumo}</p>}
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {fmtData(n.createdAt)}{n.autorNome ? ` · ${n.autorNome}` : ''}
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle publicar/despublicar */}
                <div className="flex flex-col items-center gap-0.5">
                  <ToggleSwitch
                    ativo={n.publicada}
                    onChange={() => togglePublicada(n)}
                    desabilitado={toggling === n.id}
                  />
                  <span className="text-[9px] text-gray-400 leading-none">
                    {toggling === n.id ? '...' : n.publicada ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="w-px h-6 bg-gray-100" />

                {/* Fixar */}
                <button onClick={() => toggleFixada(n)} title={n.fixada ? 'Desafixar' : 'Fixar no topo'}
                  className={cn('p-2 rounded-lg transition', n.fixada ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50')}>
                  <Pin className="w-4 h-4 rotate-45" />
                </button>

                {/* Visualizar */}
                <button onClick={() => abrirPreview(n)} title="Visualizar conteúdo"
                  className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition">
                  <Eye className="w-4 h-4" />
                </button>

                {/* Editar */}
                <Link href={`/noticias/${n.id}/editar`}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                  <Pencil className="w-4 h-4" />
                </Link>

                {/* Excluir */}
                <button onClick={() => deletar(n.id)} disabled={deletando === n.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                  {deletando === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', CORES_CATEGORIA[preview.categoria] ?? 'bg-gray-100 text-gray-600')}>
                    {preview.categoria}
                  </span>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                    preview.publicada ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {preview.publicada ? 'Publicada' : 'Rascunho'}
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 text-base leading-snug">{preview.titulo}</h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  {fmtData(preview.createdAt)}{preview.autorNome ? ` · ${preview.autorNome}` : ''}
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto p-5 flex-1">
              {carregandoPreview ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {preview.resumo && (
                    <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3 mb-4">{preview.resumo}</p>
                  )}
                  {preview.conteudo ? renderMarkdown(preview.conteudo) : <p className="text-gray-400 text-sm">Sem conteúdo.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}