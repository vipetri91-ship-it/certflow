'use client'

import { Header } from '@/components/header'
import { useState } from 'react'
import { Fingerprint, Search } from 'lucide-react'

function formatarCpf(valor: string) {
  const nums = valor.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 3) return nums
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`
}

export default function BiometriaPage() {
  const [cpf, setCpf] = useState('')

  function abrir() {
    window.open('https://sistemas.gestaocd.com.br/home', '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <Header titulo="Consultar Biometria PSBio" />

      <div className="max-w-lg mx-auto mt-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100">
              <Fingerprint className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Verificação Biométrica</h2>
              <p className="text-sm text-gray-500">Consulta PSS LOCAL e GLOBAL via Portal AR IMPÉRIO</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF do titular <span className="text-gray-400 font-normal">(para copiar antes de abrir o portal)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatarCpf(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={abrir}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              <Search className="w-4 h-4" />
              Abrir Portal AR IMPÉRIO — Buscar Biometria
            </button>

            <p className="text-xs text-gray-400 text-center">
              O portal abrirá em nova aba. Cole o CPF acima no campo de busca de biometria.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}