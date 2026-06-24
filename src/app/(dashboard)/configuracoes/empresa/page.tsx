'use client'

import { Header } from '@/components/header'
import { useState, useEffect } from 'react'
import { Save, Upload, Building2, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import type { DadosEmpresa } from '@/app/api/configuracoes/empresa/route'
import { mascararCEP as formatarCEP, mascararCNPJ as formatarCNPJ } from '@/lib/mascaras'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

const cls = "w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cls} {...props} />
}
function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${cls} bg-white`} {...props}>{children}</select>
}


export default function EmpresaPage() {
  const [dados,    setDados]    = useState<DadosEmpresa | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [upando,   setUpando]   = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    fetch('/api/configuracoes/empresa')
      .then(r => r.json())
      .then(d => setDados(d.dados))
  }, [])

  function set(field: keyof DadosEmpresa, value: string) {
    setDados(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function buscarCep(cep: string) {
    if (cep.replace(/\D/g,'').length !== 8) return
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g,'')}/json/`)
      const data = await res.json()
      if (!data.erro && dados) {
        setDados(d => d ? {
          ...d,
          logradouro: data.logradouro ?? d.logradouro,
          bairro:     data.bairro     ?? d.bairro,
          cidade:     data.localidade ?? d.cidade,
          estado:     data.uf         ?? d.estado,
        } : d)
      }
    } catch {
      setMensagem('Erro ao buscar CEP. Verifique sua conexão.')
    }
  }

  async function uploadLogo(file: File) {
    if (!dados) return
    setUpando(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) set('logoUrl', data.url)
      else setMensagem('Erro ao enviar logo')
    } finally { setUpando(false) }
  }

  async function salvar() {
    if (!dados) return
    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch('/api/configuracoes/empresa', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dados }),
      })
      setMensagem(res.ok ? '✓ Dados salvos com sucesso!' : 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  if (!dados) {
    return (
      <div>
        <Header titulo="Empresa" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header titulo="Cadastro da Empresa" />
      <div className="p-4 lg:p-6 max-w-4xl space-y-6">

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" /> Logo da Empresa
          </h3>
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center bg-gray-50 dark:bg-slate-700 shrink-0 overflow-hidden">
              {dados.logoUrl ? (
                <div className="relative w-full h-full">
                  <Image src={dados.logoUrl} alt="Logo" fill style={{ objectFit: 'contain' }} className="p-2" />
                  <button
                    onClick={() => set('logoUrl', '')}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center p-3">
                  <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Sem logo</p>
                </div>
              )}
            </div>

            {/* Upload */}
            <div className="flex-1">
              <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border border-dashed text-sm font-medium transition w-fit ${
                upando ? 'border-gray-200 text-gray-400 cursor-wait' : 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}>
                {upando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {upando ? 'Enviando...' : 'Fazer upload da logo'}
                <input type="file" className="hidden" accept="image/*" disabled={upando}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
              </label>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG ou SVG · Recomendado: 400×200px · Máx. 2MB</p>
              <p className="text-xs text-gray-400 mt-1">A logo aparece em recibos e documentos gerados pelo sistema.</p>
            </div>
          </div>
        </div>

        {/* ── Identificação ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Razão Social *">
              <Input value={dados.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} placeholder="VASP SERVIÇOS E NEGOCIOS LTDA" />
            </Campo>
            <Campo label="Nome Fantasia *">
              <Input value={dados.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} placeholder="V&G Certificação Digital" />
            </Campo>
            <Campo label="CNPJ">
              <Input value={dados.cnpj} onChange={e => set('cnpj', formatarCNPJ(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} />
            </Campo>
          </div>
        </div>

        {/* ── Contato ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">Contato</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo label="Telefone">
              <Input value={dados.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 93332-3003" />
            </Campo>
            <Campo label="Celular / WhatsApp">
              <Input value={dados.celular} onChange={e => set('celular', e.target.value)} placeholder="(11) 94315-6015" />
            </Campo>
            <Campo label="E-mail">
              <Input type="email" value={dados.email} onChange={e => set('email', e.target.value)} placeholder="contato@vegcertificado.com.br" />
            </Campo>
            <Campo label="Website">
              <Input value={dados.website} onChange={e => set('website', e.target.value)} placeholder="www.vegcertificado.com.br" />
            </Campo>
          </div>
        </div>

        {/* ── Endereço ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">Endereço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Campo label="CEP">
              <Input value={dados.cep} autoComplete="off" maxLength={9} placeholder="00000-000"
                onChange={e => { const v = formatarCEP(e.target.value); set('cep', v); buscarCep(v) }} />
            </Campo>
            <div className="sm:col-span-2">
              <Campo label="Logradouro">
                <Input value={dados.logradouro} autoComplete="off" onChange={e => set('logradouro', e.target.value)} />
              </Campo>
            </div>
            <Campo label="Número">
              <Input value={dados.numero} autoComplete="off" onChange={e => set('numero', e.target.value)} />
            </Campo>
            <Campo label="Complemento">
              <Input value={dados.complemento} autoComplete="off" onChange={e => set('complemento', e.target.value)} />
            </Campo>
            <Campo label="Bairro">
              <Input value={dados.bairro} autoComplete="off" onChange={e => set('bairro', e.target.value)} />
            </Campo>
            <Campo label="Cidade">
              <Input value={dados.cidade} autoComplete="off" onChange={e => set('cidade', e.target.value)} />
            </Campo>
            <Campo label="Estado">
              <Sel value={dados.estado} onChange={e => set('estado', e.target.value)}>
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </Sel>
            </Campo>
          </div>
        </div>

        {/* ── Rodapé ────────────────────────────────────────────────── */}
        {mensagem && (
          <p className={`text-sm px-4 py-2 rounded-lg ${
            mensagem.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>{mensagem}</p>
        )}

        <div className="flex justify-end pb-6">
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
