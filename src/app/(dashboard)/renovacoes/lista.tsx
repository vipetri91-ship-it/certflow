'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, Mail, RefreshCw, MessageSquare } from 'lucide-react'
import { DetalheRenovacao } from './detalhe'

interface Cert {
  id: string
  dataVencimento: string
  diasRestantes: number
  modelo: { nome: string; tipoPessoa: string; tipoCertificado: string }
  pedido?: { agr: string | null; numero: string } | null
  cliente: {
    id: string; nome: string; email: string | null; celular: string | null
    telefone: string | null; cpf: string | null; cnpj: string | null
    razaoSocial: string | null; responsavel: string | null; tipoPessoa: string; grupo?: string | null
    parceiro?: { nome: string; razaoSocial: string | null; celular: string | null; telefone: string | null } | null
  }
}

interface Props {
  mes: number; ano: number; mesNome: string; faixaInicial: string
  vencidos: Cert[]; em7: Cert[]; em15: Cert[]; em30: Cert[]; resto: Cert[]
}

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}
function fmtDoc(c: Cert['cliente']) {
  if (c.cnpj) return c.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (c.cpf)  return c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return '—'
}
function fmtTel(t?: string | null) {
  if (!t) return ''
  const n = t.replace(/\D/g,'')
  return n.length === 11 ? n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

function corFaixa(dias: number) {
  if (dias < 0)   return { dot: 'bg-red-500',    row: 'hover:bg-red-50',    badge: 'bg-red-100 text-red-700',    label: 'Vencido' }
  if (dias <= 7)  return { dot: 'bg-orange-500', row: 'hover:bg-orange-50', badge: 'bg-orange-100 text-orange-700', label: '7 dias' }
  if (dias <= 15) return { dot: 'bg-yellow-500', row: 'hover:bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', label: '15 dias' }
  if (dias <= 30) return { dot: 'bg-green-500',  row: 'hover:bg-green-50',  badge: 'bg-green-100 text-green-700',  label: '30 dias' }
  return              { dot: 'bg-blue-400',   row: 'hover:bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   label: 'No mês' }
}

function LinhaTabela({ cert, onAbrirDetalhe }: { cert: Cert; onAbrirDetalhe: () => void }) {
  const c = corFaixa(cert.diasRestantes)
  const telefone = (cert.cliente.celular || cert.cliente.telefone || '').replace(/\D/g,'')
  const msgWA = encodeURIComponent(
    `Olá, ${cert.cliente.nome.split(' ')[0]}! Identificamos que seu certificado ${cert.modelo.nome} ` +
    (cert.diasRestantes < 0 ? `VENCEU em ${fmtData(cert.dataVencimento)}.` : `vence em ${cert.diasRestantes} dias (${fmtData(cert.dataVencimento)}).`) +
    ` Entre em contato para agendar a renovação! V&G Certificação Digital`
  )

  return (
    <tr className={`group ${c.row} transition cursor-pointer`} onClick={onAbrirDetalhe}>
      {/* Bolinha colorida */}
      <td className="px-3 py-3 w-8">
        <div className={`w-3 h-3 rounded-full ${c.dot} ring-2 ring-offset-1 ring-current ring-opacity-30`} />
      </td>

      {/* Vencimento */}
      <td className="px-3 py-3 whitespace-nowrap">
        <p className="text-sm font-bold text-gray-800">{fmtData(cert.dataVencimento)}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.badge}`}>
          {cert.diasRestantes < 0 ? `${Math.abs(cert.diasRestantes)}d vencido` : `${cert.diasRestantes}d`}
        </span>
      </td>

      {/* Cliente */}
      <td className="px-3 py-3 max-w-[200px]">
        <p className="text-sm font-semibold text-gray-900 truncate">{cert.cliente.nome}</p>
        <p className="text-xs font-mono text-gray-400">{fmtDoc(cert.cliente)}</p>
        {cert.cliente.parceiro && (
          <p className="text-xs text-blue-600 truncate">{cert.cliente.parceiro.razaoSocial ?? cert.cliente.parceiro.nome}</p>
        )}
      </td>

      {/* Contato */}
      <td className="px-3 py-3 hidden md:table-cell">
        <div className="space-y-0.5" onClick={e => e.stopPropagation()}>
          {cert.cliente.celular && (
            <div className="flex items-center gap-1.5">
              <a href={`https://wa.me/55${telefone}?text=${msgWA}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-600 hover:underline" title="WhatsApp">
                <MessageSquare className="w-3 h-3 shrink-0" /> {fmtTel(cert.cliente.celular)}
              </a>
            </div>
          )}
          {cert.cliente.email && (
            <a href={`mailto:${cert.cliente.email}`} className="flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-[160px]">
              <Mail className="w-3 h-3 shrink-0" /> {cert.cliente.email}
            </a>
          )}
        </div>
      </td>

      {/* Certificado */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <p className="text-xs text-gray-700">{cert.modelo.nome}</p>
        <p className="text-xs text-gray-400">{cert.modelo.tipoCertificado} · {cert.modelo.tipoPessoa}</p>
      </td>

      {/* Grupo */}
      <td className="px-3 py-3 hidden lg:table-cell">
        {cert.cliente.grupo
          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{cert.cliente.grupo}</span>
          : <span className="text-gray-300 text-xs">—</span>}
      </td>

      {/* Parceiro */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <span className="text-xs text-gray-600">{cert.cliente.parceiro?.razaoSocial ?? cert.cliente.parceiro?.nome ?? '—'}</span>
      </td>

      {/* AGR */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <span className="text-xs text-gray-600 capitalize">{cert.pedido?.agr ?? '—'}</span>
      </td>

      {/* Ações rápidas */}
      <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
        <Link href={`/pedidos/nova-venda?clienteId=${cert.cliente.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition opacity-0 group-hover:opacity-100">
          <RefreshCw className="w-3 h-3" /> Renovar
        </Link>
      </td>
    </tr>
  )
}

export function RenovacoesLista({ mes, ano, mesNome, vencidos, em7, em15, em30, resto, faixaInicial }: Props) {
  const [faixa, setFaixa] = useState(faixaInicial)
  const [certSelecionado, setCertSelecionado] = useState<Cert | null>(null)

  const prevMes = mes === 0 ? 11 : mes - 1
  const prevAno = mes === 0 ? ano - 1 : ano
  const nextMes = mes === 11 ? 0 : mes + 1
  const nextAno = mes === 11 ? ano + 1 : ano

  const todos = [...vencidos, ...em7, ...em15, ...em30, ...resto]
  const listagem = faixa === 'vencidos' ? vencidos
    : faixa === '7'   ? em7
    : faixa === '15'  ? em15
    : faixa === '30'  ? em30
    : faixa === 'mes' ? resto
    : todos

  const FILTROS = [
    { val: 'todas',   label: `Todos (${todos.length})`,           cor: 'border-gray-300 text-gray-700' },
    { val: 'vencidos',label: `🔴 Vencidos (${vencidos.length})`,  cor: 'border-red-300 text-red-700' },
    { val: '7',       label: `🟠 7 dias (${em7.length})`,         cor: 'border-orange-300 text-orange-700' },
    { val: '15',      label: `🟡 15 dias (${em15.length})`,       cor: 'border-yellow-300 text-yellow-700' },
    { val: '30',      label: `🟢 30 dias (${em30.length})`,       cor: 'border-green-300 text-green-700' },
    { val: 'mes',     label: `🔵 Resto do mês (${resto.length})`, cor: 'border-blue-300 text-blue-700' },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-4">

      {/* Navegação de mês + cards de resumo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href={`/renovacoes?mes=${prevMes}&ano=${prevAno}`}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm">←</Link>
            <span className="text-base font-bold text-gray-800 min-w-[140px] text-center">{mesNome} {ano}</span>
            <Link href={`/renovacoes?mes=${nextMes}&ano=${nextAno}`}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm">→</Link>
            <Link href="/renovacoes" className="text-xs text-blue-500 hover:underline ml-1">Hoje</Link>
          </div>
          <span className="text-xs text-gray-400">{todos.length} certificados no radar</span>
        </div>

        {/* Cards rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Vencidos', qtd: vencidos.length, cor: 'text-red-600 bg-red-50' },
            { label: '7 dias',   qtd: em7.length,      cor: 'text-orange-600 bg-orange-50' },
            { label: '15 dias',  qtd: em15.length,     cor: 'text-yellow-600 bg-yellow-50' },
            { label: '30 dias',  qtd: em30.length,     cor: 'text-green-700 bg-green-50' },
          ].map(c => (
            <button key={c.label} onClick={() => setFaixa(c.label === 'Vencidos' ? 'vencidos' : c.label.split(' ')[0])}
              className={`${c.cor} rounded-xl p-3 text-center hover:opacity-80 transition`}>
              <p className="text-2xl font-black">{c.qtd}</p>
              <p className="text-xs font-medium mt-0.5">{c.label}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(f => (
            <button key={f.val} onClick={() => setFaixa(f.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${f.cor} ${faixa === f.val ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-100 bg-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                <th className="px-3 py-2.5 w-8"></th>
                <th className="px-3 py-2.5 text-left">Vencimento</th>
                <th className="px-3 py-2.5 text-left">Cliente / CNPJ · CPF</th>
                <th className="px-3 py-2.5 text-left hidden md:table-cell">Contato</th>
                <th className="px-3 py-2.5 text-left hidden lg:table-cell">Certificado</th>
                <th className="px-3 py-2.5 text-left hidden lg:table-cell">Grupo</th>
                <th className="px-3 py-2.5 text-left hidden xl:table-cell">Parceiro</th>
                <th className="px-3 py-2.5 text-left hidden xl:table-cell">AGR</th>
                <th className="px-3 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listagem.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Nenhum certificado nesta faixa
                  </td>
                </tr>
              ) : listagem.map(cert => (
                <LinhaTabela key={cert.id} cert={cert} onAbrirDetalhe={() => setCertSelecionado(cert)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalhe */}
      {certSelecionado && (
        <DetalheRenovacao cert={certSelecionado} onFechar={() => setCertSelecionado(null)} />
      )}
    </div>
  )
}