'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { EventClickArg, EventMountArg } from '@fullcalendar/core'
import { Loader2, RefreshCw, X, Save, Paperclip, Link2, Upload, AlertCircle } from 'lucide-react'
import './calendario-interativo.css'

// Cores exatas da API do Google Calendar (colorId → hex)
const GOOGLE_COLORS: Record<string, string> = {
  '1':  '#7986CB',
  '2':  '#33B679',
  '3':  '#8E24AA',
  '4':  '#E67C73',
  '5':  '#F6BF26',
  '6':  '#F4511E',
  '7':  '#039BE5',
  '8':  '#616161',
  '9':  '#3F51B5',
  '10': '#0B8043',
  '11': '#D50000',
}

// Normaliza qualquer cor hex para a cor padrão do Google Calendar mais próxima
// Resolve o problema de calendários com cores custom que diferem das event colors
function normalizeGoogleColor(hex: string): string {
  if (!hex || hex.length < 7) return '#7986CB'
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    let minDist = Infinity
    let nearest = '#7986CB'
    for (const color of Object.values(GOOGLE_COLORS)) {
      const cr = parseInt(color.slice(1, 3), 16)
      const cg = parseInt(color.slice(3, 5), 16)
      const cb = parseInt(color.slice(5, 7), 16)
      const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
      if (dist < minDist) { minDist = dist; nearest = color }
    }
    return nearest
  } catch { return '#7986CB' }
}

const COR_MAP: Record<string, { label: string; agr?: string; tipo?: string }> = {
  '10': { label: 'Vinicius Presencial',  agr: 'vinicius', tipo: 'presencial' },
  '2':  { label: 'Vinicius Vídeo',       agr: 'vinicius', tipo: 'videoconferencia' },
  '5':  { label: 'Vinicius Externo',     agr: 'vinicius', tipo: 'presencial' },
  '9':  { label: 'Arlen Presencial',     agr: 'arlen',    tipo: 'presencial' },
  '7':  { label: 'Arlen Vídeo',          agr: 'arlen',    tipo: 'videoconferencia' },
  '4':  { label: 'Arlen Externo',        agr: 'arlen',    tipo: 'presencial' },
  '3':  { label: 'Ana Presencial',       agr: 'ana',      tipo: 'presencial' },
  '1':  { label: 'Ana Vídeo',            agr: 'ana',      tipo: 'videoconferencia' },
  '6':  { label: 'Bonificado' },
  '11': { label: 'Pessoal/Reunião' },
  '8':  { label: 'Pré-agendado' },
}

const OPCOES_COR = [
  { colorId: '10', label: 'Vinicius Presencial', bg: '#0B8043' },
  { colorId: '2',  label: 'Vinicius Vídeo',      bg: '#33B679' },
  { colorId: '5',  label: 'Vinicius Externo',    bg: '#F6BF26' },
  { colorId: '9',  label: 'Arlen Presencial',    bg: '#3F51B5' },
  { colorId: '7',  label: 'Arlen Vídeo',         bg: '#039BE5' },
  { colorId: '4',  label: 'Arlen Externo',       bg: '#E67C73' },
  { colorId: '3',  label: 'Ana Presencial',      bg: '#8E24AA' },
  { colorId: '1',  label: 'Ana Vídeo',           bg: '#7986CB' },
  { colorId: '6',  label: 'Bonificado',          bg: '#F4511E' },
  { colorId: '11', label: 'Pessoal/Reunião',     bg: '#D50000' },
  { colorId: '8',  label: 'Pré-agendado',        bg: '#616161' },
]

interface Evento {
  id: string; titulo: string; descricao: string; localizacao: string
  inicio: string; fim: string; colorId: string; calendarId: string; cor?: string
}

interface ContextMenu { x: number; y: number; evento: Evento }

