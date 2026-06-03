'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Download, Search, X } from 'lucide-react'

interface Pedido {
  id: string; numero: string; status: string
  valorFinal: number; valorTotal: number; desconto: number
  formaPagamento: string | null; tipoAtendimento: string | null
  unidadeAtendimento: string | null; agr: string | null
  createdAt: string; emitidoEm: string | null
  cliente: { id: string; nome: string; razaoSocial: string | null; tipoPessoa: string; cpf?: string | null; cnpj?: string | null }
  parceiro: { id: string; nome: string } | null
  itens: { modelo: { id: string; nome: string; tipoPessoa: string; tipoCertificado: string } }[]
}

interface Filtros {
  de: string; ate: string; modelo: string; atendimento: string
  agr: string; parceiro: string; pagamento: string; unidade: string; aba: string
}

interface Props {
  pedidos: Pedido[]
  modelos: { id: string; nome: string }[]
  parceiros: { id: string; nome: string }[]
  usuarios: { id: string; nome: string; nomeAgrDs: string | null }[]
  filtros: Filtros
}

const ABAS = [
  { id: 'resumo',    label: '📊 Resumo' },
  { id: 'modelo',    label: '📋 Por Modelo' },
  { id: 'agr',       label: '👤 Por AGR' },
  { id: 'parceiro',  label: '🤝 Por Parceiro' },
  { id: 'pagamento', label: '💳 Por Pagamento' },
  { id: 'atendimento', label: '🖥️ Por Atendimento' },
  { id: 'detalhado', label: '📄 Detalhado' },
]

const FORMAS_PAG = ['Pix', 'Boleto', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Safe2Pay']
const TIPOS_ATEND = ['videoconferencia', 'presencial', 'externo']
const UNIDADES = ['Piracaia', 'Bragança Paulista']
const AGRS = ['vinicius', 'arlen', 'ana.karolina', 'laryssa']

function fmt(v: number) { return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
function fmtData(s: string) { return new Date(s).toLocaleDateString('pt-BR') }

function agrupar<T>(arr: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>()
  for (const item of arr) {
    const k = key(item) || '—'
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, items: v }))
    .sort((a, b) => b.items.length - a.items.length)
}

