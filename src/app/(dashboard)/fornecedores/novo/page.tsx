'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

const TIPOS_CONTA = ['Corrente', 'Poupança']

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />
}

function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...props}>{children}</select>
}

function fmtCNPJ(v: string) {
  return v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5').replace(/-$/,'')
}
function fmtTel(v: string) {
  const n = v.replace(/\D/g,'').slice(0,11)
  return n.length <= 10 ? n.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3') : n.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3')
}

export default function NovoFornecedorPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: '', razaoSocial: '', cnpj: '', email: '', celular: '', telefone: '',
    banco: '', agencia: '', conta: '', tipoConta: 'Corrente', chavePix: '',
    observacoes: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/parceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoPessoa: 'PJ',
          nome: form.razaoSocial || form.nome,
          razaoSocial: form.razaoSocial || undefined,
          cnpj: form.cnpj.replace(/\D/g,'') || undefined,
          email: form.email || undefined,
          celular: form.celular.replace(/\D/g,'') || undefined,
          telefone: form.telefone.replace(/\D/g,'') || undefined,
          tipo: 'Fornecedor',
          banco: form.banco || undefined,
          agencia: form.agencia || undefined,
          conta: form.conta || undefined,
          tipoConta: form.tipoConta || undefined,
          chavePix: form.chavePix || undefined,
          observacoes: form.observacoes || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) router.push('/fornecedores')
      else setErro(data.erro ?? 'Erro ao salvar')
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <Header titulo="Novo Fornecedor" />
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <form onSubmit={salvar} className="space-y-5">

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Dados do Fornecedor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nome / Nome Fantasia *">
                <Input value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Ex: Safeweb" />
              </Campo>
              <Campo label="Razão Social">
                <Input value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} placeholder="Razão Social Ltda" />
              </Campo>
              <Campo label="CNPJ">
                <Input value={form.cnpj} onChange={e => set('cnpj', fmtCNPJ(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} />
              </Campo>
              <Campo label="E-mail">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </Campo>
              <Campo label="Celular / WhatsApp">
                <Input value={form.celular} onChange={e => set('celular', fmtTel(e.target.value))} maxLength={15} />
              </Campo>
              <Campo label="Telefone">
                <Input value={form.telefone} onChange={e => set('telefone', fmtTel(e.target.value))} maxLength={14} />
              </Campo>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Dados Bancários</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo label="Chave PIX">
                <Input value={form.chavePix} onChange={e => set('chavePix', e.target.value)} placeholder="CPF, CNPJ, e-mail ou telefone" />
              </Campo>
              <Campo label="Banco">
                <Input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: Itaú, Bradesco..." />
              </Campo>
              <Campo label="Tipo de conta">
                <Sel value={form.tipoConta} onChange={e => set('tipoConta', e.target.value)}>
                  {TIPOS_CONTA.map(t => <option key={t}>{t}</option>)}
                </Sel>
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
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Produtos/serviços fornecidos, condições, prazos..." />
            </Campo>
          </div>

          {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

          <div className="flex items-center gap-3 pb-6">
            <Link href="/fornecedores" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </Link>
            <button type="submit" disabled={salvando}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}