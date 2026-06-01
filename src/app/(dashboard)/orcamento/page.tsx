'use client'

import { useState } from 'react'
import { Plus, Trash2, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/header'

interface Item {
  certificado: string
  midia:       string
  validade:    string
  quantidade:  number
  valorUnit:   number
}

const FORMAS = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX', 'Boleto Bancário']

function hoje() {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function OrcamentoPage() {
  const [destinatario, setDestinatario] = useState('')
  const [escopo,       setEscopo]       = useState('')
  const [formas,       setFormas]       = useState<string[]>(['PIX'])
  const [itens,        setItens]        = useState<Item[]>([
    { certificado: 'e-CPF A3', midia: 'Token',      validade: '02', quantidade: 1, valorUnit: 0 },
    { certificado: 'e-CNPJ A3', midia: 'Smart Card', validade: '02', quantidade: 1, valorUnit: 0 },
  ])

  const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0)

  function addItem() {
    setItens(prev => [...prev, { certificado: '', midia: '', validade: '02', quantidade: 1, valorUnit: 0 }])
  }

  function removeItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function setItem(idx: number, field: keyof Item, value: string | number) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function toggleForma(f: string) {
    setFormas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const escopoTexto = escopo || itens.filter(i => i.certificado).map(i => `${i.certificado}`).join(' e ')

  return (
    <>
      {/* ── Tela de edição (não aparece na impressão) ── */}
      <div className="print:hidden flex flex-col min-h-screen bg-[#EEF2FF] dark:bg-slate-900">
        <Header titulo="Orçamento / Proposta Comercial" />

        <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
          <Link href="/pedidos/nova-venda"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          {/* Destinatário */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Destinatário</h2>
            <input
              value={destinatario}
              onChange={e => setDestinatario(e.target.value)}
              placeholder="Nome do cliente ou empresa..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Escopo */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Escopo (opcional)</h2>
            <textarea
              value={escopo}
              onChange={e => setEscopo(e.target.value)}
              rows={2}
              placeholder="Ex: Fornecer certificado digital modelo e-CPF A3 e e-CNPJ A3."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400">Se vazio, preenche automaticamente com os certificados da tabela.</p>
          </div>

          {/* Itens */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Itens</h2>
              <button onClick={addItem}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Adicionar linha
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-2 pr-2 font-medium">Certificado</th>
                    <th className="text-left py-2 pr-2 font-medium">Mídia</th>
                    <th className="text-left py-2 pr-2 font-medium w-16">Val.</th>
                    <th className="text-left py-2 pr-2 font-medium w-14">Qtd.</th>
                    <th className="text-left py-2 pr-2 font-medium w-28">Valor Un. (R$)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50">
                      <td className="py-1.5 pr-2">
                        <input value={item.certificado} onChange={e => setItem(idx, 'certificado', e.target.value)}
                          placeholder="e-CPF A3"
                          className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={item.midia} onChange={e => setItem(idx, 'midia', e.target.value)}
                          placeholder="Token"
                          className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={item.validade} onChange={e => setItem(idx, 'validade', e.target.value)}
                          placeholder="02"
                          className="w-16 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input type="number" min={1} value={item.quantidade} onChange={e => setItem(idx, 'quantidade', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input type="number" min={0} step={0.01} value={item.valorUnit || ''} onChange={e => setItem(idx, 'valorUnit', Number(e.target.value))}
                          placeholder="0,00"
                          className="w-28 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="py-1.5">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-1">
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                Total: R$ {fmtValor(total)}
              </p>
            </div>
          </div>

          {/* Formas de pagamento */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Formas de Pagamento</h2>
            <div className="flex flex-wrap gap-3">
              {FORMAS.map(f => (
                <label key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={formas.includes(f)} onChange={() => toggleForma(f)}
                    className="accent-blue-600" />
                  {f}
                </label>
              ))}
            </div>
          </div>

          {/* Botão imprimir */}
          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ── Proposta para impressão ── */}
      <div className="hidden print:block font-sans text-[11pt] text-gray-900" style={{ fontFamily: 'Arial, sans-serif' }}>
        <style>{`
          @page { margin: 15mm 20mm; size: A4; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        `}</style>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
          <img src="/vaz-mark.svg" alt="V&G" style={{ height: '56px' }} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#1e40af', letterSpacing: '2px', marginBottom: '4px' }}>PROPOSTA COMERCIAL</p>
            <p style={{ fontSize: '8pt', color: '#6b7280' }}>Piracaia/SP — Praça Benedito Peçanha Franco, 28, Centro</p>
            <p style={{ fontSize: '8pt', color: '#6b7280' }}>CNPJ: 48.948.496/0001-56</p>
            <p style={{ fontSize: '8pt', color: '#6b7280' }}>(11) 94315-6015 / (11) 93332-3003 — vegcertificadora.com.br</p>
          </div>
        </div>

        {/* Título */}
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', textDecoration: 'underline', marginBottom: '16px' }}>
          Proposta de Prestação de Serviços em Certificação Digital
        </p>

        {/* Data e destinatário */}
        <p style={{ textAlign: 'right', marginBottom: '16px' }}>Piracaia/SP, {hoje()}.</p>

        <p style={{ marginBottom: '4px' }}>À</p>
        <p style={{ fontWeight: 'bold', marginBottom: '16px' }}>{destinatario || '[Destinatário]'}</p>

        {/* Intro */}
        <p style={{ textAlign: 'justify', marginBottom: '16px', lineHeight: '1.6' }}>
          Desde já, agradecemos o interesse pelos nossos serviços. Temos o prazer em enviá-lo esta proposta com a garantia e qualidade que a V&G oferece. Ressaltamos que esta tem validade de 30 dias, necessitando de revalidação após o seu vencimento.
        </p>

        {/* Escopo */}
        <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>ESCOPO</p>
        <p style={{ marginLeft: '24px', marginBottom: '20px', lineHeight: '1.6' }}>
          Fornecer certificado digital modelo {escopoTexto}.
        </p>

        {/* Condições Financeiras */}
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>CONDIÇÕES FINANCEIRAS</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10pt' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #1e40af' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 'normal', color: '#374151' }}>Certificado Digital</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 'normal', color: '#374151' }}>Mídia</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 'normal', color: '#374151' }}>Validade (Anos)</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 'normal', color: '#374151' }}>Quantidade</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 'normal', color: '#374151' }}>Valor Un. (R$)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#eff6ff' : '#ffffff' }}>
                <td style={{ padding: '6px 8px' }}>{item.certificado}</td>
                <td style={{ padding: '6px 8px' }}>{item.midia}</td>
                <td style={{ padding: '6px 8px' }}>{item.validade}</td>
                <td style={{ padding: '6px 8px' }}>{item.quantidade}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>R$ {fmtValor(item.quantidade * item.valorUnit)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #1e40af' }}>
              <td colSpan={4} style={{ padding: '8px', fontWeight: 'bold' }}>Total:</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>R$ {fmtValor(total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Formas de pagamento */}
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>FORMAS DE PAGAMENTO</p>
        <ul style={{ marginLeft: '24px', marginBottom: '24px', lineHeight: '1.8' }}>
          {formas.map(f => <li key={f}>{f}.</li>)}
        </ul>

        {/* Dados bancários */}
        <p style={{ marginBottom: '4px', fontWeight: 'bold' }}>Dados Bancários:</p>
        <p>Banco Inter</p>
        <p>Código do banco: 077</p>
        <p>Ag: 0001</p>
        <p style={{ marginBottom: '24px' }}>C/c: 27004928-2</p>

        {/* Encerramento */}
        <p style={{ marginBottom: '48px', lineHeight: '1.6' }}>
          Desde já, estamos à disposição para esclarecer todas as dúvidas acerca desta proposta.
        </p>

        {/* Assinatura */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #374151', width: '220px', margin: '0 auto 8px' }}></div>
          <p style={{ fontWeight: 'bold' }}>Vinicius Petri</p>
          <p>Gestor de Negócios</p>
          <p>Vinicius.petri@vegcertificado.com.br</p>
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '40px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '8pt', color: '#6b7280' }}>
          <p>Piracaia/SP — Praça Benedito Peçanha Franco, 28, Centro. CNPJ: 48.948.496/0001-56</p>
          <p>(11) 94315-6015 / (11) 93332-3003. AR VEG — vegcertificadora.com.br</p>
        </div>
      </div>
    </>
  )
}