'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { ArrowLeft, Save, Loader2, User, Building2, Handshake } from 'lucide-react'
import Link from 'next/link'
import { mergeDadosEmpresaPorCnpj, type CnpjEncontrado } from './lib/merge-dados-cnpj'
import { BuscaCancelavel } from '@/lib/busca-cancelavel'
import { mascararCPF as formatarCPF, mascararCNPJ as formatarCNPJ, mascararTelefone as formatarTelefone, mascararCEP as formatarCEP } from '@/lib/mascaras'

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


export default function EditarClientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [tipo, setTipo] = useState<TipoPessoa>('PF')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [buscandoCep,  setBuscandoCep]  = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [parceiros,    setParceiros]    = useState<{ id: string; nome: string }[]>([])
  const cnpjBuscaRef = useRef(new BuscaCancelavel())

  useEffect(() => {
    return () => { cnpjBuscaRef.current.cancelar() }
  }, [])

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', celular: '',
    cpf: '', rg: '', dataNascimento: '',
    cnpj: '', razaoSocial: '', nomeFantasia: '', responsavel: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    observacoes: '', parceiroId: '', grupo: '',
  })

  useEffect(() => {
    // Carrega parceiros e dados do cliente em paralelo
    Promise.all([
      fetch(`/api/clientes/${id}`).then(r => r.json()),
      fetch('/api/parceiros?limit=200').then(r => r.json()),
    ]).then(([data, pData]) => {
      setParceiros(pData.parceiros ?? pData ?? [])
      setTipo(data.tipoPessoa)
      setForm({
        nome:          data.nome          ?? '',
        email:         data.email         ?? '',
        telefone:      data.telefone ? formatarTelefone(data.telefone) : '',
        celular:       data.celular  ? formatarTelefone(data.celular)  : '',
        cpf:           data.cpf      ? formatarCPF(data.cpf)   : '',
        rg:            data.rg            ?? '',
        dataNascimento: data.dataNascimento ? data.dataNascimento.split('T')[0] : '',
        cnpj:          data.cnpj     ? formatarCNPJ(data.cnpj) : '',
        razaoSocial:   data.razaoSocial   ?? '',
        nomeFantasia:  data.nomeFantasia  ?? '',
        responsavel:   data.responsavel   ?? '',
        cep:           data.cep      ? formatarCEP(data.cep)   : '',
        logradouro:    data.logradouro    ?? '',
        numero:        data.numero        ?? '',
        complemento:   data.complemento   ?? '',
        bairro:        data.bairro        ?? '',
        cidade:        data.cidade        ?? '',
        estado:        data.estado        ?? '',
        observacoes:   data.observacoes   ?? '',
        parceiroId:    data.parceiroId    ?? '',
        grupo:         data.grupo         ?? '',
      })
      setCarregando(false)
    }).catch(() => { setErro('Erro ao carregar dados'); setCarregando(false) })
  }, [id])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function buscarCnpj(cnpj: string) {
    const nums = cnpj.replace(/\D/g, '')
    if (nums.length !== 14) return

    setBuscandoCnpj(true)
    setErro('')

    // Cancela qualquer busca de CNPJ anterior ainda em andamento, evitando
    // que uma resposta obsoleta sobrescreva os dados do CNPJ atual.
    const resultado = await cnpjBuscaRef.current.executar(async (signal) => {
      const res  = await fetch(`/api/cnpj/${nums}`, { signal })
      const data = await res.json()
      return { res, data }
    })

    if (resultado.cancelada) return
    setBuscandoCnpj(false)

    if (resultado.erro) {
      setErro('Erro ao consultar CNPJ.')
      setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpj(f, null) }))
      return
    }

    const { res, data } = resultado.dados!
    if (!res.ok) {
      setErro(data.erro ?? 'CNPJ não encontrado')
      setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpj(f, null) }))
      return
    }
    setForm(f => ({ ...f, ...mergeDadosEmpresaPorCnpj(f, data as CnpjEncontrado) }))
  }

  async function buscarCep(cep: string) {
    const nums = cep.replace(/\D/g, '')
    if (nums.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          logradouro: data.logradouro ?? '',
          bairro:     data.bairro     ?? '',
          cidade:     data.localidade ?? '',
          estado:     data.uf         ?? '',
        }))
      }
    } catch {
      setErro('Erro ao buscar CEP. Verifique sua conexão.')
    }
    setBuscandoCep(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const payload = {
      nome: tipo === 'PF' ? form.nome : form.razaoSocial,
      email: form.email || undefined,
      telefone: form.telefone.replace(/\D/g,'') || undefined,
      celular: form.celular.replace(/\D/g,'') || undefined,
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
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/clientes/${id}`)
      } else {
        setErro(data.erro ?? 'Erro ao salvar')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div>
        <Header titulo="Editar Cliente" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header titulo="Editar Cliente" />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Tipo de pessoa</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setTipo('PF')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${tipo === 'PF' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <User className="w-4 h-4" /> Pessoa Física
            </button>
            <button type="button" onClick={() => setTipo('PJ')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${tipo === 'PJ' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Building2 className="w-4 h-4" /> Pessoa Jurídica
            </button>
          </div>
        </div>

        <form onSubmit={salvar} className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{tipo === 'PF' ? 'Dados Pessoais' : 'Dados da Empresa'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tipo === 'PF' ? (
                <>
                  <Campo label="Nome completo *">
                    <Input value={form.nome} onChange={e => set('nome', e.target.value)} required />
                  </Campo>
                  <Campo label="CPF">
                    <Input value={form.cpf} onChange={e => set('cpf', formatarCPF(e.target.value))} maxLength={14} />
                  </Campo>
                  <Campo label="RG">
                    <Input value={form.rg} onChange={e => set('rg', e.target.value)} />
                  </Campo>
                  <Campo label="Data de nascimento">
                    <Input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo label="CNPJ">
                    <div className="flex gap-2">
                      <Input value={form.cnpj} autoComplete="off"
                        onChange={e => { const v = formatarCNPJ(e.target.value); set('cnpj', v); if (v.replace(/\D/g,'').length === 14) buscarCnpj(v) }}
                        placeholder="00.000.000/0000-00" maxLength={18} />
                      <button type="button" onClick={() => buscarCnpj(form.cnpj)}
                        disabled={buscandoCnpj || form.cnpj.replace(/\D/g,'').length !== 14}
                        className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40 transition shrink-0">
                        {buscandoCnpj ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                      </button>
                    </div>
                  </Campo>
                  <Campo label="Razão social *">
                    <Input value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} required />
                  </Campo>
                  <Campo label="Nome fantasia">
                    <Input value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} />
                  </Campo>
                  <Campo label="Responsável / Sócio">
                    <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
                  </Campo>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo label="E-mail">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </Campo>
              <Campo label="Celular">
                <Input value={form.celular} onChange={e => set('celular', formatarTelefone(e.target.value))} maxLength={15} />
              </Campo>
              <Campo label="Telefone fixo">
                <Input value={form.telefone} onChange={e => set('telefone', formatarTelefone(e.target.value))} maxLength={14} />
              </Campo>
            </div>
          </div>

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
                      setForm(f => ({ ...f, cep: v, logradouro: '', bairro: '', cidade: '', estado: '' }))
                      if (v.replace(/\D/g,'').length === 8) buscarCep(v)
                    }}
                    onBlur={e => buscarCep(e.target.value)}
                    maxLength={9}
                    placeholder="00000-000"
                  />
                  <button type="button" onClick={() => buscarCep(form.cep)}
                    disabled={buscandoCep || form.cep.replace(/\D/g,'').length !== 8}
                    className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40 transition shrink-0">
                    {buscandoCep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                  </button>
                </div>
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Logradouro">
                  <Input value={form.logradouro} autoComplete="off" onChange={e => set('logradouro', e.target.value)} />
                </Campo>
              </div>
              <Campo label="Número">
                <Input value={form.numero} autoComplete="off" onChange={e => set('numero', e.target.value)} />
              </Campo>
              <Campo label="Complemento">
                <Input value={form.complemento} autoComplete="off" onChange={e => set('complemento', e.target.value)} />
              </Campo>
              <Campo label="Bairro">
                <Input value={form.bairro} onChange={e => set('bairro', e.target.value)} />
              </Campo>
              <Campo label="Cidade">
                <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} />
              </Campo>
              <Campo label="UF">
                <Select value={form.estado} onChange={e => set('estado', e.target.value)}>
                  <option value="">UF</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </Select>
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
                />
                <p className="text-xs text-gray-400 mt-1">Vincula esta empresa a um grupo.</p>
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

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <Campo label="Observações">
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </Campo>
          </div>

          {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

          <div className="flex items-center gap-3 pb-6">
            <Link href={`/clientes/${id}`} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </Link>
            <button type="submit" disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}