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
    { certificado: 'e-CPF A3',  midia: 'Token',      validade: '02', quantidade: 1, valorUnit: 0 },
    { certificado: 'e-CNPJ A3', midia: 'Smart Card', validade: '02', quantidade: 1, valorUnit: 0 },
  ])

  const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0)

  function addItem() {
    setItens(p => [...p, { certificado: '', midia: '', validade: '02', quantidade: 1, valorUnit: 0 }])
  }
  function removeItem(idx: number) { setItens(p => p.filter((_, i) => i !== idx)) }
  function setItem(idx: number, field: keyof Item, value: string | number) {
    setItens(p => p.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function toggleForma(f: string) {
    setFormas(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])
  }

  const escopoFinal = escopo.trim() || itens.filter(i => i.certificado).map(i => i.certificado).join(' e ')

  return (
    <>
      {/* ── Formulário (oculto na impressão) ─────────────────────────── */}
      <div className="print:hidden flex flex-col min-h-screen bg-[#EEF2FF] dark:bg-slate-900">
        <Header titulo="Orçamento / Proposta Comercial" />
        <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
          <Link href="/pedidos/nova-venda" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          {/* Destinatário */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Destinatário</h2>
            <input value={destinatario} onChange={e => setDestinatario(e.target.value)}
              placeholder="Nome do cliente ou empresa..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Escopo */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Escopo <span className="text-gray-400 font-normal">(opcional)</span></h2>
            <textarea value={escopo} onChange={e => setEscopo(e.target.value)} rows={2}
              placeholder="Se vazio, preenche automaticamente com os certificados da tabela."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Itens */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Itens</h2>
              <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Adicionar linha
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-2 pr-2 font-medium">Certificado</th>
                    <th className="text-left py-2 pr-2 font-medium">Mídia</th>
                    <th className="text-left py-2 pr-2 font-medium w-16">Val. (anos)</th>
                    <th className="text-left py-2 pr-2 font-medium w-14">Qtd.</th>
                    <th className="text-left py-2 pr-2 font-medium w-28">Valor Un. (R$)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50">
                      <td className="py-1.5 pr-2"><input value={item.certificado} onChange={e => setItem(idx,'certificado',e.target.value)} placeholder="e-CPF A3" className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                      <td className="py-1.5 pr-2"><input value={item.midia} onChange={e => setItem(idx,'midia',e.target.value)} placeholder="Token" className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                      <td className="py-1.5 pr-2"><input value={item.validade} onChange={e => setItem(idx,'validade',e.target.value)} placeholder="02" className="w-16 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                      <td className="py-1.5 pr-2"><input type="number" min={1} value={item.quantidade} onChange={e => setItem(idx,'quantidade',Number(e.target.value))} className="w-14 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                      <td className="py-1.5 pr-2"><input type="number" min={0} step={0.01} value={item.valorUnit||''} onChange={e => setItem(idx,'valorUnit',Number(e.target.value))} placeholder="0,00" className="w-28 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                      <td className="py-1.5"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-1">
              <p className="text-sm font-bold text-gray-800 dark:text-white">Total: R$ {fmtValor(total)}</p>
            </div>
          </div>

          {/* Formas de pagamento */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white">Formas de Pagamento</h2>
            <div className="flex flex-wrap gap-3">
              {FORMAS.map(f => (
                <label key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={formas.includes(f)} onChange={() => toggleForma(f)} className="accent-blue-600" />{f}
                </label>
              ))}
            </div>
          </div>

          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* ── PROPOSTA PARA IMPRESSÃO ───────────────────────────────────── */}
      <div className="hidden print:block">
        <style>{`
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          @media print { html, body { width: 210mm; height: 297mm; } }
        `}</style>

        {/* Página */}
        <div style={{ width: '210mm', minHeight: '297mm', position: 'relative', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10pt', color: '#222', background: '#fff', overflow: 'hidden' }}>

          {/* Triângulo laranja — canto superior direito */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 80px 80px 0', borderColor: `transparent #e87722 transparent transparent` }} />

          {/* Triângulo laranja — canto inferior esquerdo */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '80px 0 0 80px', borderColor: `transparent transparent transparent #e87722` }} />

          {/* Conteúdo principal com padding */}
          <div style={{ padding: '14mm 18mm 18mm 18mm' }}>

            {/* ── CABEÇALHO ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6mm', paddingBottom: '4mm', borderBottom: '1px solid #ddd' }}>
              {/* Logo V&G */}
              <img src="/logo-vg.png" alt="V&G Certificação Digital" style={{ height: '22mm', width: 'auto' }} />

              {/* PROPOSTA COMERCIAL */}
              <div style={{ textAlign: 'right', paddingTop: '2mm', paddingRight: '12mm' }}>
                <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#1a3a6b', letterSpacing: '3px', margin: 0 }}>PROPOSTA COMERCIAL</p>
                <p style={{ fontSize: '8pt', color: '#555', margin: '2mm 0 0 0' }}>Piracaia/SP</p>
                <p style={{ fontSize: '8pt', color: '#555', margin: '1mm 0 0 0' }}>Praça Benedito Peçanha Franco, 28, Centro.</p>
                <p style={{ fontSize: '8pt', color: '#555', margin: '1mm 0 0 0' }}>CNPJ: 48.948.496/0001-56</p>
                <p style={{ fontSize: '8pt', color: '#555', margin: '1mm 0 0 0' }}>(11) 94315-6015 / (11) 93332-3003. AR VEG  vegcertificadora.com.br</p>
              </div>
            </div>

            {/* ── TÍTULO ── */}
            <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', textDecoration: 'underline', margin: '6mm 0 5mm 0' }}>
              Proposta de Prestação de Serviços em Certificação Digital
            </p>

            {/* ── DATA ── */}
            <p style={{ textAlign: 'right', margin: '0 0 6mm 0', fontSize: '10pt' }}>
              Piracaia/SP, {hoje()}.
            </p>

            {/* ── DESTINATÁRIO ── */}
            <p style={{ margin: '0 0 1mm 0' }}>À</p>
            <p style={{ fontWeight: 'bold', margin: '0 0 6mm 0', fontSize: '11pt' }}>
              {destinatario || '[Destinatário]'}
            </p>

            {/* ── INTRO ── */}
            <p style={{ textAlign: 'justify', lineHeight: '1.7', margin: '0 0 6mm 0' }}>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Desde já, agradecemos o interesse pelos nossos serviços. Temos o prazer em enviá-lo esta proposta com a garantia e qualidade que a V&amp;G oferece. Ressaltamos que esta tem validade de 30 dias, necessitando de revalidação após o seu vencimento.
            </p>

            {/* ── ESCOPO ── */}
            <p style={{ fontWeight: 'bold', margin: '0 0 3mm 0' }}>ESCOPO</p>
            <p style={{ margin: '0 0 6mm 0', paddingLeft: '10mm', lineHeight: '1.7' }}>
              Fornecer certificado digital modelo {escopoFinal}.
            </p>

            {/* ── CONDIÇÕES FINANCEIRAS ── */}
            <p style={{ fontWeight: 'bold', margin: '0 0 4mm 0' }}>CONDIÇÕES FINANCEIRAS</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '10pt' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '3mm 3mm', borderBottom: '1.5pt solid #1a3a6b', fontWeight: 'normal', color: '#444', width: '35%' }}>Certificado Digital</th>
                  <th style={{ textAlign: 'left', padding: '3mm 3mm', borderBottom: '1.5pt solid #1a3a6b', fontWeight: 'normal', color: '#444' }}>Mídia</th>
                  <th style={{ textAlign: 'left', padding: '3mm 3mm', borderBottom: '1.5pt solid #1a3a6b', fontWeight: 'normal', color: '#444' }}>Validade (Anos)</th>
                  <th style={{ textAlign: 'left', padding: '3mm 3mm', borderBottom: '1.5pt solid #1a3a6b', fontWeight: 'normal', color: '#444' }}>Quantidade</th>
                  <th style={{ textAlign: 'right', padding: '3mm 3mm', borderBottom: '1.5pt solid #1a3a6b', fontWeight: 'normal', color: '#444' }}>Valor Un. (R$)</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#dbeafe' : '#fff' }}>
                    <td style={{ padding: '2.5mm 3mm' }}>{item.certificado}</td>
                    <td style={{ padding: '2.5mm 3mm' }}>{item.midia}</td>
                    <td style={{ padding: '2.5mm 3mm' }}>{item.validade}</td>
                    <td style={{ padding: '2.5mm 3mm' }}>{item.quantidade}</td>
                    <td style={{ padding: '2.5mm 3mm', textAlign: 'right' }}>R$ {fmtValor(item.quantidade * item.valorUnit)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ padding: '3mm 3mm', fontWeight: 'bold', borderTop: '1.5pt solid #1a3a6b' }}>Total:</td>
                  <td style={{ padding: '3mm 3mm', textAlign: 'right', fontWeight: 'bold', borderTop: '1.5pt solid #1a3a6b' }}>R$ {fmtValor(total)}</td>
                </tr>
              </tbody>
            </table>

            {/* ── FORMAS DE PAGAMENTO ── */}
            <p style={{ fontWeight: 'bold', margin: '0 0 3mm 0' }}>FORMAS DE PAGAMENTO</p>
            <ul style={{ margin: '0 0 6mm 0', paddingLeft: '10mm', lineHeight: '2' }}>
              {formas.map(f => <li key={f}>{f}.</li>)}
            </ul>

            {/* ── DADOS BANCÁRIOS ── */}
            <p style={{ fontWeight: 'bold', margin: '0 0 2mm 0' }}>Dados Bancários:</p>
            <p style={{ margin: '0', lineHeight: '1.8' }}>Banco Inter</p>
            <p style={{ margin: '0', lineHeight: '1.8' }}>Código do banco: 077</p>
            <p style={{ margin: '0', lineHeight: '1.8' }}>Ag: 0001</p>
            <p style={{ margin: '0 0 7mm 0', lineHeight: '1.8' }}>C/c: 27004928-2</p>

            {/* ── ENCERRAMENTO ── */}
            <p style={{ lineHeight: '1.7', margin: '0 0 14mm 0' }}>
              Desde já, estamos à disposição para esclarecer todas as dúvidas acerca desta proposta.
            </p>

            {/* ── ASSINATURA ── */}
            <div style={{ textAlign: 'center', marginBottom: '12mm' }}>
              <div style={{ borderTop: '1px solid #333', width: '55mm', margin: '0 auto 3mm' }} />
              <p style={{ fontWeight: 'bold', margin: '0' }}>Vinicius Petri</p>
              <p style={{ margin: '1mm 0 0 0' }}>Gestor de Negócios</p>
              <p style={{ margin: '1mm 0 0 0' }}>Vinicius.petri@vegcertificado.com.br</p>
            </div>

            {/* ── RODAPÉ ── */}
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '3mm', fontSize: '8pt', color: '#777' }}>
              <p style={{ margin: 0 }}>Piracaia/SP — Praça Benedito Peçanha Franco, 28, Centro. CNPJ: 48.948.496/0001-56</p>
              <p style={{ margin: '1mm 0 0 0' }}>(11) 94315-6015 / (11) 93332-3003. AR VEG — vegcertificadora.com.br</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}