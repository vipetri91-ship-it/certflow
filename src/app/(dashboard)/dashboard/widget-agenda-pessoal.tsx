'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ClipboardList, Plus, Trash2, Check, Clock } from 'lucide-react'

interface Nota {
  id: string
  titulo: string
  data: string
  hora: string
  feita: boolean
}

function chaveStorage(userId: string) {
  return `agenda_pessoal_${userId}`
}

function notas(userId: string): Nota[] {
  try {
    return JSON.parse(localStorage.getItem(chaveStorage(userId)) ?? '[]')
  } catch { return [] }
}

function salvarNotas(userId: string, itens: Nota[]) {
  localStorage.setItem(chaveStorage(userId), JSON.stringify(itens))
}

function fmtData(data: string, hora: string) {
  if (!data) return ''
  try {
    const d = new Date(`${data}T${hora || '00:00'}`)
    const hoje = new Date()
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1)
    const isHoje = d.toDateString() === hoje.toDateString()
    const isAmanha = d.toDateString() === amanha.toDateString()
    const label = isHoje ? 'Hoje' : isAmanha ? 'Amanhã' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    return hora ? `${label} ${hora}` : label
  } catch { return '' }
}

function vencida(data: string, hora: string) {
  if (!data) return false
  try {
    const d = new Date(`${data}T${hora || '23:59'}`)
    return d < new Date()
  } catch { return false }
}

export function WidgetAgendaPessoal() {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ''

  const [itens, setItens] = useState<Nota[]>([])
  const [adicionando, setAdicionando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userId) setItens(notas(userId))
  }, [userId])

  function persistir(novos: Nota[]) {
    setItens(novos)
    if (userId) salvarNotas(userId, novos)
  }

  function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    if (editandoId) {
      // Salvar edição
      persistir(itens.map(n => n.id === editandoId ? { ...n, titulo: titulo.trim(), data, hora } : n))
      setEditandoId(null)
    } else {
      // Criar novo
      const nova: Nota = { id: Date.now().toString(), titulo: titulo.trim(), data, hora, feita: false }
      persistir([nova, ...itens])
    }
    setTitulo('')
    setData('')
    setHora('')
    setAdicionando(false)
  }

  function iniciarEdicao(n: Nota) {
    setEditandoId(n.id)
    setTitulo(n.titulo)
    setData(n.data)
    setHora(n.hora)
    setAdicionando(true)
  }

  function cancelar() {
    setAdicionando(false)
    setEditandoId(null)
    setTitulo('')
    setData('')
    setHora('')
  }

  function toggleFeita(id: string) {
    persistir(itens.map(n => n.id === id ? { ...n, feita: !n.feita } : n))
  }

  function remover(id: string) {
    persistir(itens.filter(n => n.id !== id))
  }

  useEffect(() => {
    if (adicionando) inputRef.current?.focus()
  }, [adicionando])

  const pendentes = itens.filter(n => !n.feita)
  const feitas = itens.filter(n => n.feita)

  return (
    <div className="bg-panel rounded-2xl border border-stroke shadow-[var(--shadow)] flex flex-col overflow-hidden" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-violet" />
          <p className="text-sm font-semibold text-txt-strong">Minha Agenda</p>
          {pendentes.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-v-soft text-violet rounded-full font-medium">{pendentes.length}</span>
          )}
        </div>
        <button
          onClick={() => setAdicionando(a => !a)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-v-soft text-violet text-xs font-medium hover:opacity-80 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Novo
        </button>
      </div>

      {/* Formulário de adição/edição */}
      {adicionando && (
        <form onSubmit={adicionar} className="px-4 py-2.5 border-b border-stroke bg-v-soft/50 space-y-2 shrink-0">
          {editandoId && (
            <p className="text-xs font-semibold text-violet">✏️ Editando compromisso</p>
          )}
          <input
            ref={inputRef}
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Descrição do compromisso..."
            className="w-full px-3 py-1.5 text-sm border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-2 bg-panel text-txt"
          />
          <div className="flex gap-2">
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-2 bg-panel text-txt" />
            <input type="time" value={hora} onChange={e => setHora(e.target.value)}
              className="w-24 px-2 py-1.5 text-xs border border-stroke rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-2 bg-panel text-txt" />
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 py-1.5 bg-violet text-white text-xs font-semibold rounded-lg hover:bg-violet-2 transition">
              {editandoId ? 'Salvar' : 'Adicionar'}
            </button>
            <button type="button" onClick={cancelar}
              className="px-3 py-1.5 border border-stroke text-xs text-mut rounded-lg hover:bg-panel-2 transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto divide-y divide-divider">
        {itens.length === 0 && !adicionando && (
          <p className="text-center text-xs text-mut-2 py-8 px-4">
            Nenhum compromisso.<br />Clique em "Novo" para adicionar.
          </p>
        )}

        {pendentes.map(n => (
          <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-panel-2 transition group">
            <button onClick={() => toggleFeita(n.id)}
              className="mt-0.5 w-4 h-4 shrink-0 rounded border-2 border-stroke hover:border-violet transition flex items-center justify-center">
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => iniciarEdicao(n)}>
              <p className="text-sm text-txt leading-snug hover:text-violet transition-colors">{n.titulo}</p>
              {(n.data || n.hora) && (
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${vencida(n.data, n.hora) ? 'text-red' : 'text-mut-2'}`}>
                  <Clock className="w-3 h-3" />
                  {fmtData(n.data, n.hora)}
                  {vencida(n.data, n.hora) && ' • atrasado'}
                </p>
              )}
            </div>
            <button onClick={() => remover(n.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-r-soft text-red hover:opacity-80 transition">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {feitas.length > 0 && (
          <>
            <div className="px-4 py-1.5 bg-panel-2/50">
              <span className="text-[10px] font-semibold text-mut-2 uppercase tracking-wide">Concluídos ({feitas.length})</span>
            </div>
            {feitas.map(n => (
              <div key={n.id} className="flex items-start gap-2.5 px-4 py-2 opacity-50 hover:opacity-70 transition group">
                <button onClick={() => toggleFeita(n.id)}
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border-2 border-grn bg-grn flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </button>
                <p className="flex-1 text-xs text-mut line-through">{n.titulo}</p>
                <button onClick={() => remover(n.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-r-soft text-red transition">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
