'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { ArrowLeft, Save, Loader2, User, Building2, Handshake } from 'lucide-react'
import Link from 'next/link'
import { mergeDadosEmpresaPorCnpj, type CnpjEncontrado } from './lib/merge-dados-cnpj'

type TipoPessoa = 'PF' | 'PJ'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {erro && <p className="text-xs text-red-500 mt-0.5">{erro}</p>}
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

function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function formatarCPF(v: string) {
  return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4').replace(/-$/,'')
}
function formatarCNPJ(v: string) {
  return v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5').replace(/-$/,'')
}
function formatarTelefone(v: string) {
  const n = v.replace(/\D/g,'').slice(0,11)
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3')
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3')
}
function formatarCEP(v: string) {
  return v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d{0,3})/,'$1-$2').replace(/-$/,'')
}

export default function NovoClientePage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoPessoa>('PF')
  const [salvando,     setSalvando]     = useState(false)
  const [erro,         setErro]         = useState('')
  const [buscandoCep,  setBuscandoCep]  = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [parceiros,    setParceiros]    = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    fetch('/api/parceiros?limit=200')
      .then(r => r.json())
      .then(d => setParceiros(d.parceiros ?? d ?? []))
      .catch(() => {})
  }, [])

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', celular: '',
    cpf: '', rg: '', dataNascimento: '',
    cnpj: '', razaoSocial: '', nomeFantasia: '', responsavel: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    observacoes: '', parceiroId: '', grupo: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function buscarCnpj(cnpj: string) {
    const nums = cnpj.replace(/\D/g, '')
    if (nums.length !== 14) return
    setBuscandoCnpj(true)
    setErro('')
    try {
      const res  = await fetch(`/api/cnpj/${nums}`)
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro ?? 'CNPJ não encontrado')
        setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpj(f, null) }))
        return
      }

      setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpj(f, data as CnpjEncontrado) }))
    } catch {
      setErro('Erro ao consultar CNPJ. Verifique sua conexão.')
      setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpj(f, null) }))
    } finally {
      setBuscandoCnpj(false)
    }
  }

  async function buscarCep(cep: string) {
    const nums = cep.replace(/\D/g, '')
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json()
      if (data.erro) {
        setErro('CEP não encontrado. Verifique e tente novamente.')
        return
      }
      // Preenche campos com dados dos Correios (sobrescreve qualquer autofill do navegador)
      setForm(f => ({
        ...f,
        logradouro: data.logradouro  ?? '',
        bairro:     data.bairro      ?? '',
        cidade:     data.localidade  ?? '',
        estado:     data.uf          ?? '',
      }))
      setErro('')
    } catch {
      setErro('Erro ao buscar CEP. Verifique sua conexão.')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const payload = {
      tipoPessoa: tipo,
      nome: tipo === 'PF' ? form.nome : form.razaoSocial,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      celular: form.celular || undefined,
      cpf: tipo === 'PF' ? form.cpf.replace(/\D/g,'') || undefined : undefined,
      cnpj: tipo === 'PJ' ? form.cnpj.replace(/\D/g,'') || undefined : undefined,
      rg: form.rg || undefined,
      dataNascimento: form.dataNascimento || undefined,
      razaoSocial: tipo === 'PJ' ? form.razaoSocial || undefined : undefined,
      nomeFantasia: tipo === 'PJ' ? form.nomeFantasia || undefined : undefined,
      responsavel: tipo === 'PJ' ? form.responsavel || undefined : undefined,
      cep: form.cep.replace(/\D/g,'') || undefined,
      logradouro: form.logradouro || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      observacoes: form.observacoes || undefined,
      parceiroId:  form.parceiroId  || undefined,
      grupo:       form.grupo       || undefined,
    }

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/clientes/${data.id}`)
      } else {
        setErro(data.erro ?? 'Erro ao salvar cliente')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <Header titulo="Novo Cliente" />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">

        {/* Tipo de pessoa */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Tipo de pessoa</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTipo('PF')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                tipo === 'PF' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4" /> Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => setTipo('PJ')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                tipo === 'PJ' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-4 h-4" /> Pessoa Jurídica
            </button>
          </div>
        </div>

        <form onSubmit={salvar} className="space-y-5">
          {/* Dados principais */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              {tipo === 'PF' ? 'Dados Pessoais' : 'Dados da Empresa'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tipo === 'PF' ? (
                <>
                  <Campo label="Nome completo *">
                    <Input value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Nome completo" />
                  </Campo>
                  <Campo label="CPF">
                    <Input value={form.cpf} onChange={e => set('cpf', formatarCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                  </Campo>
                  <Campo label="RG">
                    <Input value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="00.000.000-0" />
                  </Campo>
                  <Campo label="Data de nascimento">
                    <Input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo label="CNPJ">
                    <div className="flex gap-2">
                      <Input
                        value={form.cnpj}
                        autoComplete="off"
                        onChange={e => {
                          const v = formatarCNPJ(e.target.value)
                          set('cnpj', v)
                          if (v.replace(/\D/g,'').length === 14) buscarCnpj(v)
                        }}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                      <button
                        type="button"
                        onClick={() => buscarCnpj(form.cnpj)}
                        disabled={buscandoCnpj || form.cnpj.replace(/\D/g,'').length !== 14}
                        className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40 transition shrink-0"
                      >
                        {buscandoCnpj ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                      </button>
                    </div>
                  </Campo>
                  <Campo label="Razão social *">
                    <Input value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} required placeholder="Razão Social Ltda" />
                  </Campo>
                  <Campo label="Nome fantasia">
                    <Input value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} placeholder="Nome fantasia" />
                  </Campo>
                  <Campo label="Responsável / Sócio">
                    <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" />
                  </Campo>
                </>
              )}
            </div>
          </div>

          {/* Contato */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo label="E-mail">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
              </Campo>
              <Campo label="Celular">
                <Input value={form.celular} onChange={e => set('celular', formatarTelefone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
              </Campo>
              <Campo label="Telefone fixo">
                <Input value={form.telefone} onChange={e => set('telefone', formatarTelefone(e.target.value))} placeholder="(00) 0000-0000" maxLength={14} />
              </Campo>
            </div>
          </div>

          {/* Grupo / Parceiro */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Handshake className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Grupo / Parceiro</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Grupo empresarial">
                <Input
                  value={form.grupo}
                  onChange={e => set('grupo', e.target.value.toUpperCase())}
                  placeholder="Ex: REDENILF"
                  list="grupos-list"
                />
                <datalist id="grupos-list" />
                <p className="text-xs text-gray-400 mt-1">Vincula esta empresa a um grupo. Digite em maiúsculas.</p>
              </Campo>
              <Campo label="Parceiro indicador">
                <Select value={form.parceiroId} onChange={e => set('parceiroId', e.target.value)}>
                  <option value="">— Nenhum —</option>
                  {parceiros.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </Select>
              </Campo>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Endereço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Campo label="CEP">
                <div className="flex gap-2">
                  <Input
                    value={form.cep}
                    autoComplete="off"
                    onChange={e => {
                      const v = formatarCEP(e.target.value)
                      // Limpa endereço ao trocar o CEP para evitar dados antigos do navegador
                      setForm(f => ({ ...f, cep: v, logradouro: '', bairro: '', cidade: '', estado: '' }))
                      if (v.replace(/\D/g,'').length === 8) buscarCep(v)
                    }}
                    onBlur={e => buscarCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <button
                    type="button"
                    onClick={() => buscarCep(form.cep)}
                    disabled={buscandoCep || form.cep.replace(/\D/g,'').length !== 8}
                    className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40 transition shrink-0"
                  >
                    {buscandoCep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                  </button>
                </div>
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Logradouro">
                  <Input value={form.logradouro} autoComplete="off" onChange={e => set('logradouro', e.target.value)} placeholder="Rua, Avenida..." />
                </Campo>
              </div>
              <Campo label="Número">
                <Input value={form.numero} autoComplete="off" onChange={e => set('numero', e.target.value)} placeholder="123" />
              </Campo>
              <Campo label="Complemento">
                <Input value={form.complemento} autoComplete="off" onChange={e => set('complemento', e.target.value)} placeholder="Apto, Sala..." />
              </Campo>
              <Campo label="Bairro">
                <Input value={form.bairro} autoComplete="off" onChange={e => set('bairro', e.target.value)} placeholder="Bairro" />
              </Campo>
              <Campo label="Cidade">
                <Input value={form.cidade} autoComplete="off" onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
              </Campo>
              <Campo label="UF">
                <Select value={form.estado} onChange={e => set('estado', e.target.value)}>
                  <option value="">UF</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </Select>
              </Campo>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <Campo label="Observações">
              <textarea
                value={form.observacoes}
                onChange={e => set('observacoes', e.target.value)}
                rows={3}
                placeholder="Informações adicionais sobre o cliente..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </Campo>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
          )}

          <div className="flex items-center gap-3 pb-6">
            <Link href="/clientes" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </Link>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}