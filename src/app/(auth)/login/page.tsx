'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { GeistSans } from 'geist/font/sans'

export default function LoginPage() {
  const router = useRouter()
  const [email,       setEmail]       = useState('')
  const [senha,       setSenha]       = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando,  setCarregando]  = useState(false)
  const [erro,        setErro]        = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const res = await signIn('credentials', { email, password: senha, redirect: false })
    setCarregando(false)
    if (res?.error) {
      setErro('E-mail ou senha inválidos. Verifique suas credenciais.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — marca ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #1d4ed8 100%)' }}>

        {/* ── Composição "Digital Seal" — anéis concêntricos ── */}

        {/* Anel externo — mais suave */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 560, height: 560, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 460, height: 460, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.09)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 360, height: 360, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.13)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 260, height: 260, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.03)' }} />

        {/* Gradiente radial de profundidade */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

        {/* Conteúdo central */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">

          {/* Anel do logo — integra com a composição */}
          <div className="relative mb-10" style={{ width: 120, height: 120 }}>
            {/* Anel externo do logo */}
            <div className="absolute inset-0 rounded-full"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }} />
            {/* Anel interno */}
            <div className="absolute inset-2 rounded-full"
              style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }} />
            {/* Logo */}
            <div className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <img src="/vaz-mark.svg" alt="VAZ" style={{ width: 56, height: 'auto' }} />
            </div>
          </div>

          {/* Tipografia limpa */}
          <h1 className={`${GeistSans.className} text-5xl font-bold text-white leading-none mb-3`}
            style={{ letterSpacing: '-0.03em' }}>
            CertFlow
          </h1>
          <p style={{ color: 'rgba(147,197,253,0.8)', fontSize: 15, fontWeight: 500, letterSpacing: 3 }}
            className="uppercase tracking-widest">
            V&amp;G Certificado Digital
          </p>
        </div>

        {/* Rodapé esquerdo */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p style={{ color: 'rgba(147,197,253,0.4)', fontSize: 11 }}>
            © {new Date().getFullYear()} V&G Certificado Digital
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ───────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-10">
            <img src="/vaz-mark.svg" alt="VAZ" className="h-8 w-auto" />
            <div>
              <p className="font-bold text-gray-900 leading-tight">CertFlow</p>
              <p className="text-xs text-gray-500">V&G Certificação Digital</p>
            </div>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Bem-vindo de volta!</h2>
            <p className="text-gray-500 mt-1.5">Faça seu login para continuar</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Login (e-mail)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com.br"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <span className="shrink-0">⚠️</span>
                {erro}
              </div>
            )}

            {/* Botão entrar */}
            <button type="submit" disabled={carregando}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm mt-2">
              {carregando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                : 'Entrar'}
            </button>
          </form>

          {/* Rodapé mobile */}
          <p className="text-center text-xs text-gray-400 mt-10 lg:hidden">
            © {new Date().getFullYear()} V&G Certificado Digital
          </p>
        </div>
      </div>
    </div>
  )
}
