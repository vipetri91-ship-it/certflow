'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Copy, Check, Loader2, X, Barcode } from 'lucide-react'

interface Props {
  lancamentoId:    string
  jaTemCobranca:   boolean
  linhaDigitavel?: string | null
  pixCopiaECola?:  string | null
}

export function InterCobrancaButton({ lancamentoId, jaTemCobranca, linhaDigitavel, pixCopiaECola }: Props) {
  const router = useRouter()
  const [aberto,    setAberto]    = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro,      setErro]      = useState('')
  const [resultado, setResultado] = useState<{ linhaDigitavel: string; pixCopiaECola?: string } | null>(
    jaTemCobranca && linhaDigitavel ? { linhaDigitavel, pixCopiaECola: pixCopiaECola ?? undefined } : null
  )
  const [copiado, setCopiado] = useState<'boleto' | 'pix' | null>(null)

  async function gerar() {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/inter/cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lancamentoId }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao gerar cobrança'); return }
      setResultado(data)
      router.refresh()
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }

  function copiar(texto: string, tipo: 'boleto' | 'pix') {
    navigator.clipboard.writeText(texto)
    setCopiado(tipo)
    setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <>
      <button
        onClick={() => { setAberto(true); if (!resultado && !jaTemCobranca) gerar() }}
        title={jaTemCobranca ? 'Ver cobrança Inter' : 'Gerar cobrança Inter'}
        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition"
      >
        <QrCode className="w-3.5 h-3.5" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                Cobrança Banco Inter
              </h3>
              <button onClick={() => setAberto(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {carregando && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-500">Gerando cobrança no Banco Inter...</p>
                </div>
              )}

              {erro && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                  {erro}
                </div>
              )}

              {resultado && !carregando && (
                <div className="space-y-3">
                  {/* Boleto */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5" /> BOLETO — Linha Digitável
                    </p>
                    <p className="font-mono text-xs text-gray-800 break-all leading-relaxed">
                      {resultado.linhaDigitavel}
                    </p>
                    <button
                      onClick={() => copiar(resultado.linhaDigitavel, 'boleto')}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      {copiado === 'boleto' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiado === 'boleto' ? 'Copiado!' : 'Copiar linha digitável'}
                    </button>
                  </div>

                  {/* Pix */}
                  {resultado.pixCopiaECola && (
                    <div className="bg-green-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5" /> PIX — Copia e Cola
                      </p>
                      <p className="font-mono text-xs text-gray-700 break-all leading-relaxed">
                        {resultado.pixCopiaECola}
                      </p>
                      <button
                        onClick={() => copiar(resultado.pixCopiaECola!, 'pix')}
                        className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 font-medium transition"
                      >
                        {copiado === 'pix' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiado === 'pix' ? 'Copiado!' : 'Copiar Pix'}
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-center">
                    Pagamento confirmado automaticamente via webhook do Inter
                  </p>
                </div>
              )}

              {!resultado && !carregando && !erro && (
                <button
                  onClick={gerar}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Gerar Cobrança
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}