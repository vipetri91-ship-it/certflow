'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { ordenarModelos } from '@/lib/modelos-grupo'

interface Modelo {
  id: string
  nome: string
  preco: number
  validadeMeses: number
  tipoPessoa: 'PF' | 'PJ'
}

interface ItemExistente {
  modeloId: string
  valorCusto: number
}

interface Props {
  tabelaId: string
  modelos: Modelo[]
  itensExistentes: ItemExistente[]
}

function moeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function TabelaPrecoEditor({ tabelaId, modelos, itensExistentes }: Props) {
  const router = useRouter()
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const item of itensExistentes) inicial[item.modeloId] = String(item.valorCusto)
    return inicial
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  const modelosPJ = useMemo(() => ordenarModelos(modelos.filter((m) => m.tipoPessoa === 'PJ')), [modelos])
  const modelosPF = useMemo(() => ordenarModelos(modelos.filter((m) => m.tipoPessoa === 'PF')), [modelos])

  async function salvar() {
    setSalvando(true); setErro(''); setOk('')
    try {
      const itens = modelos.map((m) => ({
        modeloId: m.id,
        valorCusto: valores[m.id] === undefined || valores[m.id] === '' ? null : Number(valores[m.id]),
      }))
      const res = await fetch(`/api/configuracoes/tabelas-preco/${tabelaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErro(data.erro ?? 'Erro ao salvar')
        return
      }
      setOk('Salvo com sucesso!')
      router.refresh()
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  function Grupo({ titulo, lista }: { titulo: string; lista: Modelo[] }) {
    if (lista.length === 0) return null
    return (
      <>
        <tr>
          <td colSpan={3} className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{titulo}</span>
          </td>
        </tr>
        {lista.map((m) => (
          <tr key={m.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-700">{m.nome}</td>
            <td className="px-4 py-3 text-right text-gray-400">{moeda(m.preco)}</td>
            <td className="px-4 py-3 text-right">
              <input
                type="number" step="0.01" min="0"
                value={valores[m.id] ?? ''}
                onChange={(e) => setValores((prev) => ({ ...prev, [m.id]: e.target.value }))}
                placeholder="—"
                className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </td>
          </tr>
        ))}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Modelo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Preço Padrão</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Valor de Custo nesta Tabela</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <Grupo titulo="E-CNPJ — Pessoa Jurídica" lista={modelosPJ} />
            <Grupo titulo="E-CPF — Pessoa Física" lista={modelosPF} />
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Tabela
        </button>
        {ok && <span className="text-sm text-green-600">{ok}</span>}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
      <p className="text-xs text-gray-400">
        Modelos deixados em branco ficam sem valor nesta tabela — parceiros vinculados a ela continuam podendo
        cadastrar o custo manualmente para esses modelos específicos.
      </p>
    </div>
  )
}
