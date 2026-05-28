'use client'

import { useState, useEffect } from 'react'
import { X, MessageSquare, Mail, CheckCircle2, Loader2, ChevronRight, User, Building2 } from 'lucide-react'

interface PedidoEmitido {
  id: string
  numero: string
  numeroCompra?: string | null
  cliente: {
    nome: string
    razaoSocial?: string | null
    cpf?: string | null
    cnpj?: string | null
    celular?: string | null
    email?: string | null
  }
  parceiro?: {
    nome: string
    razaoSocial?: string | null
    celular?: string | null
    email?: string | null
  } | null
  itens: { modelo: { nome: string } }[]
}

interface Props {
  pedidoId: string
  onFechar: () => void
}

function fmtDoc(cpf?: string | null, cnpj?: string | null) {
  if (cnpj) return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (cpf)  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return '—'
}

export function PopupCertificadoEmitido({ pedidoId, onFechar }: Props) {
  const [pedido,  setPedido]  = useState<PedidoEmitido | null>(null)
  const [acao,    setAcao]    = useState<'whatsapp' | 'email' | null>(null)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [sucesso,  setSucesso]  = useState<string[]>([])
  const [erro,     setErro]     = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/pedidos/${pedidoId}`)
      .then(r => r.json())
      .then(setPedido)
  }, [pedidoId])

  async function enviar(tipo: 'whatsapp' | 'email', destinatario: 'cliente' | 'parceiro') {
    const chave = `${tipo}-${destinatario}`
    setEnviando(chave)
    setErro(null)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/notificar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo, destinatario }),
      })
      const data = await res.json()
      if (res.ok) {
        setSucesso(prev => [...prev, chave])
        setAcao(null)
      } else {
        setErro(data.erro || 'Erro ao enviar notificação')
      }
    } finally {
      setEnviando(null)
    }
  }

  const nomeTitular = pedido?.cliente.razaoSocial || pedido?.cliente.nome || ''
  const doc = fmtDoc(pedido?.cliente.cpf, pedido?.cliente.cnpj)
  const modelo = pedido?.itens[0]?.modelo.nome || ''
  const temWA  = !!(pedido?.cliente.celular || pedido?.parceiro?.celular)
  const temMail = !!(pedido?.cliente.email  || pedido?.parceiro?.email)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-6 text-center relative">
          <button onClick={onFechar} className="absolute top-3 right-3 text-white/70 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Certificado Emitido!</h2>
          <p className="text-green-100 text-sm mt-1">Processo concluído com sucesso</p>
        </div>

        {/* Detalhes do certificado */}
        <div className="px-6 pt-5 pb-4">
          {!pedido ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 mb-5">
                <Row label="Certificado Digital" value={nomeTitular} bold />
                <Row label="CPF/CNPJ"            value={doc} mono />
                {modelo && <Row label="Tipo" value={modelo} />}
                {pedido.numeroCompra && <Row label="Protocolo" value={pedido.numeroCompra} mono blue />}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Aprovado
                  </span>
                </div>
              </div>

              {/* Ações */}
              {(temWA || temMail) && (
                <div className="space-y-2">
                  <p className="text-xs text-center text-gray-400 font-medium uppercase tracking-wide mb-3">
                    Notificar sobre a emissão
                  </p>

                  {/* WhatsApp */}
                  {temWA && (
                    <AcaoEnvio
                      tipo="whatsapp"
                      aberto={acao === 'whatsapp'}
                      onAbrir={() => setAcao('whatsapp')}
                      onFechar={() => setAcao(null)}
                      temCliente={!!pedido.cliente.celular}
                      temParceiro={!!pedido.parceiro?.celular}
                      nomeCliente={nomeTitular}
                      nomeParceiro={pedido.parceiro?.razaoSocial || pedido.parceiro?.nome}
                      enviando={enviando}
                      sucesso={sucesso}
                      onEnviar={enviar}
                    />
                  )}

                  {/* E-mail */}
                  {temMail && (
                    <AcaoEnvio
                      tipo="email"
                      aberto={acao === 'email'}
                      onAbrir={() => setAcao('email')}
                      onFechar={() => setAcao(null)}
                      temCliente={!!pedido.cliente.email}
                      temParceiro={!!pedido.parceiro?.email}
                      nomeCliente={nomeTitular}
                      nomeParceiro={pedido.parceiro?.razaoSocial || pedido.parceiro?.nome}
                      enviando={enviando}
                      sucesso={sucesso}
                      onEnviar={enviar}
                    />
                  )}

                  {erro && <p className="text-xs text-red-500 text-center mt-1">{erro}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onFechar}
            className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Row({ label, value, bold, mono, blue }: { label: string; value: string; bold?: boolean; mono?: boolean; blue?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm text-right max-w-[65%] truncate ${bold ? 'font-semibold text-gray-800' : ''} ${mono ? 'font-mono' : ''} ${blue ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  )
}

function AcaoEnvio({
  tipo, aberto, onAbrir, onFechar,
  temCliente, temParceiro, nomeCliente, nomeParceiro,
  enviando, sucesso, onEnviar,
}: {
  tipo: 'whatsapp' | 'email'
  aberto: boolean
  onAbrir: () => void
  onFechar: () => void
  temCliente: boolean
  temParceiro: boolean
  nomeCliente: string
  nomeParceiro?: string
  enviando: string | null
  sucesso: string[]
  onEnviar: (tipo: 'whatsapp' | 'email', dest: 'cliente' | 'parceiro') => void
}) {
  const isWA    = tipo === 'whatsapp'
  const cor     = isWA ? 'green' : 'blue'
  const icone   = isWA ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />
  const label   = isWA ? 'WhatsApp' : 'E-mail'

  const btnBase = `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50`
  const btnOk   = `bg-${cor}-600 text-white`
  const btnNorm = `bg-white border border-${cor}-300 text-${cor}-700 hover:bg-${cor}-50`

  if (!aberto) {
    return (
      <button
        onClick={onAbrir}
        className={`w-full flex items-center justify-between px-4 py-3 border border-${cor}-200 rounded-xl text-sm font-medium text-${cor}-700 hover:bg-${cor}-50 transition`}
      >
        <span className="flex items-center gap-2">{icone} {label}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className={`border border-${cor}-200 rounded-xl p-3 bg-${cor}-50`}>
      <p className={`text-xs font-semibold text-${cor}-800 mb-2.5`}>Enviar {label} para:</p>
      <div className="flex gap-2">
        {temCliente && (
          <button
            onClick={() => onEnviar(tipo, 'cliente')}
            disabled={!!enviando}
            className={`${btnBase} ${sucesso.includes(`${tipo}-cliente`) ? btnOk : btnNorm}`}
          >
            {enviando === `${tipo}-cliente`
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : sucesso.includes(`${tipo}-cliente`)
              ? '✓'
              : <User className="w-3 h-3" />}
            {nomeCliente.split(' ')[0]}
          </button>
        )}
        {temParceiro && nomeParceiro && (
          <button
            onClick={() => onEnviar(tipo, 'parceiro')}
            disabled={!!enviando}
            className={`${btnBase} ${sucesso.includes(`${tipo}-parceiro`) ? btnOk : btnNorm}`}
          >
            {enviando === `${tipo}-parceiro`
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : sucesso.includes(`${tipo}-parceiro`)
              ? '✓'
              : <Building2 className="w-3 h-3" />}
            {nomeParceiro.split(' ')[0]}
          </button>
        )}
        <button onClick={onFechar} className="px-2 text-gray-400 hover:text-gray-600 transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
