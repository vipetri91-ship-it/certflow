'use client'

import { useState } from 'react'
import { X, Save, Trash2, Loader2, AlertTriangle } from 'lucide-react'

type AGRType = 'vinicius' | 'ana' | 'arlen'
type TipoType = 'presencial' | 'videoconferencia' | 'bonificado' | 'pessoal' | 'pre-agendado'

const CORES_CSS: Record<string, string> = {
  'vinicius-presencial':       'bg-green-700',
  'vinicius-videoconferencia': 'bg-green-400',
  'arlen-presencial':          'bg-blue-800',
  'arlen-videoconferencia':    'bg-blue-400',
  'ana-presencial':            'bg-purple-700',
  'ana-videoconferencia':      'bg-purple-400',
  'bonificado':                'bg-orange-500',
  'pessoal':                   'bg-red-500',
  'pre-agendado':              'bg-gray-400',
}

// Inferir AGR + tipo a partir do colorId do Google Calendar
const COLOR_MAP: Record<string, { agr: AGRType; tipo: TipoType }> = {
  '10': { agr: 'vinicius', tipo: 'presencial' },
  '2':  { agr: 'vinicius', tipo: 'videoconferencia' },
  '9':  { agr: 'arlen',    tipo: 'presencial' },
  '7':  { agr: 'arlen',    tipo: 'videoconferencia' },
  '3':  { agr: 'ana',      tipo: 'presencial' },
  '1':  { agr: 'ana',      tipo: 'videoconferencia' },
}

function colorToTipo(colorId: string): TipoType {
  if (colorId === '6') return 'bonificado'
  if (colorId === '11') return 'pessoal'
  if (colorId === '8') return 'pre-agendado'
  return COLOR_MAP[colorId]?.tipo ?? 'videoconferencia'
}
function colorToAgr(colorId: string): AGRType {
  return COLOR_MAP[colorId]?.agr ?? 'vinicius'
}

export interface EventoCalendario {
  id: string
  titulo: string
  descricao: string
  localizacao: string
  inicio: string
  fim: string
  colorId: string
  calendarId: string
}

interface Props {
  evento: EventoCalendario
  onFechar: () => void
  onSalvo: () => void
}

function toDateTimeLocal(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
}
function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...props}>{children}</select>
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>
}

export function EditorEvento({ evento, onFechar, onSalvo }: Props) {
  const [titulo, setTitulo] = useState(evento.titulo)
  const [descricao, setDescricao] = useState(evento.descricao)
  const [localizacao, setLocalizacao] = useState(evento.localizacao)
  const [agr, setAgr] = useState<AGRType>(colorToAgr(evento.colorId))
  const [tipo, setTipo] = useState<TipoType>(colorToTipo(evento.colorId))
  const [inicio, setInicio] = useState(toDateTimeLocal(evento.inicio))
  const [fim, setFim] = useState(toDateTimeLocal(evento.fim))
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState(false)
  const [confirmarDelete, setConfirmarDelete] = useState(false)
  const [erro, setErro] = useState('')

  const tipoEspecial = tipo === 'bonificado' || tipo === 'pessoal' || tipo === 'pre-agendado'
  const chavePreview = tipoEspecial ? tipo : `${agr}-${tipo}`
  const corPreview = CORES_CSS[chavePreview] ?? 'bg-blue-600'

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch(`/api/agenda/eventos/${evento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo, descricao, localizacao, agr, tipo,
          inicio: inicio ? new Date(inicio).toISOString() : undefined,
          fim: fim ? new Date(fim).toISOString() : undefined,
          calendarId: evento.calendarId,
        }),
      })
      const data = await res.json()
      if (res.ok) { onSalvo() }
      else { setErro(data.erro ?? 'Erro ao salvar') }
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  async function deletar() {
    setDeletando(true)
    setErro('')
    try {
      const res = await fetch(`/api/agenda/eventos/${evento.id}?calendarId=${encodeURIComponent(evento.calendarId)}`, {
        method: 'DELETE',
      })
      if (res.ok) { onSalvo() }
      else { const d = await res.json(); setErro(d.erro ?? 'Erro ao excluir') }
    } catch { setErro('Erro de conexão') }
    finally { setDeletando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className={`${corPreview} rounded-t-2xl p-5 text-white`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs font-medium mb-1">Editar Evento</p>
              <p className="font-bold truncate">{titulo || '(sem título)'}</p>
              <p className="text-white/70 text-xs mt-0.5">
                {inicio ? new Date(inicio).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
            <button onClick={onFechar} className="p-1.5 rounded-full hover:bg-white/20 transition shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={salvar} className="p-5 space-y-4">
          <Campo label="Título / Nome do cliente">
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} required />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="AGR (responsável)">
              <Sel value={tipo === 'bonificado' || tipo === 'pessoal' || tipo === 'pre-agendado' ? '' : agr}
                onChange={e => { if (e.target.value) { setAgr(e.target.value as AGRType); if (tipoEspecial) setTipo('videoconferencia') } }}
                disabled={tipoEspecial}>
                <option value="vinicius">Vinicius</option>
                <option value="ana">Ana Karolina</option>
                <option value="arlen">Arlen</option>
              </Sel>
            </Campo>
            <Campo label="Tipo de atendimento">
              <Sel value={tipo} onChange={e => setTipo(e.target.value as TipoType)}>
                <option value="presencial">Presencial</option>
                <option value="videoconferencia">Videoconferência</option>
                <option value="bonificado">Bonificado (laranja)</option>
                <option value="pre-agendado">Pré-agendado (cinza)</option>
                <option value="pessoal">Pessoal/Reunião (vermelho)</option>
              </Sel>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Início">
              <Input type="datetime-local" value={inicio} onChange={e => setInicio(e.target.value)} />
            </Campo>
            <Campo label="Fim">
              <Input type="datetime-local" value={fim} onChange={e => setFim(e.target.value)} />
            </Campo>
          </div>

          {(tipo === 'presencial' || localizacao) && (
            <Campo label="Local / endereço">
              <Input value={localizacao} onChange={e => setLocalizacao(e.target.value)} placeholder="Rua, número..." />
            </Campo>
          )}

          <Campo label="Observações / descrição">
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Informações adicionais, CPF/CNPJ, imprevisto, substituição de AGR..." />
          </Campo>

          {/* Preview da cor */}
          <div className={`${corPreview} text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-white/70 shrink-0" />
            Cor: {tipoEspecial ? tipo : `${agr} · ${tipo}`}
          </div>

          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {/* Deletar */}
            {!confirmarDelete ? (
              <button type="button" onClick={() => setConfirmarDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 font-medium">Confirmar?</span>
                <button type="button" onClick={deletar} disabled={deletando}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition">
                  {deletando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sim, excluir'}
                </button>
                <button type="button" onClick={() => setConfirmarDelete(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
                  Não
                </button>
              </div>
            )}

            <div className="flex-1" />

            <button type="button" onClick={onFechar}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
