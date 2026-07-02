'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import Link from 'next/link'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Building2, User,
  ChevronRight,
} from 'lucide-react'
import { mascararCPF as formatarCPF, mascararCNPJ as formatarCNPJ, mascararTelefone as formatarTel } from '@/lib/mascaras'
import { ordenarModelos } from '@/lib/modelos-grupo'

// ── tipos ─────────────────────────────────────────────────────────────────────

type Aba =
  | 'dados' | 'custo' | 'comissoes' | 'cliente'
  | 'info' | 'banco' | 'indicacoes' | 'painel'

interface Modelo {
  id: string; nome: string; preco: number; validadeMeses: number; tipoPessoa: string; ativo: boolean
}
interface Comissao {
  modeloId: string
  percentual: number | null
  valorFixo: number | null
  valorCusto: number | null
  valorCliente: number | null
}
interface ContatoP {
  id: string; nome: string; cpf?: string; cargo?: string
  dataNascimento?: string; telefone?: string; email?: string
}
interface ParceiroData {
  id: string; nome: string; tipoPessoa: 'PF' | 'PJ'
  email?: string; emailAlternativo?: string
  telefone?: string; telefone2?: string; celular?: string
  cpf?: string; cnpj?: string; razaoSocial?: string; nomeFantasia?: string
  tipo: string; nivel?: string; tipoParceria?: string; segmento?: string; renovacoes?: string
  responsavelId?: string; responsavel?: { id: string; nome: string }
  contadorResponsavel?: string; pessoaContato?: string
  informacoesEnvio?: string; observacoes?: string
  tipoComissao?: string; diaPagamento?: number
  banco?: string; agencia?: string; conta?: string; tipoConta?: string; chavePix?: string
  loginParceiro?: string; statusPainel: boolean; permissoesPainel?: Record<string, boolean>
  whatsappVencimentoAtivo: boolean; emailVencimentoAtivo: boolean
  tabelaPrecoId?: string | null
  temSenha?: boolean; ativo: boolean
  comissoes: Comissao[]
  contatosParceiro: ContatoP[]
  clientes: { id: string; nome: string; cpf?: string; cnpj?: string; tipoPessoa: string; createdAt: string }[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function moeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ── componentes base ──────────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  )
}
function Sel({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// ── abas ──────────────────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string }[] = [
  { key: 'dados',      label: 'Dados Gerais'       },
  { key: 'custo',      label: 'Valor de Custo'      },
  { key: 'comissoes',  label: 'Comissões'           },
  { key: 'cliente',    label: 'Valores p/ Cliente'  },
  { key: 'info',       label: 'Informações'         },
  { key: 'banco',      label: 'Dados Bancários'     },
  { key: 'indicacoes', label: 'Indicações'          },
  { key: 'painel',     label: 'Acesso ao Painel'    },
]

const PERMISSOES = [
  { key: 'infoIndicacoes',       label: 'Informações e Indicações' },
  { key: 'financeiroComissao',   label: 'Financeiro / Extrato de Comissão' },
  { key: 'gestao',               label: 'Gestão de Clientes' },
  { key: 'relatorioVencimentos', label: 'Relatório de Vencimentos' },
  { key: 'regulamento',          label: 'Regulamento' },
]

const NIVEIS      = ['Pequeno', 'Médio', 'Grande', 'Estratégico']
const TIPOS_PARC  = ['Comissão', 'Valor de Custo', 'Venda de Lote', 'Outro']
const SEGMENTOS   = ['Contabilidade', 'Correspondente Bancário', 'Imobiliária', 'Associação', 'Pessoa Física', 'Passarinheiro', 'Outro']
const TIPOS_CONTA = ['Corrente', 'Poupança']
const TIPOS_COM   = ['Percentual', 'Valor Fixo', 'Percentual Fixo']

// ── tabela de modelos com agrupamento PJ/PF ───────────────────────────────────

interface Coluna {
  header: string
  align?: 'left' | 'right'
  render: (m: Modelo) => React.ReactNode
}

function TabelaModelos({ modelosPJ, modelosPF, colunas }: {
  modelosPJ: Modelo[]
  modelosPF: Modelo[]
  colunas:   Coluna[]
}) {
  const grupos = [
    { label: 'E-CNPJ — Pessoa Jurídica', items: modelosPJ },
    { label: 'E-CPF — Pessoa Física',    items: modelosPF },
  ].filter(g => g.items.length > 0)

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
            {colunas.map(c => (
              <th key={c.header} className={`px-4 py-3 font-medium text-gray-600 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {grupos.map(grupo => (
            <>
              <tr key={grupo.label}>
                <td colSpan={colunas.length + 1} className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{grupo.label}</span>
                </td>
              </tr>
              {grupo.items.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{m.nome}</td>
                  {colunas.map(c => (
                    <td key={c.header} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.render(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── página principal ──────────────────────────────────────────────────────────

export default function EditarParceiroPage() {
  const params = useParams()
  const id = params.id as string

  const [aba, setAba]           = useState<Aba>('dados')
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')
  const [ok, setOk]             = useState('')
  const [salvando, setSalvando] = useState(false)

  const [parceiro,  setParceiro]  = useState<ParceiroData | null>(null)
  const [modelos,   setModelos]   = useState<Modelo[]>([])
  const [usuarios,  setUsuarios]  = useState<{ id: string; nome: string }[]>([])
  const [comMap,    setComMap]    = useState<Record<string, Comissao>>({})
  const [tabelas,   setTabelas]   = useState<{ id: string; nome: string; itens: { modeloId: string; valorCusto: number }[] }[]>([])

  // form geral
  const [f, setF] = useState<Record<string, string | boolean>>({})

  // novo contato
  const [novoContato, setNovoContato] = useState({ nome: '', cpf: '', cargo: '', dataNascimento: '', telefone: '', email: '' })
  const [adicionandoContato, setAdicionandoContato] = useState(false)

  // indicações filter
  const [filtroIni, setFiltroIni] = useState('')
  const [filtroFim, setFiltroFim] = useState('')

  // ── load ──
  const carregar = useCallback(async () => {
    try {
      const [rp, rm, ru, rt] = await Promise.all([
        fetch(`/api/parceiros/${id}`).then(r => r.json()),
        fetch('/api/configuracoes/modelos').then(r => r.json()),
        fetch('/api/usuarios').then(r => r.json()),
        fetch('/api/configuracoes/tabelas-preco').then(r => r.json()),
      ])
      const p: ParceiroData = rp
      setParceiro(p)
      setModelos(rm.modelos ?? [])
      setUsuarios(ru.usuarios ?? ru ?? [])
      setTabelas((rt.tabelas ?? []).map((t: { id: string; nome: string; itens: { modeloId: string; valorCusto: string | number }[] }) => ({
        id: t.id, nome: t.nome, itens: t.itens.map((i) => ({ modeloId: i.modeloId, valorCusto: Number(i.valorCusto) })),
      })))

      // preenche form
      setF({
        nome:               p.nome ?? '',
        email:              p.email ?? '',
        emailAlternativo:   p.emailAlternativo ?? '',
        telefone:           p.telefone ? formatarTel(p.telefone) : '',
        telefone2:          p.telefone2 ? formatarTel(p.telefone2) : '',
        celular:            p.celular ? formatarTel(p.celular) : '',
        razaoSocial:        p.razaoSocial ?? '',
        nomeFantasia:       p.nomeFantasia ?? '',
        tipo:               p.tipo ?? 'Indicador',
        nivel:              p.nivel ?? '',
        tipoParceria:       p.tipoParceria ?? '',
        segmento:           p.segmento ?? '',
        renovacoes:         p.renovacoes ?? '',
        responsavelId:      p.responsavelId ?? '',
        contadorResponsavel: p.contadorResponsavel ?? '',
        pessoaContato:      p.pessoaContato ?? '',
        observacoes:        p.observacoes ?? '',
        informacoesEnvio:   p.informacoesEnvio ?? '',
        tipoComissao:       p.tipoComissao ?? '',
        diaPagamento:       p.diaPagamento?.toString() ?? '',
        banco:              p.banco ?? '',
        agencia:            p.agencia ?? '',
        conta:              p.conta ?? '',
        tipoConta:          p.tipoConta ?? 'Corrente',
        chavePix:           p.chavePix ?? '',
        loginParceiro:      p.loginParceiro ?? '',
        senhaParceiro:      '',
        statusPainel:            p.statusPainel,
        whatsappVencimentoAtivo: p.whatsappVencimentoAtivo ?? true,
        emailVencimentoAtivo:    p.emailVencimentoAtivo    ?? true,
        tabelaPrecoId:           p.tabelaPrecoId ?? '',
        ativo:                   p.ativo,
      })

      // comissão por modelo
      const map: Record<string, Comissao> = {}
      p.comissoes.forEach(c => { map[c.modeloId] = c })
      setComMap(map)
    } catch {
      setErro('Erro ao carregar parceiro')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  function set(field: string, value: string | boolean) {
    setF(prev => ({ ...prev, [field]: value }))
  }

  function setComissao(modeloId: string, campo: keyof Comissao, valor: string) {
    setComMap(prev => ({
      ...prev,
      [modeloId]: {
        ...{ modeloId, percentual: null, valorFixo: null, valorCusto: null, valorCliente: null },
        ...(prev[modeloId] ?? {}),
        [campo]: valor === '' ? null : Number(valor),
      },
    }))
  }

  // ── salvar tudo de uma vez ────────────────────────────────────────────────
  async function salvarTudo() {
    setSalvando(true); setErro(''); setOk('')
    try {
      // Para PJ o campo "nome" não é editado diretamente; usa razaoSocial como fallback
      const nomeEffective = String(f.nome || '').trim()
      const nomeParaSalvar = nomeEffective.length >= 2
        ? nomeEffective
        : parceiro?.tipoPessoa === 'PJ' ? String(f.razaoSocial || '').trim() : ''

      const payload: Record<string, unknown> = {
        ...(nomeParaSalvar.length >= 2 ? { nome: nomeParaSalvar } : {}),
        razaoSocial:         f.razaoSocial,
        nomeFantasia:        f.nomeFantasia,
        tipo:                f.tipo,
        nivel:               f.nivel,
        tipoParceria:        f.tipoParceria,
        segmento:            f.segmento,
        renovacoes:          f.renovacoes,
        responsavelId:       f.responsavelId || '',
        contadorResponsavel: f.contadorResponsavel,
        pessoaContato:       f.pessoaContato,
        email:               f.email || '',
        emailAlternativo:    f.emailAlternativo,
        telefone:            String(f.telefone  || '').replace(/\D/g,'') || null,
        telefone2:           String(f.telefone2 || '').replace(/\D/g,'') || null,
        celular:             String(f.celular   || '').replace(/\D/g,'') || null,
        observacoes:         f.observacoes,
        informacoesEnvio:    f.informacoesEnvio,
        tipoComissao:        f.tipoComissao,
        diaPagamento:        f.diaPagamento ? Number(f.diaPagamento) : null,
        chavePix:            f.chavePix,
        banco:               f.banco,
        agencia:             f.agencia,
        conta:               f.conta,
        tipoConta:           f.tipoConta,
        loginParceiro:       f.loginParceiro,
        ...(f.senhaParceiro  ? { senhaParceiro: f.senhaParceiro } : {}),
        statusPainel:            f.statusPainel,
        permissoesPainel:        parceiro?.permissoesPainel ?? {},
        whatsappVencimentoAtivo: f.whatsappVencimentoAtivo,
        emailVencimentoAtivo:    f.emailVencimentoAtivo,
        tabelaPrecoId:           f.tabelaPrecoId || '',
        ativo:                   f.ativo,
      }

      const comissoesPayload = modelos
        .map(m => {
          const c = comMap[m.id]
          return {
            modeloId:     m.id,
            percentual:   c?.percentual   ?? null,
            valorFixo:    c?.valorFixo    ?? null,
            valorCusto:   c?.valorCusto   ?? null,
            valorCliente: c?.valorCliente ?? null,
          }
        })
        .filter(item => item.percentual !== null || item.valorFixo !== null || item.valorCusto !== null || item.valorCliente !== null)

      const [r1, r2] = await Promise.all([
        fetch(`/api/parceiros/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch(`/api/parceiros/${id}/comissoes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comissoesPayload),
        }),
      ])

      if (r1.ok && r2.ok) {
        setOk('Salvo com sucesso!')
        set('senhaParceiro', '') // limpa campo de senha após salvar
        carregar()
      } else {
        const d = !r1.ok ? await r1.json() : await r2.json()
        setErro(d.erro ?? 'Erro ao salvar')
      }
    } catch { setErro('Erro de conexão') }
    finally  { setSalvando(false) }
  }

  // ── adicionar contato ──────────────────────────────────────────────────────
  async function adicionarContato() {
    if (!novoContato.nome.trim()) return
    setAdicionandoContato(true)
    try {
      await fetch(`/api/parceiros/${id}/contatos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoContato),
      })
      setNovoContato({ nome: '', cpf: '', cargo: '', dataNascimento: '', telefone: '', email: '' })
      carregar()
    } finally { setAdicionandoContato(false) }
  }

  async function excluirContato(contId: string) {
    await fetch(`/api/parceiros/${id}/contatos/${contId}`, { method: 'DELETE' })
    carregar()
  }

  // ── permissões ────────────────────────────────────────────────────────────
  function togglePerm(key: string) {
    const atual = (parceiro?.permissoesPainel ?? {}) as Record<string, boolean>
    set('_perm_' + key, !atual[key]) // trigger UI rerender via form
    setParceiro(prev => prev ? {
      ...prev,
      permissoesPainel: { ...(prev.permissoesPainel ?? {}), [key]: !((prev.permissoesPainel ?? {})[key]) },
    } : prev)
  }

  // ── modelos ordenados PJ → PF ─────────────────────────────────────────────
  const modelosPJ = ordenarModelos(modelos.filter(m => m.tipoPessoa === 'PJ'))
  const modelosPF = ordenarModelos(modelos.filter(m => m.tipoPessoa === 'PF'))

  // ── clientes filtrados (indicações) ───────────────────────────────────────
  const clientesFiltrados = (parceiro?.clientes ?? []).filter(c => {
    const d = new Date(c.createdAt)
    if (filtroIni && d < new Date(filtroIni)) return false
    if (filtroFim && d > new Date(filtroFim + 'T23:59:59')) return false
    return true
  })

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <Header titulo="Editar Parceiro" />
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      </div>
    )
  }
  if (!parceiro) return null

  return (
    <div>
      <Header titulo={parceiro.nome} />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">

        {/* cabeçalho */}
        <div className="flex items-center gap-3">
          <Link href={`/parceiros/${id}`} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {parceiro.tipoPessoa === 'PJ' ? <Building2 className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-blue-600" />}
            <span>{parceiro.tipoPessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${parceiro.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {parceiro.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* abas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex border-b border-gray-100 min-w-max">
              {ABAS.map(a => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => { setAba(a.key); setErro(''); setOk('') }}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    aba === a.key
                      ? 'border-blue-600 text-blue-700 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="w-3 h-3" /> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}
            {ok  && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{ok}</div>}

            {/* ── ABA: DADOS GERAIS ── */}
            {aba === 'dados' && (
              <div className="space-y-6">
                {/* status / classificação */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Campo label="Status">
                    <Sel value={String(f.ativo)} onChange={e => set('ativo', e.target.value === 'true')}>
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </Sel>
                  </Campo>
                  <Campo label="Nível">
                    <Sel value={String(f.nivel ?? '')} onChange={e => set('nivel', e.target.value)}>
                      <option value="">—</option>
                      {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                    </Sel>
                  </Campo>
                  <Campo label="Tipo de Parceria">
                    <Sel value={String(f.tipoParceria ?? '')} onChange={e => set('tipoParceria', e.target.value)}>
                      <option value="">—</option>
                      {TIPOS_PARC.map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </Campo>
                  <Campo label="Segmento">
                    <Sel value={String(f.segmento ?? '')} onChange={e => set('segmento', e.target.value)}>
                      <option value="">—</option>
                      {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Sel>
                  </Campo>
                  <Campo label="Renovações">
                    <Sel value={String(f.renovacoes ?? '')} onChange={e => set('renovacoes', e.target.value)}>
                      <option value="">—</option>
                      <option value="AvisarCliente">Avisar o Cliente</option>
                      <option value="AvisarParceiro">Avisar o Parceiro</option>
                    </Sel>
                  </Campo>
                </div>

                {/* dados principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {parceiro.tipoPessoa === 'PJ' ? (
                    <>
                      <Campo label="Razão Social *">
                        <Input value={String(f.razaoSocial ?? '')} onChange={e => set('razaoSocial', e.target.value)} />
                      </Campo>
                      <Campo label="Fantasia">
                        <Input value={String(f.nomeFantasia ?? '')} onChange={e => set('nomeFantasia', e.target.value)} />
                      </Campo>
                    </>
                  ) : (
                    <Campo label="Nome *">
                      <Input value={String(f.nome ?? '')} onChange={e => set('nome', e.target.value)} />
                    </Campo>
                  )}
                  <Campo label="Tipo de parceiro">
                    <Sel value={String(f.tipo ?? '')} onChange={e => set('tipo', e.target.value)}>
                      {['Indicador','Revendedor','Agente','Distribuidor','Contador','Outro'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Sel>
                  </Campo>
                  <Campo label="Responsável Interno">
                    <Sel value={String(f.responsavelId ?? '')} onChange={e => set('responsavelId', e.target.value)}>
                      <option value="">— Nenhum —</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </Sel>
                  </Campo>
                  <Campo label="Contador Responsável">
                    <Input value={String(f.contadorResponsavel ?? '')} onChange={e => set('contadorResponsavel', e.target.value)} placeholder="Nome do contador" />
                  </Campo>
                  <Campo label="Contato (dia a dia)">
                    <Input value={String(f.pessoaContato ?? '')} onChange={e => set('pessoaContato', e.target.value)} placeholder="Ex: Rubens / Dagmar" />
                  </Campo>
                </div>

                {/* contatos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="E-mail">
                    <Input type="email" value={String(f.email ?? '')} onChange={e => set('email', e.target.value)} />
                  </Campo>
                  <Campo label="E-mail Alternativo">
                    <Input type="email" value={String(f.emailAlternativo ?? '')} onChange={e => set('emailAlternativo', e.target.value)} />
                  </Campo>
                  <Campo label="Telefone 1">
                    <Input value={String(f.telefone ?? '')} onChange={e => set('telefone', formatarTel(e.target.value))} maxLength={15} />
                  </Campo>
                  <Campo label="Telefone 2">
                    <Input value={String(f.telefone2 ?? '')} onChange={e => set('telefone2', formatarTel(e.target.value))} maxLength={15} />
                  </Campo>
                  <Campo label="Celular">
                    <Input value={String(f.celular ?? '')} onChange={e => set('celular', formatarTel(e.target.value))} maxLength={15} />
                  </Campo>
                </div>

                <Campo label="Observações">
                  <textarea
                    value={String(f.observacoes ?? '')}
                    onChange={e => set('observacoes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </Campo>

                {/* contatos adicionais */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>Contatos Adicionais</span>
                    <span className="text-xs text-gray-400 font-normal">(outros responsáveis)</span>
                  </h4>

                  {parceiro.contatosParceiro.length > 0 && (
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            {['Nome','CPF','Cargo','Telefone','E-mail',''].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {parceiro.contatosParceiro.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-800">{c.nome}</td>
                              <td className="px-3 py-2 font-mono text-gray-500">{c.cpf ? formatarCPF(c.cpf) : '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.cargo || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.telefone || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.email || '—'}</td>
                              <td className="px-3 py-2">
                                <button type="button" onClick={() => excluirContato(c.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* form novo contato */}
                  <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { key: 'nome',           label: 'Nome',        type: 'text' },
                      { key: 'cpf',            label: 'CPF',         type: 'text' },
                      { key: 'cargo',          label: 'Cargo',       type: 'text' },
                      { key: 'dataNascimento', label: 'Nascimento',  type: 'date' },
                      { key: 'telefone',       label: 'Telefone',    type: 'text' },
                      { key: 'email',          label: 'E-mail',      type: 'email' },
                    ].map(campo => (
                      <div key={campo.key}>
                        <label className="block text-xs text-gray-500 mb-1">{campo.label}</label>
                        <input
                          type={campo.type}
                          value={novoContato[campo.key as keyof typeof novoContato]}
                          onChange={e => setNovoContato(p => ({ ...p, [campo.key]: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={adicionarContato}
                    disabled={adicionandoContato || !novoContato.nome.trim()}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40 transition"
                  >
                    {adicionandoContato ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Adicionar Contato
                  </button>
                </div>

              </div>
            )}

            {/* ── ABA: VALOR DE CUSTO ── */}
            {aba === 'custo' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Valor que cobramos deste parceiro por cada tipo de certificado.</p>
                <Campo label="Tabela de preço (preenche o custo automaticamente)">
                  <Sel value={String(f.tabelaPrecoId ?? '')} onChange={e => set('tabelaPrecoId', e.target.value)}>
                    <option value="">Nenhuma — preencher manualmente</option>
                    {tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </Sel>
                  {f.tabelaPrecoId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Os campos em cinza vêm da tabela e mudam automaticamente se ela for editada em Configurações.
                      Modelos sem valor na tabela continuam editáveis manualmente.
                    </p>
                  )}
                </Campo>
                <TabelaModelos
                  modelosPJ={modelosPJ}
                  modelosPF={modelosPF}
                  colunas={[
                    { header: 'Preço Padrão', render: m => <span className="text-gray-400">{moeda(m.preco)}</span>, align: 'right' },
                    {
                      header: 'Valor de Custo', align: 'right',
                      render: m => {
                        const tabelaAtual = tabelas.find(t => t.id === f.tabelaPrecoId)
                        const itemTabela = tabelaAtual?.itens.find(i => i.modeloId === m.id)
                        if (itemTabela) {
                          return (
                            <input type="text" readOnly value={moeda(itemTabela.valorCusto)}
                              title="Valor vindo da tabela de preço — edite a tabela em Configurações para mudar"
                              className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right bg-gray-100 text-gray-500"
                            />
                          )
                        }
                        return (
                        <input type="number" step="0.01" min="0"
                          value={comMap[m.id]?.valorCusto ?? ''}
                          onChange={e => setComissao(m.id, 'valorCusto', e.target.value)}
                          placeholder="—"
                          className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        )
                      },
                    },
                  ]}
                />
              </div>
            )}

            {/* ── ABA: COMISSÕES ── */}
            {aba === 'comissoes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Campo label="Tipo de Comissão">
                    <Sel value={String(f.tipoComissao ?? '')} onChange={e => set('tipoComissao', e.target.value)}>
                      <option value="">—</option>
                      {TIPOS_COM.map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </Campo>
                  <Campo label="Dia de Pagamento">
                    <Input
                      type="number" min="1" max="31"
                      value={String(f.diaPagamento ?? '')}
                      onChange={e => set('diaPagamento', e.target.value)}
                      placeholder="Ex: 15"
                    />
                  </Campo>
                </div>
                <TabelaModelos
                  modelosPJ={modelosPJ}
                  modelosPF={modelosPF}
                  colunas={[
                    {
                      header: '% Comissão', align: 'right',
                      render: m => (
                        <input type="number" step="0.01" min="0" max="100"
                          value={comMap[m.id]?.percentual ?? ''}
                          onChange={e => setComissao(m.id, 'percentual', e.target.value)}
                          placeholder="—"
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ),
                    },
                    {
                      header: 'Valor Fixo', align: 'right',
                      render: m => (
                        <input type="number" step="0.01" min="0"
                          value={comMap[m.id]?.valorFixo ?? ''}
                          onChange={e => setComissao(m.id, 'valorFixo', e.target.value)}
                          placeholder="—"
                          className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* ── ABA: VALORES P/ CLIENTE ── */}
            {aba === 'cliente' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Valor que este parceiro cobra de seus próprios clientes.</p>
                <TabelaModelos
                  modelosPJ={modelosPJ}
                  modelosPF={modelosPF}
                  colunas={[
                    { header: 'Preço Padrão', render: m => <span className="text-gray-400">{moeda(m.preco)}</span>, align: 'right' },
                    {
                      header: 'Valor p/ Cliente', align: 'right',
                      render: m => (
                        <input type="number" step="0.01" min="0"
                          value={comMap[m.id]?.valorCliente ?? ''}
                          onChange={e => setComissao(m.id, 'valorCliente', e.target.value)}
                          placeholder="—"
                          className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* ── ABA: INFORMAÇÕES ── */}
            {aba === 'info' && (
              <div className="space-y-4">
                <Campo label="Como enviar o certificado para este parceiro">
                  <textarea
                    value={String(f.informacoesEnvio ?? '')}
                    onChange={e => set('informacoesEnvio', e.target.value)}
                    rows={6}
                    placeholder="Ex: Enviar dados de instalação pelo WhatsApp. Não entrar em contato direto com o cliente."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </Campo>
              </div>
            )}

            {/* ── ABA: DADOS BANCÁRIOS ── */}
            {aba === 'banco' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Campo label="Chave PIX">
                    <Input value={String(f.chavePix ?? '')} onChange={e => set('chavePix', e.target.value)} placeholder="CPF, e-mail, telefone..." />
                  </Campo>
                  <Campo label="Banco">
                    <Input value={String(f.banco ?? '')} onChange={e => set('banco', e.target.value)} placeholder="Ex: Itaú, Bradesco..." />
                  </Campo>
                  <Campo label="Tipo de Conta">
                    <Sel value={String(f.tipoConta ?? 'Corrente')} onChange={e => set('tipoConta', e.target.value)}>
                      {TIPOS_CONTA.map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </Campo>
                  <Campo label="Agência">
                    <Input value={String(f.agencia ?? '')} onChange={e => set('agencia', e.target.value)} placeholder="0000" />
                  </Campo>
                  <Campo label="Conta">
                    <Input value={String(f.conta ?? '')} onChange={e => set('conta', e.target.value)} placeholder="00000-0" />
                  </Campo>
                </div>
              </div>
            )}

            {/* ── ABA: INDICAÇÕES ── */}
            {aba === 'indicacoes' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Campo label="Data inicial">
                    <input type="date" value={filtroIni} onChange={e => setFiltroIni(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </Campo>
                  <Campo label="Data final">
                    <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </Campo>
                  <div className="pt-5">
                    <span className="text-xs text-gray-500">{clientesFiltrados.length} cliente(s)</span>
                  </div>
                </div>

                {clientesFiltrados.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Nenhum cliente indicado no período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Cadastrado em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {clientesFiltrados.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-800">{c.nome}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {c.tipoPessoa === 'PF' && c.cpf ? formatarCPF(c.cpf) : c.cnpj ? formatarCNPJ(c.cnpj) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 text-xs">
                              {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA: ACESSO AO PAINEL ── */}
            {aba === 'painel' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Campo label="Login">
                    <Input
                      value={String(f.loginParceiro ?? '')}
                      onChange={e => set('loginParceiro', e.target.value)}
                      placeholder="usuario.parceiro"
                      autoComplete="off"
                    />
                  </Campo>
                  <Campo label={`Senha${parceiro.temSenha ? ' (deixe em branco para manter)' : ''}`}>
                    <Input
                      type="password"
                      value={String(f.senhaParceiro ?? '')}
                      onChange={e => set('senhaParceiro', e.target.value)}
                      placeholder={parceiro.temSenha ? '••••••••' : 'Nova senha'}
                      autoComplete="new-password"
                    />
                  </Campo>
                  <Campo label="Status do Painel">
                    <Sel value={String(f.statusPainel)} onChange={e => set('statusPainel', e.target.value === 'true')}>
                      <option value="false">Inativo</option>
                      <option value="true">Ativo</option>
                    </Sel>
                  </Campo>
                </div>

                {/* Notificações de vencimento */}
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm font-semibold text-amber-800 mb-3">Notificações de vencimento para clientes deste parceiro</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">WhatsApp automático</p>
                        <p className="text-xs text-gray-400">Enviar mensagens de vencimento por WhatsApp</p>
                      </div>
                      <button type="button"
                        onClick={() => set('whatsappVencimentoAtivo', !f.whatsappVencimentoAtivo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.whatsappVencimentoAtivo ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${f.whatsappVencimentoAtivo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">E-mail automático</p>
                        <p className="text-xs text-gray-400">Enviar e-mails de vencimento</p>
                      </div>
                      <button type="button"
                        onClick={() => set('emailVencimentoAtivo', !f.emailVencimentoAtivo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.emailVencimentoAtivo ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${f.emailVencimentoAtivo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-3">Permissões do Parceiro</p>
                  <div className="space-y-2">
                    {PERMISSOES.map(p => (
                      <label key={p.key} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!(parceiro.permissoesPainel?.[p.key])}
                          onChange={() => togglePerm(p.key)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── barra fixa de salvar ── */}
      <div className="sticky bottom-0 z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex-1">
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            {ok  && <p className="text-sm text-green-600">{ok}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/parceiros/${id}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={salvarTudo}
              disabled={salvando}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando…' : 'Salvar Tudo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
