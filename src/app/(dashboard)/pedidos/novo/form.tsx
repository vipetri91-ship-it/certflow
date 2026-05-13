'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Calendar, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Cliente { id: string; nome: string; tipoPessoa: string; cpf?: string; cnpj?: string }
interface Modelo {
  id: string; nome: string; tipoPessoa: string; tipoCertificado: string
  suporte: string; validadeMeses: number; preco: number; descricao?: string
}
interface Parceiro { id: string; nome: string }

interface ItemForm { modeloId: string; quantidade: number; precoUnit: number; desconto: number }

const AGR_OPTIONS = [
  { value: 'vinicius', label: 'Vinicius' },
  { value: 'ana', label: 'Ana' },
  { value: 'arlen', label: 'Arlen' },
]

const TIPO_OPTIONS = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'videoconferencia', label: 'Videoconferência' },
]

const FORMA_PAGAMENTO = ['Boleto', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência']

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function NovoPedidoForm({ clientes, modelos, parceiros }: {
  clientes: Cliente[]
  modelos: Modelo[]
  parceiros: Parceiro[]
}) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [agendarCalendar, setAgendarCalendar] = useState(false)
  const [calendarioOk, setCalendarioOk] = useState(false)

  const [form, setForm] = useState({
    clienteId: '',
    parceiroId: '',
    formaPagamento: 'Boleto',
    desconto: 0,
    observacoes: '',
    // Agendamento
    agr: 'vinicius',
    tipoAtendimento: 'presencial',
    dataAtendimento: new Date().toISOString().split('T')[0],
    horaAtendimento: '09:00',
    duracaoAtendimento: 60,
    localizacao: '',
  })

  const [itens, setItens] = useState<ItemForm[]>([
    { modeloId: '', quantidade: 1, precoUnit: 0, desconto: 0 }
  ])

  function setField(f: string, v: string | number) {
    setForm(prev => ({ ...prev, [f]: v }))
  }

  function adicionarItem() {
    setItens(prev => [...prev, { modeloId: '', quantidade: 1, precoUnit: 0, desconto: 0 }])
  }

  function removerItem(i: number) {
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }

  function setItem(i: number, field: keyof ItemForm, value: string | number) {
    setItens(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [field]: value }
      if (field === 'modeloId') {
        const modelo = modelos.find(m => m.id === value)
        if (modelo) updated.precoUnit = modelo.preco
      }
      return updated
    }))
  }

  const subtotal = itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnit) - item.desconto, 0)
  const valorFinal = subtotal - Number(form.desconto)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (itens.some(i => !i.modeloId)) { setErro('Selecione o modelo em todos os itens'); return }
    setSalvando(true)
    setErro('')

    try {
      // 1. Criar pedido
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: form.clienteId,
          parceiroId: form.parceiroId || undefined,
          formaPagamento: form.formaPagamento,
          desconto: Number(form.desconto),
          observacoes: form.observacoes || undefined,
          itens: itens.map(i => ({
            modeloId: i.modeloId,
            quantidade: i.quantidade,
            precoUnit: i.precoUnit,
            desconto: i.desconto,
          })),
        }),
      })

      const pedido = await res.json()
      if (!res.ok) { setErro(pedido.erro ?? 'Erro ao criar pedido'); return }

      // 2. Agendar no Google Calendar se solicitado
      if (agendarCalendar) {
        const cliente = clientes.find(c => c.id === form.clienteId)
        const modelosNomes = itens.map(i => modelos.find(m => m.id === i.modeloId)?.nome ?? '').filter(Boolean).join(', ')
        const inicio = new Date(`${form.dataAtendimento}T${form.horaAtendimento}:00`)

        const calRes = await fetch('/api/agenda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: `${cliente?.nome} — ${modelosNomes}`,
            descricao: `Pedido: ${pedido.numero}\nCertificado: ${modelosNomes}${form.observacoes ? '\n' + form.observacoes : ''}`,
            inicio: inicio.toISOString(),
            duracao: form.duracaoAtendimento,
            agr: form.agr,
            tipo: form.tipoAtendimento,
            localizacao: form.localizacao || undefined,
            pedidoId: pedido.id,
          }),
        })
        const calData = await calRes.json()
        if (calData.ok) setCalendarioOk(true)
      }

      router.push(`/pedidos`)
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const clienteSelecionado = clientes.find(c => c.id === form.clienteId)

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      <form onSubmit={salvar} className="space-y-5">

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <select
                value={form.clienteId}
                onChange={e => setField('clienteId', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.tipoPessoa === 'PF' && c.cpf ? `— CPF: ${c.cpf}` : c.cnpj ? `— CNPJ: ${c.cnpj}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Parceiro indicador</label>
              <select
                value={form.parceiroId}
                onChange={e => setField('parceiroId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Nenhum parceiro</option>
                {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          {clienteSelecionado && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <strong>{clienteSelecionado.nome}</strong> · {clienteSelecionado.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              {clienteSelecionado.cpf && ` · CPF: ${clienteSelecionado.cpf}`}
              {clienteSelecionado.cnpj && ` · CNPJ: ${clienteSelecionado.cnpj}`}
            </div>
          )}
        </div>

        {/* Itens do pedido */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Certificados</h3>
            <button type="button" onClick={adicionarItem} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Adicionar item
            </button>
          </div>

          <div className="space-y-3">
            {itens.map((item, i) => {
              const modelo = modelos.find(m => m.id === item.modeloId)
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Modelo *</label>
                    <select
                      value={item.modeloId}
                      onChange={e => setItem(i, 'modeloId', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {modelos.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome} — {formatarMoeda(m.preco)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Qtd</label>
                    <input
                      type="number" min={1}
                      value={item.quantidade}
                      onChange={e => setItem(i, 'quantidade', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Preço unit.</label>
                    <input
                      type="number" step="0.01" min={0}
                      value={item.precoUnit}
                      onChange={e => setItem(i, 'precoUnit', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Desconto</label>
                    <input
                      type="number" step="0.01" min={0}
                      value={item.desconto}
                      onChange={e => setItem(i, 'desconto', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removerItem(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {modelo && (
                    <div className="col-span-12 text-xs text-gray-400">
                      {modelo.tipoCertificado} · {modelo.suporte} · {modelo.validadeMeses} meses · Subtotal: {formatarMoeda(item.quantidade * item.precoUnit - item.desconto)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Totais */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatarMoeda(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Desconto geral</span>
              <input
                type="number" step="0.01" min={0}
                value={form.desconto}
                onChange={e => setField('desconto', Number(e.target.value))}
                className="w-28 px-3 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between text-base font-bold pt-1">
              <span>Total</span>
              <span className="text-blue-700">{formatarMoeda(valorFinal)}</span>
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pagamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pagamento</label>
              <select
                value={form.formaPagamento}
                onChange={e => setField('formaPagamento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FORMA_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <input
                value={form.observacoes}
                onChange={e => setField('observacoes', e.target.value)}
                placeholder="Observações do pedido..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Agendamento Google Calendar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="agendar"
              checked={agendarCalendar}
              onChange={e => setAgendarCalendar(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="agendar" className="flex items-center gap-2 font-semibold text-gray-900 cursor-pointer">
              <Calendar className="w-4 h-4 text-blue-600" />
              Agendar na Google Agenda
            </label>
          </div>

          {agendarCalendar && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">AGR</label>
                  <select value={form.agr} onChange={e => setField('agr', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {AGR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipoAtendimento} onChange={e => setField('tipoAtendimento', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                  <input type="date" value={form.dataAtendimento} onChange={e => setField('dataAtendimento', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Horário</label>
                  <input type="time" value={form.horaAtendimento} onChange={e => setField('horaAtendimento', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duração</label>
                  <select value={form.duracaoAtendimento} onChange={e => setField('duracaoAtendimento', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h30</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Local {form.tipoAtendimento === 'presencial' ? '(endereço)' : '(link videoconf.)'}</label>
                  <input value={form.localizacao} onChange={e => setField('localizacao', e.target.value)} placeholder={form.tipoAtendimento === 'presencial' ? 'Rua das Flores, 123' : 'meet.google.com/...'} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {calendarioOk && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> Evento criado na agenda Google!
                </div>
              )}
            </div>
          )}
        </div>

        {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

        <div className="flex items-center gap-3 pb-6">
          <Link href="/pedidos" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </Link>
          <button
            type="submit"
            disabled={salvando || !form.clienteId}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : 'Gerar Pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}