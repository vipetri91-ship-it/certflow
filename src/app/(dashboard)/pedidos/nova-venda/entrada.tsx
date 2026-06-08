'use client'

import { useState } from 'react'
import { Video, MapPin, Globe } from 'lucide-react'
import { NovaVendaWizard } from './wizard'
import { EmissaoOnlineFluxo } from './emissao-online'

interface Modelo {
  id: string; nome: string; tipoPessoa: string; tipoCertificado: string
  suporte: string; validadeMeses: number; preco: number
}
interface Parceiro { id: string; nome: string; tipo: string }

interface Props {
  modelos: Modelo[]
  parceiros: Parceiro[]
  defaultAgr: string
}

export function NovaVendaEntrada({ modelos, parceiros, defaultAgr }: Props) {
  const [modo, setModo] = useState<'selecao' | 'normal' | 'online'>('selecao')

  if (modo === 'normal') {
    return <NovaVendaWizard modelos={modelos} parceiros={parceiros} defaultAgr={defaultAgr} />
  }

  if (modo === 'online') {
    return (
      <EmissaoOnlineFluxo
        modelos={modelos}
        parceiros={parceiros}
        defaultAgr={defaultAgr}
        onVoltar={() => setModo('selecao')}
      />
    )
  }

  // Tela de seleção do fluxo
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <p className="text-sm text-gray-500 mb-6">Selecione o tipo de atendimento para esta venda:</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fluxo Normal */}
        <button
          onClick={() => setModo('normal')}
          className="flex flex-col items-center gap-5 p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group text-left"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition">
              Fluxo Normal
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Videoconferência (Hope) ou Presencial (Gedar)
            </p>
          </div>
        </button>

        {/* Emissão Online */}
        <button
          onClick={() => setModo('online')}
          className="flex flex-col items-center gap-5 p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group text-left"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition">
            <Globe className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900 group-hover:text-purple-700 transition">
              Emissão Online
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Renovação via certificado A3 PF (Safe ID em Nuvem)
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
