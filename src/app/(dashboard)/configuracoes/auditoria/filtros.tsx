'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'

const ACOES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']
const ENTIDADES = ['Cliente', 'Pedido', 'Parceiro', 'Certificado', 'Lancamento', 'Usuario', 'Parceiro']

interface Props {
  usuarios: { id: string; nome: string }[]
  acaoAtual: string
  entidadeAtual: string
  usuarioAtual: string
  deAtual: string
  ateAtual: string
}

export function AuditoriaFiltros({ usuarios, acaoAtual, entidadeAtual, usuarioAtual, deAtual, ateAtual }: Props) {
  const router = useRouter()
  const [acao, setAcao] = useState(acaoAtual)
  const [entidade, setEntidade] = useState(entidadeAtual)
  const [usuarioId, setUsuarioId] = useState(usuarioAtual)
  const [de, setDe] = useState(deAtual)
  const [ate, setAte] = useState(ateAtual)

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (acao) params.set('acao', acao)
    if (entidade) params.set('entidade', entidade)
    if (usuarioId) params.set('usuarioId', usuarioId)
    if (de) params.set('de', de)
    if (ate) params.set('ate', ate)
    router.push(`/configuracoes/auditoria?${params.toString()}`)
  }

  function limpar() {
    setAcao('')
    setEntidade('')
    setUsuarioId('')
    setDe('')
    setAte('')
    router.push('/configuracoes/auditoria')
  }

  const temFiltro = acao || entidade || usuarioId || de || ate

  return (
    <form onSubmit={aplicar} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ação</label>
          <select value={acao} onChange={e => setAcao(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as ações</option>
            {ACOES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Entidade</label>
          <select value={entidade} onChange={e => setEntidade(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas</option>
            {[...new Set(ENTIDADES)].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
          <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
          <input type="date" value={de} onChange={e => setDe(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
          <input type="date" value={ate} onChange={e => setAte(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
            <Search className="w-4 h-4" /> Filtrar
          </button>
          {temFiltro && (
            <button type="button" onClick={limpar} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              <X className="w-4 h-4" /> Limpar
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
