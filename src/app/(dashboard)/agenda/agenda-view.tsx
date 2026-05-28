'use client'

import { useState } from 'react'
import { Calendar, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { ListaEventos } from './lista-eventos'

const AGR_CONFIG = {
  vinicius: { nome: 'Vinicius' },
  ana:      { nome: 'Ana' },
  arlen:    { nome: 'Arlen' },
}

const TIPO_CONFIG: Record<string, { label: string }> = {
  presencial:       { label: 'Presencial' },
  videoconferencia: { label: 'Videoconferência' },
  externo:          { label: 'Atendimento Externo' },
  bonificado:       { label: 'Bonificado' },
  pessoal:          { label: 'Pessoal/Reunião' },
  'pre-agendado':   { label: 'Pré-agendado' },
}

const PREVIEW_CORES: Record<string, string> = {
  'vinicius-presencial':       'bg-green-700',
  'vinicius-videoconferencia': 'bg-green-400',
  'vinicius-externo':          'bg-yellow-400',
  'arlen-presencial':          'bg-blue-800',
  'arlen-videoconferencia':    'bg-blue-400',
  'arlen-externo':             'bg-rose-300',
  'ana-presencial':            'bg-purple-700',
  'ana-videoconferencia':      'bg-purple-400',
  'bonificado':                'bg-orange-500',
  'pessoal':                   'bg-red-500',
  'pre-agendado':              'bg-gray-400',
}

type AGRType = 'vinicius' | 'ana' | 'arlen'
type TipoType = 'presencial' | 'videoconferencia' | 'externo' | 'bonificado' | 'pessoal' | 'pre-agendado'

interface EventoForm {
  titulo: string
  descricao: string
  data: string
  hora: string
  duracao: number
  agr: AGRType
  tipo: TipoType
  localizacao: string
  calendarId: string
}

interface Props {
  conectado: boolean
  calendarios: { id: string; nome: string }[]
}

export function AgendaView({ conectado, calendarios }: Props) {
  const defaultCalendarId =
    calendarios.find(c =>
      c.nome.toLowerCase().includes('v&g') ||
      c.nome.toLowerCase().includes('veg') ||
      c.nome.toLowerCase().includes('certificacao')
    )?.id ?? 'primary'

  const [form, setForm] = useState<EventoForm>({
    titulo: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    duracao: 60,
    agr: 'vinicius',
    tipo: 'presencial',
    localizacao: '',
    calendarId: defaultCalendarId,
  })
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null)

  const chavePreview =
    form.tipo === 'bonificado' || form.tipo === 'pessoal' || form.tipo === 'pre-agendado'
      ? form.tipo
      : `${form.agr}-${form.tipo}`

  const corPreview = PREVIEW_CORES[chavePreview] ?? 'bg-blue-600'

  async function criarEvento(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnviando(true)
    setResultado(null)

    try {
      const inicio = new Date(`${form.data}T${form.hora}:00`)
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          inicio: inicio.toISOString(),
          duracao: form.duracao,
          agr: form.agr,
          tipo: form.tipo,
          localizacao: form.localizacao || undefined,
          calendarId: form.calendarId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResultado({ ok: true, msg: 'Evento criado com sucesso na agenda V&G!' })
        setForm(f => ({ ...f, titulo: '', descricao: '', localizacao: '' }))
      } else {
        setResultado({ ok: false, msg: data.erro ?? 'Erro ao criar evento' })
      }
    } catch {
      setResultado({ ok: false, msg: 'Erro de conexão' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Status */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${conectado ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          <Calendar className={`w-5 h-5 shrink-0 ${conectado ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <p className={`text-sm font-medium ${conectado ? 'text-green-800' : 'text-yellow-800'}`}>
              {conectado ? 'Google Calendar conectado — V&G Certificação Digital' : 'Script Google não acessível no momento'}
            </p>
            <p className="text-xs text-gray-500">
              {conectado
                ? `${calendarios.length} agenda(s) disponível(is) · ${calendarios.find(c => c.id === defaultCalendarId)?.nome ?? 'Agenda padrão'}`
                : 'Verifique se o Apps Script está implantado corretamente'}
            </p>
          </div>
        </div>

        {/* Seletor de calendário */}
        {conectado && calendarios.length > 1 && (
          <select
            value={form.calendarId}
            onChange={e => setForm(f => ({ ...f, calendarId: e.target.value }))}
            className="px-3 py-1.5 border border-green-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {calendarios.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Formulário */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Agendar Atendimento</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cria o evento diretamente na agenda Google da equipe</p>
          </div>

          <form onSubmit={criarEvento} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do cliente / título</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                required
                placeholder="Ex: João Silva — e-CPF A3"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Responsável (AGR)</label>
                <select
                  value={form.agr}
                  onChange={e => setForm(f => ({ ...f, agr: e.target.value as AGRType }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vinicius">Vinicius</option>
                  <option value="ana">Ana</option>
                  <option value="arlen">Arlen</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoType }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="presencial">Presencial</option>
                  <option value="videoconferencia">Videoconferência</option>
                  <option value="externo">Atendimento Externo</option>
                  <option value="bonificado">Bonificado (laranja)</option>
                  <option value="pre-agendado">Pré-agendado (cinza)</option>
                  <option value="pessoal">Pessoal/Reunião (vermelho)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Horário</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duração</label>
                <select
                  value={form.duracao}
                  onChange={e => setForm(f => ({ ...f, duracao: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>

            {form.tipo === 'presencial' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Local / endereço</label>
                <input
                  type="text"
                  value={form.localizacao}
                  onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}
                  placeholder="Ex: Rua das Flores, 123 — Sala 2"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
              <textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Informações adicionais sobre o atendimento..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {resultado && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${resultado.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                {resultado.ok
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {resultado.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando || !conectado}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {enviando ? 'Criando evento...' : 'Criar na Agenda Google'}
            </button>
          </form>
        </div>

        {/* Eventos da semana — clicáveis com editor */}
        <div className="xl:col-span-1">
          <ListaEventos />
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Preview do evento</h2>
            <p className="text-xs text-gray-500 mt-0.5">Como aparecerá no Google Calendar</p>
          </div>

          <div className="p-5 space-y-5">
            <div className={`${corPreview} text-white rounded-lg p-3 shadow-sm`}>
              <p className="font-medium text-sm">{form.titulo || 'Nome do cliente'}</p>
              <p className="text-xs opacity-80 mt-0.5">
                {form.hora} · {form.duracao} min · {AGR_CONFIG[form.agr].nome} · {TIPO_CONFIG[form.tipo].label}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Legenda de cores</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {Object.entries(AGR_CONFIG).map(([agr, cfg]) => (
                  <div key={agr}>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">{cfg.nome}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-sm shrink-0 ${PREVIEW_CORES[`${agr}-presencial`]}`} />
                        <span className="text-xs text-gray-500">Presencial</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-sm shrink-0 ${PREVIEW_CORES[`${agr}-videoconferencia`]}`} />
                        <span className="text-xs text-gray-500">Videoconferência</span>
                      </div>
                      {PREVIEW_CORES[`${agr}-externo`] && (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-sm shrink-0 ${PREVIEW_CORES[`${agr}-externo`]}`} />
                          <span className="text-xs text-gray-500">Externo</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1.5">Especiais</p>
                  <div className="space-y-1">
                    {[
                      { cor: 'bg-orange-500', label: 'Bonificado' },
                      { cor: 'bg-red-500',    label: 'Pessoal/Reunião' },
                      { cor: 'bg-gray-400',   label: 'Pré-agendado' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-sm shrink-0 ${item.cor}`} />
                        <span className="text-xs text-gray-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}