function toLocal(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

// Converte HTML do Google Calendar para texto legível
function htmlParaTexto(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Converte texto de volta para HTML do Google Calendar
function textoParaHtml(texto: string): string {
  if (!texto) return ''
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

// ─── Editor inline de evento ─────────────────────────────────────────────────
function EditorInline({ evento, onFechar, onSalvo }: { evento: Evento; onFechar: () => void; onSalvo: (e: Evento) => void }) {
  const [titulo, setTitulo] = useState(evento.titulo)
  const [descricao, setDescricao] = useState(htmlParaTexto(evento.descricao))
  const [localizacao, setLocalizacao] = useState(evento.localizacao)
  const [fazendoUpload, setFazendoUpload] = useState(false)
  const [erroUpload, setErroUpload] = useState('')
  const [arquivosAnexados, setArquivosAnexados] = useState<{ nome: string; url: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [inicio, setInicio] = useState(toLocal(evento.inicio))
  const [fim, setFim] = useState(toLocal(evento.fim))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const corBg = evento.colorId ? (GOOGLE_COLORS[evento.colorId] ?? '#3b82f6') : (evento.cor ?? '#3b82f6')

  async function uploadArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFazendoUpload(true)
    setErroUpload('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        const novoArquivo = { nome: file.name, url: data.url }
        setArquivosAnexados(prev => [...prev, novoArquivo])
        // Adiciona link nas observações
        setDescricao(prev => (prev ? prev + '\n' : '') + `📎 ${file.name}: ${data.url}`)
      } else {
        setErroUpload(data.erro ?? 'Erro ao fazer upload')
      }
    } catch { setErroUpload('Erro de conexão') }
    finally { setFazendoUpload(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch(`/api/agenda/eventos/${evento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descricao: textoParaHtml(descricao), // converte texto → HTML ao salvar
          localizacao,
          inicio: inicio ? new Date(inicio).toISOString() : undefined,
          fim: fim ? new Date(fim).toISOString() : undefined,
          calendarId: evento.calendarId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onSalvo({ ...evento, titulo, descricao, localizacao, inicio: inicio ? new Date(inicio).toISOString() : evento.inicio, fim: fim ? new Date(fim).toISOString() : evento.fim })
      } else {
        setErro(data.erro ?? 'Erro ao salvar')
      }
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 text-white flex items-center justify-between" style={{ backgroundColor: corBg }}>
          <div>
            <p className="text-xs text-white/70 font-medium">Editar Evento</p>
            <p className="font-bold truncate max-w-xs">{titulo || '(sem título)'}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-full hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={salvar} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Início</label>
              <input type="datetime-local" value={inicio} onChange={e => setInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fim</label>
              <input type="datetime-local" value={fim} onChange={e => setFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Local</label>
            <input value={localizacao} onChange={e => setLocalizacao(e.target.value)} placeholder="Endereço ou link..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações / Notas</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4}
              placeholder="CPF, CNPJ, protocolo, informações adicionais..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Upload de documentos */}
          <div className="border border-dashed border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" /> Documentos do cliente
            </p>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" onChange={uploadArquivo} accept="image/*,.pdf,.doc,.docx" className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={fazendoUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                {fazendoUpload ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {fazendoUpload ? 'Enviando...' : 'Enviar arquivo'}
              </button>
            </div>
            {erroUpload && <p className="text-xs text-red-600">{erroUpload}</p>}
            {arquivosAnexados.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-blue-600">
                <Link2 className="w-3 h-3" />
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{a.nome}</a>
              </div>
            ))}
          </div>

          {erro && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onFechar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              style={{ backgroundColor: corBg }}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Calendário principal ─────────────────────────────────────────────────────
export function CalendarioInterativo() {
  const calRef = useRef<FullCalendar>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const carregarEventos = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const hoje = new Date()
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString()
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0).toISOString()
      const res = await fetch(`/api/agenda/eventos?inicio=${inicio}&fim=${fim}`)
      const data = await res.json()
      if (res.ok) setEventos(data.eventos ?? [])
      else setErro(data.erro ?? 'Erro ao carregar eventos')
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregarEventos() }, [carregarEventos])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function trocarCor(evento: Evento, colorId: string) {
    setSalvando(true)
    setContextMenu(null)
    try {
      const cor = COR_MAP[colorId]
      await fetch(`/api/agenda/eventos/${evento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agr: cor?.agr, tipo: cor?.tipo, calendarId: evento.calendarId }),
      })
      setEventos(prev => prev.map(e => e.id === evento.id ? { ...e, colorId } : e))
    } catch { }
    finally { setSalvando(false) }
  }

  const fullCalendarEvents = eventos.map(e => {
    // Eventos com colorId próprio → cor padrão Google
    // Eventos sem colorId → usa a cor já mapeada pelo nome do calendário na API
    const bg = e.colorId
      ? (GOOGLE_COLORS[e.colorId] ?? e.cor ?? '#7986CB')
      : (e.cor ?? '#7986CB')
    return {
      id: e.id,
      title: e.titulo,
      start: e.inicio,
      end: e.fim,
      backgroundColor: bg,
      borderColor: bg,
      extendedProps: { evento: e },
    }
  })

  // Clique esquerdo → abre editor
  function handleEventClick(info: EventClickArg) {
    if (info.jsEvent.button !== 0) return // ignora clique direito
    info.jsEvent.preventDefault()
    setEventoEditando(info.event.extendedProps.evento as Evento)
    setContextMenu(null)
  }

  // Clique direito → menu de cores
  function handleEventDidMount(info: EventMountArg) {
    const evento = info.event.extendedProps.evento as Evento
    info.el.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setEventoEditando(null)
      setContextMenu({ x: e.clientX, y: e.clientY, evento })
    })
  }

  return (
    <div className="relative h-full flex flex-col bg-white">

      {/* Legenda + ações */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-100 shrink-0 bg-gray-50/60">
        <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
          {OPCOES_COR.map(o => (
            <div key={o.colorId} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.bg }} />
              <span className="text-[11px] text-gray-500 whitespace-nowrap">{o.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="hidden md:block text-[11px] text-gray-400">
            <span className="font-medium text-gray-500">Clique</span> para editar &nbsp;·&nbsp;
            <span className="font-medium text-gray-500">Clique direito</span> para trocar AGR
          </p>
          <button onClick={carregarEventos} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Erro com botão de reconexão */}
      {erro && (
        <div className="flex items-center justify-between gap-3 mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl shrink-0">
          <div className="flex items-center gap-2 text-red-700 text-sm min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Token expirado ou Google não conectado</span>
          </div>
          <a href="/api/google"
            className="shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition">
            Reconectar
          </a>
        </div>
      )}

      {/* Calendário */}
      <div className="flex-1 overflow-hidden px-1 pb-1">
        {carregando ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        ) : (
          <FullCalendar
            ref={calRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptBrLocale}
            events={fullCalendarEvents}
            eventClick={handleEventClick}
            eventDidMount={handleEventDidMount}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            firstDay={1}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator
            expandRows
            height="100%"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          />
        )}
      </div>

      {/* Menu de contexto (botão direito) */}
      {contextMenu && (
        <div ref={menuRef}
          className="fixed z-[200] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 w-52"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 420) }}>
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 mb-1">
            Trocar AGR / Cor
          </p>
          <p className="px-3 pb-1.5 text-xs text-gray-700 font-medium truncate border-b border-gray-50 mb-1">
            {contextMenu.evento.titulo}
          </p>
          {OPCOES_COR.map(opcao => (
            <button key={opcao.colorId}
              onClick={() => trocarCor(contextMenu.evento, opcao.colorId)}
              disabled={salvando || contextMenu.evento.colorId === opcao.colorId}
              className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-gray-50 transition disabled:opacity-40 ${contextMenu.evento.colorId === opcao.colorId ? 'bg-gray-50 font-semibold' : ''}`}>
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: opcao.bg }} />
              <span className="text-gray-700">{opcao.label}</span>
              {contextMenu.evento.colorId === opcao.colorId && <span className="ml-auto text-xs text-gray-400">atual</span>}
            </button>
          ))}
        </div>
      )}

      {/* Overlay de salvando */}
      {salvando && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 text-sm text-gray-700">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            Atualizando na agenda...
          </div>
        </div>
      )}

      {/* Editor de evento (clique esquerdo) */}
      {eventoEditando && (
        <EditorInline
          evento={eventoEditando}
          onFechar={() => setEventoEditando(null)}
          onSalvo={eventoAtualizado => {
            setEventos(prev => prev.map(e => e.id === eventoAtualizado.id ? eventoAtualizado : e))
            setEventoEditando(null)
          }}
        />
      )}
    </div>
  )
}
