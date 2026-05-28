'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIAS = ['Avisos', 'Legislação', 'Novos Serviços', 'Promoções']

function parseBold(text: string): React.ReactNode {
  const partes = text.split(/\*\*(.*?)\*\*/)
  return partes.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{p}</strong> : p)
}

function renderMarkdown(text: string) {
  return text.split('\n').map((linha, i) => {
    if (linha.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-1">{linha.slice(3)}</h2>
    if (linha.startsWith('# '))  return <h1 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-1">{linha.slice(2)}</h1>
    if (linha.startsWith('- ') || linha.startsWith('• '))
      return <p key={i} className="text-sm text-gray-700 pl-2 leading-relaxed">{parseBold(linha)}</p>
    if (linha.trim() === '') return <div key={i} className="h-2" />
    return <p key={i} className="text-sm text-gray-700 leading-relaxed">{parseBold(linha)}</p>
  })
}

export default function EditarNoticiaPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [titulo, setTitulo]       = useState('')
  const [resumo, setResumo]       = useState('')
  const [conteudo, setConteudo]   = useState('')
  const [categoria, setCategoria] = useState('Avisos')
  const [publicada, setPublicada] = useState(false)
  const [fixada, setFixada]       = useState(false)
  const [preview, setPreview]     = useState(false)
  const [salvando, setSalvando]   = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  useEffect(() => {
    fetch(`/api/noticias/${id}`)
      .then(r => r.json())
      .then(n => {
        setTitulo(n.titulo)
        setResumo(n.resumo ?? '')
        setConteudo(n.conteudo)
        setCategoria(n.categoria)
        setPublicada(n.publicada)
        setFixada(n.fixada)
        setCarregando(false)
      })
  }, [id])

  async function salvar() {
    if (!titulo.trim() || !conteudo.trim()) { setErro('Título e conteúdo são obrigatórios.'); return }
    setSalvando(true)
    setErro('')
    const res = await fetch(`/api/noticias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, resumo, conteudo, categoria, publicada, fixada }),
    })
    if (res.ok) {
      router.push('/noticias')
    } else {
      setErro('Erro ao salvar')
      setSalvando(false)
    }
  }

  if (carregando) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/noticias" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar Notícia</h1>
          <p className="text-sm text-gray-500">Atualize o comunicado</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Título</label>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Resumo <span className="text-gray-400 normal-case font-normal">(opcional)</span>
          </label>
          <input type="text" value={resumo} onChange={e => setResumo(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Categoria</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button key={cat} type="button" onClick={() => setCategoria(cat)}
                className={cn('px-3.5 py-1.5 rounded-full text-xs font-semibold border transition',
                  categoria === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600')}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Conteúdo <span className="text-gray-400 normal-case font-normal">(Markdown)</span>
            </label>
            <button type="button" onClick={() => setPreview(p => !p)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition">
              {preview ? <><EyeOff className="w-3.5 h-3.5" /> Editor</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
            </button>
          </div>
          {preview ? (
            <div className="min-h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              {conteudo ? renderMarkdown(conteudo) : <p className="text-gray-400 text-sm">Nada para pré-visualizar.</p>}
            </div>
          ) : (
            <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} rows={12}
              className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-y" />
          )}
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={publicada} onChange={e => setPublicada(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700 font-medium">Publicada</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={fixada} onChange={e => setFixada(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700 font-medium">Fixar no topo</span>
          </label>
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Alterações
          </button>
          <Link href="/noticias"
            className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  )
}