'use client'

import { Header } from '@/components/header'
import { useState, useEffect, useRef } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import type { DadosEmpresa } from '@/app/api/configuracoes/empresa/route'

const hoje = () => new Date().toLocaleDateString('pt-BR')
const numeroRecibo = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*900)+100}`
}

const FORMAS = ['Pix','Boleto Bancário','Cartão de Débito','Cartão de Crédito','Dinheiro','Transferência']

export default function ReciboPage() {
  const [empresa, setEmpresa] = useState<DadosEmpresa | null>(null)
  const [numero,  setNumero]  = useState('')
  const [data,    setData]    = useState('')
  const [cliente, setCliente] = useState('')
  const [doc,     setDoc]     = useState('')
  const [descricao, setDescricao] = useState('Emissão de Certificado Digital')
  const [valor,   setValor]   = useState('')
  const [forma,   setForma]   = useState('Pix')
  const [obs,     setObs]     = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNumero(numeroRecibo())
    setData(hoje())
    fetch('/api/configuracoes/empresa')
      .then(r => r.json())
      .then(d => setEmpresa(d.dados))
  }, [])

  function novoRecibo() {
    setNumero(numeroRecibo())
    setData(hoje())
    setCliente('')
    setDoc('')
    setDescricao('Emissão de Certificado Digital')
    setValor('')
    setForma('Pix')
    setObs('')
  }

  function imprimir() {
    window.print()
  }

  const fmt = (v: string) => {
    const n = Number(v.replace(',','.'))
    if (isNaN(n)) return v
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <>
      {/* CSS de impressão — oculta tudo exceto o recibo */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #recibo-print, #recibo-print * { visibility: visible !important; }
          #recibo-print {
            position: fixed !important;
            top: 0; left: 0; right: 0;
            width: 100%; margin: 0; padding: 32px;
            background: white !important;
          }
        }
      `}</style>

      <div className="no-print">
        <Header titulo="Recibo" />
      </div>

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5 no-print">

        {/* Controles */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-slate-400">Preencha os dados abaixo e clique em Imprimir</p>
          <div className="flex gap-2">
            <button onClick={novoRecibo}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 transition">
              <RefreshCw className="w-3.5 h-3.5" /> Novo
            </button>
            <button onClick={imprimir}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              <Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Formulário */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Dados do Recibo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Nº Recibo', value: numero,   set: setNumero },
                { label: 'Data',      value: data,     set: setData   },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome do Cliente *</label>
              <input value={cliente} onChange={e => setCliente(e.target.value)}
                placeholder="Nome completo ou Razão Social"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">CPF / CNPJ</label>
              <input value={doc} onChange={e => setDoc(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Descrição do Serviço *</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valor (R$) *</label>
                <input value={valor} onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Forma de Pagamento</label>
                <select value={forma} onChange={e => setForma(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Observações</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informações adicionais..." />
            </div>
          </div>

          {/* Preview */}
          <div ref={printRef} id="recibo-print"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 text-gray-800"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>

            {/* Cabeçalho */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-gray-800">
              <div className="flex items-center gap-3">
                {empresa?.logoUrl ? (
                  <div style={{ width: 90, height: 60, position: 'relative' }}>
                    <Image src={empresa.logoUrl} alt="Logo" fill style={{ objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div className="w-16 h-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-lg">V&G</div>
                )}
                <div>
                  <p className="font-bold text-base text-blue-800">{empresa?.nomeFantasia ?? 'V&G Certificação Digital'}</p>
                  <p className="text-xs text-gray-500">{empresa?.razaoSocial ?? ''}</p>
                  <p className="text-xs text-gray-500">CNPJ: {empresa?.cnpj ?? ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-gray-800 uppercase tracking-wide">Recibo</p>
                <p className="text-sm font-semibold text-gray-600">Nº {numero}</p>
                <p className="text-xs text-gray-500">{data}</p>
              </div>
            </div>

            {/* Recebemos de */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Recebemos de</p>
              <p className="font-bold text-base">{cliente || '___________________________________'}</p>
              {doc && <p className="text-sm text-gray-600">CPF/CNPJ: {doc}</p>}
            </div>

            {/* Descrição + Valor */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: 'white' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600 }}>Descrição</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, width: 120 }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{descricao || 'Emissão de Certificado Digital'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                      {valor ? fmt(valor) : 'R$ _________'}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #1e3a8a' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#374151' }}>
                      Forma de pagamento: <strong>{forma}</strong>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#1e3a8a' }}>
                      {valor ? fmt(valor) : 'R$ _________'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Valor por extenso */}
            <p style={{ fontSize: 12, color: '#4b5563' }}>
              Valor: <em>{valor ? `${fmt(valor)}` : '___________________________________'}</em>
            </p>

            {obs && (
              <p style={{ fontSize: 12, color: '#4b5563', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                <strong>Obs.:</strong> {obs}
              </p>
            )}

            {/* Rodapé */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  <p>{empresa?.telefone ?? ''} | {empresa?.celular ?? ''}</p>
                  <p>{empresa?.email ?? ''}</p>
                  {empresa?.cidade && <p>{empresa.cidade} — {empresa.estado}</p>}
                </div>
                <div style={{ textAlign: 'center', minWidth: 180 }}>
                  <div style={{ borderTop: '1px solid #374151', paddingTop: 6, marginTop: 32 }}>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>{empresa?.nomeFantasia ?? 'V&G Certificação Digital'}</p>
                    <p style={{ fontSize: 11, color: '#6b7280' }}>Assinatura / Carimbo</p>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 12 }}>
                Este recibo é válido como comprovante de pagamento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
