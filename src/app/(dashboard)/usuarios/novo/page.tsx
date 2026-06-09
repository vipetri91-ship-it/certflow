'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { ArrowLeft, Save, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const PERFIS = [
  { value: 'ADMIN',        label: 'Administrador',     desc: 'Acesso total ao sistema' },
  { value: 'GERENTE',      label: 'Gerente',            desc: 'Acesso completo exceto configurações críticas' },
  { value: 'OPERADOR',     label: 'Agente de Registro', desc: 'Emite certificados e gerencia clientes' },
  { value: 'FINANCEIRO',   label: 'Aux Financeiro',     desc: 'Acesso ao módulo financeiro' },
  { value: 'VISUALIZADOR', label: 'Visualizador',       desc: 'Somente leitura, sem edição' },
]

const UNIDADES = ['Piracaia', 'Bragança Paulista', 'Joanópolis', 'Outra']

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [form, setForm] = useState({
    nome: '', username: '', email: '', senha: '', role: 'OPERADOR',
    whatsapp: '', nomeAgrDs: '', unidade: '', comissao: '',
    ativo: true,
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (form.senha.length < 8) { setErro('A senha deve ter no mínimo 8 caracteres'); return }
    setSalvando(true); setErro('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome, username: form.username, senha: form.senha,
          email: form.email || undefined,
          role: form.role, whatsapp: form.whatsapp || undefined,
          nomeAgrDs: form.nomeAgrDs || undefined,
          unidade: form.unidade || undefined,
          comissao: form.comissao ? Number(form.comissao) : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) router.push('/usuarios')
      else setErro(data.erro ?? 'Erro ao criar usuário')
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  return (
    <div>
      <Header titulo="Novo Usuário" />
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
        <form onSubmit={salvar} className="space-y-5">

          {/* Dados básicos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Dados do Usuário</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nome completo" required>
                <Input value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Nome do funcionário" />
              </Campo>
              <Campo label="Username (usado para login)" required>
                <Input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} required placeholder="ex: vinicius.petri" />
              </Campo>
              <Campo label="E-mail (contato, opcional)">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@vegcertificado.com.br" />
              </Campo>
              <Campo label="Senha" required>
                <div className="relative">
                  <Input type={mostrarSenha ? 'text' : 'password'} value={form.senha} onChange={e => set('senha', e.target.value)} required placeholder="Mínimo 8 caracteres" className="pr-10" />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Campo>
              <Campo label="WhatsApp">
                <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
              </Campo>
              <Campo label="Nome AGR no Digisac">
                <Input value={form.nomeAgrDs} onChange={e => set('nomeAgrDs', e.target.value)} placeholder="Ex: vinicius, ana.karolina..." />
              </Campo>
              <Campo label="Unidade / Cidade">
                <Sel value={form.unidade} onChange={e => set('unidade', e.target.value)}>
                  <option value="">Selecione...</option>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </Sel>
              </Campo>
              <Campo label="Status">
                <Sel value={form.ativo ? 'ativo' : 'bloqueado'} onChange={e => set('ativo', e.target.value === 'ativo')}>
                  <option value="ativo">Ativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </Sel>
              </Campo>
            </div>
          </div>

          {/* Perfil */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Perfil de Acesso</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERFIS.map(p => (
                <label key={p.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${form.role === p.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="role" value={p.value} checked={form.role === p.value} onChange={() => set('role', p.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Comissão */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Comissão</h3>
            <div className="max-w-xs">
              <Campo label="% de comissão por venda">
                <div className="relative">
                  <Input type="number" step="0.1" min={0} max={100} value={form.comissao} onChange={e => set('comissao', e.target.value)} placeholder="0.0" className="pr-8" />
                  <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                </div>
              </Campo>
              <p className="text-xs text-gray-400 mt-1">Percentual pago ao AGR sobre cada venda realizada</p>
            </div>
          </div>

          {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}

          <div className="flex items-center gap-3 pb-6">
            <Link href="/usuarios" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </Link>
            <button type="submit" disabled={salvando}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}