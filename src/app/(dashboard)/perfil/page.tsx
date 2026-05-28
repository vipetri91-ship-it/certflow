'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Save, Loader2, Eye, EyeOff, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
  VISUALIZADOR: 'Visualizador',
}

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

export default function PerfilPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [dados, setDados] = useState({
    nome: '', email: '', role: '', avatar: '', createdAt: '',
  })
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '', avatar: '',
  })

  useEffect(() => {
    fetch('/api/perfil')
      .then(r => r.json())
      .then(d => {
        setDados(d)
        setForm({ nome: d.nome, email: d.email, senha: '', confirmarSenha: '', avatar: d.avatar ?? '' })
        setCarregando(false)
      })
      .catch(() => setCarregando(false))
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (form.senha && form.senha !== form.confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }
    if (form.senha && form.senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setSalvando(true)
    setErro('')

    const payload: Record<string, string> = {}
    if (form.nome !== dados.nome) payload.nome = form.nome
    if (form.email !== dados.email) payload.email = form.email
    if (form.senha) payload.senha = form.senha
    if (form.avatar !== (dados.avatar ?? '')) payload.avatar = form.avatar

    if (Object.keys(payload).length === 0) {
      setSalvando(false)
      return
    }

    try {
      const res = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setSalvo(true)
        setDados(d => ({ ...d, ...data }))
        setForm(f => ({ ...f, senha: '', confirmarSenha: '' }))
        setTimeout(() => setSalvo(false), 3000)
      } else {
        setErro(data.erro ?? 'Erro ao salvar')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const iniciais = dados.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  if (carregando) {
    return (
      <div>
        <Header titulo="Meu Perfil" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header titulo="Meu Perfil" />
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">

        {/* Avatar + info do usuário */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 overflow-hidden">
            {form.avatar ? (
              <img src={form.avatar} alt={dados.nome} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span>{iniciais}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{dados.nome}</h2>
            <p className="text-sm text-gray-500">{dados.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <User className="w-3 h-3" />
              {ROLE_LABELS[dados.role] ?? dados.role}
            </span>
          </div>
        </div>

        <form onSubmit={salvar} className="space-y-5">

          {/* Dados básicos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Dados do Usuário</h3>

            <Campo label="Nome completo">
              <Input value={form.nome} onChange={e => set('nome', e.target.value)} required />
            </Campo>

            <Campo label="E-mail">
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </Campo>

            <Campo label="Função no sistema">
              <Input value={ROLE_LABELS[dados.role] ?? dados.role} readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
            </Campo>

            <Campo label="Foto (URL de imagem — opcional)">
              <Input
                value={form.avatar}
                onChange={e => set('avatar', e.target.value)}
                placeholder="https://exemplo.com/minha-foto.jpg"
              />
              <p className="text-xs text-gray-400 mt-1">Cole o link de uma foto hospedada online. Deixe em branco para usar as iniciais.</p>
            </Campo>
          </div>

          {/* Alterar senha */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Alterar Senha</h3>
            <p className="text-xs text-gray-400">Deixe em branco para manter a senha atual.</p>

            <Campo label="Nova senha">
              <div className="relative">
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => set('senha', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button type="button" onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Campo>

            <Campo label="Confirmar nova senha">
              <Input
                type="password"
                value={form.confirmarSenha}
                onChange={e => set('confirmarSenha', e.target.value)}
                placeholder="Repita a nova senha"
              />
            </Campo>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
          )}
          {salvo && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              ✓ Dados salvos com sucesso!
            </div>
          )}

          <div className="flex items-center gap-3 pb-6">
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <button type="submit" disabled={salvando}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}