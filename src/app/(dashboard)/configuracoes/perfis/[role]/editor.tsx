'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Save, Loader2, ArrowLeft, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import type { Modulo } from '@/lib/permissoes-estrutura'

interface Props {
  role: string
  roleLabel: string
  permissoesIniciais: Record<string, boolean>
  estrutura: Record<string, Modulo>
  isAdmin: boolean
}

const COR_ROLE: Record<string, string> = {
  ADMIN:        'from-purple-600 to-purple-700',
  GERENTE:      'from-blue-600 to-blue-700',
  OPERADOR:     'from-green-600 to-green-700',
  FINANCEIRO:   'from-yellow-500 to-yellow-600',
  VISUALIZADOR: 'from-gray-500 to-gray-600',
  OPERADOR_FINANCEIRO: 'from-teal-600 to-teal-700',
}

const EMOJI_ROLE: Record<string, string> = {
  ADMIN: '👑', GERENTE: '🎯', OPERADOR: '🏆', FINANCEIRO: '💰', VISUALIZADOR: '👁️', OPERADOR_FINANCEIRO: '🏆',
}

export function PermissoesEditor({ role, roleLabel, permissoesIniciais, estrutura, isAdmin }: Props) {
  const router = useRouter()
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({ ...permissoesIniciais })
  const [modulosAbertos, setModulosAbertos] = useState<Record<string, boolean>>({ cadastros: true })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function toggleModulo(key: string) {
    setModulosAbertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function togglePermissao(key: string) {
    if (isAdmin) return // Admin sempre tem tudo
    setPermissoes(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleSubgrupo(keys: string[], valor: boolean) {
    if (isAdmin) return
    const novo = { ...permissoes }
    keys.forEach(k => { novo[k] = valor })
    setPermissoes(novo)
  }

  function toggleModuloTodo(moduloKey: string, valor: boolean) {
    if (isAdmin) return
    const modulo = estrutura[moduloKey]
    const novo = { ...permissoes }
    for (const sub of Object.values(modulo.subgrupos)) {
      for (const item of sub.itens) novo[item.key] = valor
    }
    setPermissoes(novo)
  }

  function subgrupoTotalAtivo(keys: string[]): boolean {
    return keys.every(k => permissoes[k] === true)
  }

  function moduloTotalAtivo(moduloKey: string): boolean {
    const modulo = estrutura[moduloKey]
    for (const sub of Object.values(modulo.subgrupos)) {
      for (const item of sub.itens) {
        if (!permissoes[item.key]) return false
      }
    }
    return true
  }

  function contarAtivas(): number {
    return Object.values(permissoes).filter(Boolean).length
  }

  function totalPermissoes(): number {
    let total = 0
    for (const modulo of Object.values(estrutura)) {
      for (const sub of Object.values(modulo.subgrupos)) {
        total += sub.itens.length
      }
    }
    return total
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/configuracoes/permissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissoes }),
      })
      if (res.ok) { setSalvo(true); setTimeout(() => setSalvo(false), 3000) }
    } catch {}
    finally { setSalvando(false) }
  }

  const gradiente = COR_ROLE[role] ?? 'from-blue-600 to-blue-700'
  const ativas = isAdmin ? totalPermissoes() : contarAtivas()

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">

      {/* Header do perfil */}
      <div className={`bg-gradient-to-r ${gradiente} rounded-2xl p-5 text-white flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{EMOJI_ROLE[role]}</span>
          <div>
            <h2 className="font-bold text-lg">{roleLabel}</h2>
            <p className="text-white/70 text-sm">
              {isAdmin ? '✅ Todas as permissões ativas (Administrador tem acesso total)'
                : `${ativas} de ${totalPermissoes()} permissões ativas`}
            </p>
          </div>
        </div>
        {!isAdmin && (
          <div className="text-right">
            <div className="text-2xl font-black">{Math.round((ativas / totalPermissoes()) * 100)}%</div>
            <div className="text-white/70 text-xs">acesso</div>
          </div>
        )}
      </div>

      {/* Aviso Admin */}
      {isAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
          👑 O perfil <strong>Administrador</strong> sempre tem acesso total ao sistema. As permissões não podem ser alteradas.
        </div>
      )}

      {/* Módulos de permissão */}
      {Object.entries(estrutura).map(([moduloKey, modulo]) => {
        const aberto = modulosAbertos[moduloKey] ?? false
        const moduloAtivo = isAdmin || moduloTotalAtivo(moduloKey)

        return (
          <div key={moduloKey} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header do módulo */}
            <button
              onClick={() => toggleModulo(moduloKey)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
            >
              <div className="flex items-center gap-3">
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleModuloTodo(moduloKey, !moduloAtivo) }}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition ${moduloAtivo ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-blue-400'}`}>
                    {moduloAtivo && <span className="text-xs font-bold">✓</span>}
                  </button>
                )}
                <span className="font-bold text-gray-900 text-base">{modulo.label}</span>
                {isAdmin && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Tudo ativo</span>}
              </div>
              {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {/* Subgrupos */}
            {aberto && (
              <div className="px-5 pb-5 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(modulo.subgrupos).map(([subKey, sub]) => {
                    const keys = sub.itens.map(i => i.key)
                    const subAtivo = isAdmin || subgrupoTotalAtivo(keys)

                    return (
                      <div key={subKey} className="border border-gray-100 rounded-xl overflow-hidden">
                        {/* Header subgrupo */}
                        <div className={`flex items-center gap-2 px-3 py-2.5 ${subAtivo ? 'bg-blue-700' : 'bg-gray-700'}`}>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => toggleSubgrupo(keys, !subAtivo)}
                              className={`w-4 h-4 rounded flex items-center justify-center border border-white/50 transition ${subAtivo ? 'bg-white/30' : 'bg-transparent'}`}>
                              {subAtivo && <span className="text-white text-xs font-bold">✓</span>}
                            </button>
                          )}
                          <span className="text-white text-xs font-bold">{sub.label}</span>
                        </div>

                        {/* Itens */}
                        <div className="divide-y divide-gray-50">
                          {sub.itens.map(item => {
                            const ativa = isAdmin || permissoes[item.key] === true
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => togglePermissao(item.key)}
                                disabled={isAdmin}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-left text-xs transition ${isAdmin ? 'cursor-default' : 'hover:bg-gray-50'}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${ativa ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                  {ativa && <span className="text-white text-xs font-bold">✓</span>}
                                </div>
                                <span className={ativa ? 'text-gray-800' : 'text-gray-400'}>{item.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Ações */}
      <div className="flex items-center gap-3 pb-6">
        <Link href="/configuracoes/perfis"
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        {!isAdmin && (
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar Permissões'}
          </button>
        )}
      </div>
    </div>
  )
}