function TabelaGrupo({ grupos, label }: { grupos: { key: string; items: Pedido[] }[]; label: string }) {
  const total = grupos.reduce((s, g) => s + g.items.length, 0)
  const totalFat = grupos.reduce((s, g) => s + g.items.reduce((ss, p) => ss + p.valorFinal, 0), 0)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-white/06 bg-gray-50 dark:bg-white/5">
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{label}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Vendas</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Emissões</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Faturamento</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">% do total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
          {grupos.map(g => {
            const fat = g.items.reduce((s, p) => s + p.valorFinal, 0)
            const emissoes = g.items.filter(p => p.emitidoEm).length
            return (
              <tr key={g.key} className="hover:bg-gray-50 dark:hover:bg-white/3">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{g.key}</td>
                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{g.items.length}</td>
                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{emissoes}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{fmt(fat)}</td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                  {totalFat > 0 ? `${Math.round((fat / totalFat) * 100)}%` : '0%'}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 dark:border-white/10 font-bold">
            <td className="px-4 py-3 text-gray-800 dark:text-white">Total</td>
            <td className="px-4 py-3 text-center text-gray-800 dark:text-white">{total}</td>
            <td className="px-4 py-3 text-center text-gray-800 dark:text-white">{grupos.reduce((s, g) => s + g.items.filter(p => p.emitidoEm).length, 0)}</td>
            <td className="px-4 py-3 text-right text-gray-800 dark:text-white">{fmt(totalFat)}</td>
            <td className="px-4 py-3 text-right text-gray-500">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function ProducaoDetalhada({ pedidos, modelos, parceiros, usuarios, filtros }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [aba, setAba] = useState(filtros.aba)
  const [f, setF] = useState(filtros)

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (f.de)          p.set('de', f.de)
    if (f.ate)         p.set('ate', f.ate)
    if (f.modelo)      p.set('modelo', f.modelo)
    if (f.atendimento) p.set('atendimento', f.atendimento)
    if (f.agr)         p.set('agr', f.agr)
    if (f.parceiro)    p.set('parceiro', f.parceiro)
    if (f.pagamento)   p.set('pagamento', f.pagamento)
    if (f.unidade)     p.set('unidade', f.unidade)
    p.set('aba', aba)
    router.push(`${pathname}?${p.toString()}`)
  }

  function limpar() {
    const hoje = new Date()
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
    setF({ de: ini, ate: fim, modelo: '', atendimento: '', agr: '', parceiro: '', pagamento: '', unidade: '', aba: 'resumo' })
    router.push(pathname)
  }

  function exportarCSV() {
    const linhas = [
      ['Nº Pedido', 'Data', 'Cliente', 'Tipo', 'Modelo', 'AGR', 'Atendimento', 'Pagamento', 'Parceiro', 'Status', 'Valor'],
      ...pedidos.map(p => [
        p.numero, fmtData(p.createdAt),
        p.cliente.razaoSocial || p.cliente.nome,
        p.cliente.tipoPessoa,
        p.itens[0]?.modelo.nome ?? '—',
        p.agr ?? '—', p.tipoAtendimento ?? '—',
        p.formaPagamento ?? '—',
        p.parceiro?.nome ?? '—',
        p.status, String(p.valorFinal),
      ])
    ]
    const csv = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `producao_${f.de}_${f.ate}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Agrupamentos
  const porModelo    = agrupar(pedidos, p => p.itens[0]?.modelo.nome ?? '—')
  const porAgr       = agrupar(pedidos, p => p.agr ?? 'Sem AGR')
  const porParceiro  = agrupar(pedidos, p => p.parceiro?.nome ?? 'Direto')
  const porPagamento = agrupar(pedidos, p => p.formaPagamento ?? '—')
  const porAtend     = agrupar(pedidos, p => p.tipoAtendimento ?? '—')

  const totalFat     = pedidos.reduce((s, p) => s + p.valorFinal, 0)
  const totalEmitidos = pedidos.filter(p => p.emitidoEm).length
  const ticketMedio  = pedidos.length > 0 ? totalFat / pedidos.length : 0

  const sel = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const inp = 'px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <form onSubmit={aplicar} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/08 shadow-sm p-5 space-y-4">
        {/* Período */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">De</label>
            <input type="date" value={f.de} onChange={e => setF(x => ({ ...x, de: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Até</label>
            <input type="date" value={f.ate} onChange={e => setF(x => ({ ...x, ate: e.target.value }))} className={inp} />
          </div>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={limpar}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
            <button type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
              <Search className="w-3.5 h-3.5" /> Filtrar
            </button>
            <button type="button" onClick={exportarCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-green-700 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* Filtros avançados */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Modelo</label>
            <select value={f.modelo} onChange={e => setF(x => ({ ...x, modelo: e.target.value }))} className={sel}>
              <option value="">Todos</option>
              {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Atendimento</label>
            <select value={f.atendimento} onChange={e => setF(x => ({ ...x, atendimento: e.target.value }))} className={sel}>
              <option value="">Todos</option>
              {TIPOS_ATEND.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">AGR</label>
            <select value={f.agr} onChange={e => setF(x => ({ ...x, agr: e.target.value }))} className={sel}>
              <option value="">Todos</option>
              {AGRS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Parceiro</label>
            <select value={f.parceiro} onChange={e => setF(x => ({ ...x, parceiro: e.target.value }))} className={sel}>
              <option value="">Todos</option>
              {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pagamento</label>
            <select value={f.pagamento} onChange={e => setF(x => ({ ...x, pagamento: e.target.value }))} className={sel}>
              <option value="">Todos</option>
              {FORMAS_PAG.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unidade</label>
            <select value={f.unidade} onChange={e => setF(x => ({ ...x, unidade: e.target.value }))} className={sel}>
              <option value="">Todas</option>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Vendas',   valor: pedidos.length.toString(),    cor: 'text-blue-600' },
          { label: 'Emissões',       valor: totalEmitidos.toString(),      cor: 'text-green-600' },
          { label: 'Faturamento',    valor: fmt(totalFat),                 cor: 'text-blue-600' },
          { label: 'Ticket Médio',   valor: fmt(ticketMedio),              cor: 'text-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/08 shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/08 shadow-sm overflow-hidden">
        <div className="flex gap-0 border-b border-gray-100 dark:border-white/08 overflow-x-auto">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-all ${
                aba === a.id
                  ? 'text-blue-600 dark:text-[#a78bfa] border-b-2 border-blue-600 dark:border-[#7c6fcd] bg-blue-50/50 dark:bg-white/3'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/3'
              }`}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="p-0">
          {aba === 'resumo' && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top modelos</p>
                <TabelaGrupo grupos={porModelo.slice(0, 5)} label="Modelo" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Top AGRs</p>
                <TabelaGrupo grupos={porAgr} label="AGR" />
              </div>
            </div>
          )}
          {aba === 'modelo'    && <TabelaGrupo grupos={porModelo}    label="Modelo de Certificado" />}
          {aba === 'agr'       && <TabelaGrupo grupos={porAgr}       label="AGR" />}
          {aba === 'parceiro'  && <TabelaGrupo grupos={porParceiro}  label="Parceiro Indicador" />}
          {aba === 'pagamento' && <TabelaGrupo grupos={porPagamento} label="Forma de Pagamento" />}
          {aba === 'atendimento' && <TabelaGrupo grupos={porAtend}   label="Tipo de Atendimento" />}

          {aba === 'detalhado' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/08">
                    {['Nº Pedido','Data','Cliente','Tipo','Modelo','AGR','Atendimento','Pagamento','Parceiro','Status','Valor'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {pedidos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/3">
                      <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{p.numero}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtData(p.createdAt)}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate text-gray-800 dark:text-gray-200">{p.cliente.razaoSocial || p.cliente.nome}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.cliente.tipoPessoa}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate text-gray-700 dark:text-gray-300">{p.itens[0]?.modelo.nome ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.agr ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.tipoAtendimento ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.formaPagamento ?? '—'}</td>
                      <td className="px-3 py-2 max-w-[100px] truncate text-gray-600 dark:text-gray-400">{p.parceiro?.nome ?? 'Direto'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === 'EMITIDO' ? 'bg-green-100 text-green-700' :
                          p.status === 'VERIFICADO' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">{fmt(p.valorFinal)}</td>
                    </tr>
                  ))}
                  {pedidos.length === 0 && (
                    <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Nenhum pedido encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}