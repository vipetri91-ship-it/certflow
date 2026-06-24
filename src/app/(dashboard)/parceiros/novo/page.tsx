'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { ArrowLeft, Save, Loader2, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import { mergeDadosParceiroPorCnpj, type CnpjEncontradoParceiro } from './lib/merge-dados-cnpj'
import { BuscaCancelavel } from '@/lib/busca-cancelavel'
import { mascararCPF as formatarCPF, mascararCNPJ as formatarCNPJ, mascararTelefone as formatarTelefone } from '@/lib/mascaras'

const TIPOS_PARCEIRO = ['Indicador', 'Revendedor', 'Agente', 'Distribuidor', 'Outro']
const TIPOS_CONTA = ['Corrente', 'Poupança']

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
    <input className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />
  )
}

function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>
      {children}
    </select>
  )
}


export default function NovoParceiro() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'PF' | 'PJ'>('PF')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const cnpjBuscaRef = useRef(new BuscaCancelavel())

  useEffect(() => {
    return () => { cnpjBuscaRef.current.cancelar() }
  }, [])

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', celular: '',
    cpf: '', cnpj: '', razaoSocial: '',
    tipo: 'Indicador',
    banco: '', agencia: '', conta: '', tipoConta: 'Corrente', chavePix: '',
    observacoes: '',
  })

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
      setErro('Erro ao consultar CNPJ. Verifique sua conexão.')
      setForm(f => ({ ...f, ...mergeDadosParceiroPorCnpj(f, null) }))
      return
    }

    const { res, data } = resultado.dados!
    if (!res.ok) {
      setErro(data.erro ?? 'CNPJ não encontrado')
      setForm(f => ({ ...f, ...mergeDadosParceiroPorCnpj(f, null) }))
      return
    }
    setForm(f => ({ ...f, ...mergeDadosParceiroPorCnpj(f, data as CnpjEncontradoParceiro) }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const payload = {
      tipoPessoa: tipo,
      nome: tipo === 'PF' ? form.nome : (form.razaoSocial || form.nome),
      email: form.email || undefined,
      telefone: form.telefone.replace(/\D/g,'') || undefined,
      celular: form.celular.replace(/\D/g,'') || undefined,
      cpf: tipo === 'PF' ? form.cpf.replace(/\D/g,'') || undefined : undefined,
      cnpj: tipo === 'PJ' ? form.cnpj.replace(/\D/g,'') || undefined : undefined,
      razaoSocial: tipo === 'PJ' ? form.razaoSocial || undefined : undefined,
      tipo: form.tipo,
      banco: form.banco || undefined,
      agencia: form.agencia || undefined,
      conta: form.conta || undefined,
      tipoConta: form.tipoConta || undefined,
      chavePix: form.chavePix || undefined,
      observacoes: form.observacoes || undefined,
    }

    try {
      const res = await fetch('/api/parceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/parceiros/${data.id}`)
      } else {
        setErro(data.erro ?? 'Erro ao salvar parceiro')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <Header titulo="Novo Parceiro" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

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
            <h3 className="font-semibold text-gray-900 mb-4">Dados do Parceiro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tipo === 'PF' ? (
                <>
                  <Campo label="Nome completo *">
                    <Input value={form.nome} onChange={e => set('nome', e.target.value)} required />
                  </Campo>
                  <Campo label="CPF">
                    <Input value={form.cpf} onChange={e => set('cpf', formatarCPF(e.target.value))} maxLength={14} placeholder="000.000.000-00" />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo label="Razão Social *">
                    <Input value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} required />
                  </Campo>
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
                </>
              )}
              <Campo label="Tipo de parceiro *">
                <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS_PARCEIRO.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Campo>
              <Campo label="E-mail">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </Campo>
              <Campo label="Celular">
                <Input value={form.celular} onChange={e => set('celular', formatarTelefone(e.target.value))} maxLength={15} />
              </Campo>
              <Campo label="Telefone">
                <Input value={form.telefone} onChange={e => set('telefone', formatarTelefone(e.target.value))} maxLength={14} />
              </Campo>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Dados Bancários</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo label="Chave PIX">
                <Input value={form.chavePix} onChange={e => set('chavePix', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </Campo>
              <Campo label="Banco">
                <Input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: Itaú, Bradesco..." />
              </Campo>
              <Campo label="Tipo de conta">
                <Select value={form.tipoConta} onChange={e => set('tipoConta', e.target.value)}>
                  {TIPOS_CONTA.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Campo>
              <Campo label="Agência">
                <Input value={form.agencia} onChange={e => set('agencia', e.target.value)} placeholder="0000" />
              </Campo>
              <Campo label="Conta">
                <Input value={form.conta} onChange={e => set('conta', e.target.value)} placeholder="00000-0" />
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
            <Link href="/parceiros" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </Link>
            <button type="submit" disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Salvar Parceiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}