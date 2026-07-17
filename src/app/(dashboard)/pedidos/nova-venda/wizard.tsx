'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Loader2, ChevronRight, ChevronLeft, User, Building2,
  AlertTriangle, Search, Award, CreditCard, Calendar, History, Paperclip, Globe,
} from 'lucide-react'
import { mergeDadosResponsavelPF, mergeDadosClientePorCPF } from './lib/merge-dados-pf'
import { mergeDadosEmpresaPorCNPJ, limparDadosValidacaoPJ, type ClienteEncontradoPJ } from './lib/merge-dados-pj'
import { BuscaCancelavel } from '@/lib/busca-cancelavel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Modelo {
  id: string; nome: string; tipoPessoa: string; tipoCertificado: string
  suporte: string; validadeMeses: number; preco: number
}
interface Parceiro { id: string; nome: string; tipo: string }

interface CertHistorico {
  id: string; numero: string; status: string; valorFinal: number
  createdAt: string; agr: string | null; unidadeAtendimento: string | null
  itens: { modelo: { nome: string } }[]
}

interface WizardDados {
  tipoPessoa: 'PF' | 'PJ'
  // Step 1 — Identificação
  cnpj: string; cpfResponsavel: string; dataNascimento: string
  nomeEmpresa: string; nomeResponsavel: string
  clienteId: string; validado: boolean
  // Step 2 — Certificado
  modeloId: string; modeloNome: string; modeloPreco: number
  // Step 3 — Responsável
  nome: string; cpf: string; dataNasc: string
  email: string; ddd: string; telefone: string
  pisNis: string; cei: string; caepf: string
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; municipio: string; estado: string
  // Step 4 — Empresa (PJ)
  razaoSocial: string; fantasia: string; respContato: string
  emailEmpresa: string; dddEmpresa: string; telEmpresa: string; ie: string
  cepEmpresa: string; logradouroEmpresa: string; numeroEmpresa: string
  complementoEmpresa: string; bairroEmpresa: string; municipioEmpresa: string; estadoEmpresa: string
  // Step 5 — Pagamento
  parceiroId: string; contabilidade: string; voucher: string
  unidadeAtendimento: string
  valorVenda: number; formaPagamento: string; tipoAtendimento: string
  atendimentoExterno: boolean; valorDeslocamento: number
  agr: string; agendar: boolean
  dataAgendamento: string; horaAgendamento: string; duracaoAgendamento: number
  observacoesFinanceiro: string; observacoesAgendamento: string
}

const INITIAL = (defaultAgr: string): WizardDados => {
  const agora = new Date()
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  return {
    tipoPessoa: 'PJ', cnpj: '', cpfResponsavel: '', dataNascimento: '',
    nomeEmpresa: '', nomeResponsavel: '', clienteId: '', validado: false,
    modeloId: '', modeloNome: '', modeloPreco: 0,
    nome: '', cpf: '', dataNasc: '', email: '', ddd: '', telefone: '',
    pisNis: '', cei: '', caepf: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', estado: '',
    razaoSocial: '', fantasia: '', respContato: '',
    emailEmpresa: '', dddEmpresa: '', telEmpresa: '', ie: '',
    cepEmpresa: '', logradouroEmpresa: '', numeroEmpresa: '',
    complementoEmpresa: '', bairroEmpresa: '', municipioEmpresa: '', estadoEmpresa: '',
    parceiroId: '', contabilidade: '', voucher: '', unidadeAtendimento: '',
    valorVenda: 0, formaPagamento: 'Pix', tipoAtendimento: 'videoconferencia',
    atendimentoExterno: false, valorDeslocamento: 0,
    agr: defaultAgr, agendar: true,
    dataAgendamento: agora.toISOString().split('T')[0], horaAgendamento: horaAtual,
    duracaoAgendamento: 60, observacoesFinanceiro: '', observacoesAgendamento: '',
  }
}

const AGR_OPTIONS = [
  { value: 'vinicius',     label: 'Vinicius' },
  { value: 'arlen',        label: 'Arlen' },
  { value: 'ana.karolina', label: 'Ana Karolina' },
  { value: 'laryssa',      label: 'Laryssa' },
]
const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Bonificado']
const UNIDADES = ['Piracaia', 'Bragança Paulista']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt     = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtCPF  = (v: string) => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4').replace(/-$/,'')
const fmtCNPJ = (v: string) => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5').replace(/-$/,'')
const fmtCEP  = (v: string) => v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d{0,3})/,'$1-$2').replace(/-$/,'')
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

// Separa um celular salvo no banco (com ou sem DDD) em { ddd, telefone } de 2 e 9 dígitos,
// evitando que o DDD fique duplicado quando o autopreenchimento ocorre
function telefoneFromCelular(
  celular: string | null | undefined,
  dddOrigem: string | null | undefined,
  atual: { ddd: string; telefone: string }
): { ddd: string; telefone: string } {
  const digitos = (celular ?? '').replace(/\D/g, '')
  if (digitos.length >= 10) return { ddd: digitos.slice(0, 2), telefone: digitos.slice(2, 11) }
  if (digitos.length > 0)   return { ddd: dddOrigem || atual.ddd, telefone: digitos.slice(0, 9) }
  return atual
}

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
const cls = "w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${cls} ${className}`} {...props} />
  }
)
function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${cls} bg-white`} {...props}>{children}</select>
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ step, tipoPessoa }: { step: number; tipoPessoa: string }) {
  // PJ: 5 steps | PF: 4 steps
  const labels = tipoPessoa === 'PJ'
    ? ['Identificação', 'Certificado', 'Responsável', 'Empresa', 'Pagamento']
    : ['Identificação', 'Certificado', 'Responsável', 'Pagamento']

  // PF: step 5 (Pagamento) visualmente é posição 4
  const pos = (tipoPessoa === 'PF' && step === 5) ? 4 : step

  return (
    <div className="flex items-center justify-between mb-6">
      {labels.map((label, i) => {
        const n = i + 1
        const ativo    = n === pos
        const concluido = n < pos
        return (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${concluido ? 'bg-green-500 text-white' : ativo ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-500'}`}>
                {concluido ? <CheckCircle2 className="w-5 h-5" /> : n}
              </div>
              <span className={`text-xs mt-1 font-medium hidden sm:block
                ${ativo ? 'text-blue-600' : concluido ? 'text-green-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${n < pos ? 'bg-green-400' : 'bg-gray-200 dark:bg-slate-600'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Agrupamento dos modelos (por nome, não por suporte) ─────────────────────

const GRUPOS_ORDEM = [
  'A1 - Software',
  'A3 - em Cartão',
  'A3 - em Token',
  'A3 - Sem Mídia',
  'A3 - Cartão + Leitora',
  'A3 - em Nuvem',
]

function getGrupo(nome: string): string {
  if (nome.includes('A1'))                return 'A1 - Software'
  if (nome.includes('Cartão + Leitora'))  return 'A3 - Cartão + Leitora'
  if (nome.includes('em Cartão'))         return 'A3 - em Cartão'
  if (nome.includes('em Token'))          return 'A3 - em Token'
  if (nome.includes('Sem Mídia'))         return 'A3 - Sem Mídia'
  if (nome.includes('em Nuvem'))          return 'A3 - em Nuvem'
  return 'Outros'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NovaVendaWizard({
  modelos, parceiros, defaultAgr,
}: {
  modelos: Modelo[]; parceiros: Parceiro[]; defaultAgr: string
}) {
  const router  = useRouter()
  const [step,  setStep]  = useState(1)
  const [dados, setDados] = useState<WizardDados>(INITIAL(defaultAgr))
  const [loading,         setLoading]         = useState(false)
  const [erroValidacao,   setErroValidacao]   = useState('')
  const [buscandoCep,     setBuscandoCep]     = useState(false)
  const [buscandoCepEmp,  setBuscandoCepEmp]  = useState(false)
  const [historico,       setHistorico]       = useState<CertHistorico[]>([])
  const [pedidoCriado,    setPedidoCriado]    = useState<{
    id: string; numero: string; safewebProtocolo?: string | null; hopeUrlDocumentos?: string | null
    agendaSolicitado?: boolean; agendaOk?: boolean | null
  } | null>(null)
  const [protocolo,       setProtocolo]       = useState('')
  const [salvandoProt,    setSalvandoProt]    = useState(false)
  const telefoneRef    = useRef<HTMLInputElement>(null)
  const telEmpresaRef  = useRef<HTMLInputElement>(null)
  const cpfAbortRef     = useRef<AbortController | null>(null)
  const cpfDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cnpjBuscaRef    = useRef(new BuscaCancelavel())

  useEffect(() => {
    return () => {
      if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current)
      cpfAbortRef.current?.abort()
      cnpjBuscaRef.current.cancelar()
    }
  }, [])

  function set<K extends keyof WizardDados>(k: K, v: WizardDados[K]) {
    setDados(d => ({ ...d, [k]: v }))
  }

  // ── Navegação ──────────────────────────────────────────────────────────────
  function nextStep() {
    setErroValidacao('')
    // PF pula step 4 (Empresa)
    if (step === 3 && dados.tipoPessoa === 'PF') { setStep(5); return }
    setStep(s => s + 1)
  }
  function prevStep() {
    setErroValidacao('')
    if (step === 5 && dados.tipoPessoa === 'PF') { setStep(3); return }
    setStep(s => s - 1)
  }

  // ── Step 1: Validar CNPJ/CPF ──────────────────────────────────────────────

  // Checagem oficial da Safeweb (mesmo checkpoint usado antes da emissão): detecta
  // CPF/CNPJ CANCELADO, INAPTO, SUSPENSO, divergência de data de nascimento etc.
  // Em caso de erro de comunicação retorna null e não bloqueia o fluxo.
  async function consultarPrevia(
    documento: string,
    documentoTipo: '1' | '2',
    dtNascimento: string,
    cpfResponsavel?: string,
  ): Promise<{ liberado: boolean; codigo?: number; mensagem?: string; nome?: string | null } | null> {
    try {
      const res = await fetch('/api/safeweb/consulta-previa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento, documentoTipo, dtNascimento, cpfResponsavel }),
      })
      const data = await res.json()
      if (!res.ok) return null
      return { liberado: data.liberado, codigo: data.codigo, mensagem: data.mensagem, nome: data.nome ?? null }
    } catch {
      return null
    }
  }

  async function validarCNPJ() {
    const cnpj = dados.cnpj.replace(/\D/g,'')
    if (cnpj.length !== 14) { setErroValidacao('CNPJ deve ter 14 dígitos'); return }
    setLoading(true); setErroValidacao('')
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`)
      const data = await res.json()
      if (!res.ok) {
        setErroValidacao(data.erro ?? 'CNPJ não encontrado')
        setDados(d => ({ ...d, ...limparDadosValidacaoPJ() }))
        setHistorico([])
        return
      }

      const cpfNums = dados.cpfResponsavel.replace(/\D/g,'')
      let nomeRfb: string | undefined

      // Checagem oficial da Safeweb (Consulta Prévia — mesmo endpoint que a
      // própria Safeweb usa antes de liberar a emissão): única fonte de
      // verdade pra saber se esse CPF é o responsável autorizado pra esse
      // CNPJ. Não existe mais reforço local via QSA da Receita Federal
      // (BrasilAPI/cnpj.ws) — ele dava falso negativo tanto com QSA
      // desatualizado (15/07/2026, caso Yacht Club São Francisco) quanto com
      // QSA vazio de Empresário Individual/MEI, que não tem "sócio" no
      // sentido tradicional (17/07/2026). A Safeweb já resolve os dois casos
      // corretamente sozinha — se ela liberar, prossegue; se não liberar, o
      // motivo dela é que aparece pro usuário, ponto.
      if (cpfNums.length === 11 && dados.dataNascimento) {
        const previa = await consultarPrevia(cnpj, '2', dados.dataNascimento, cpfNums)
        if (previa && !previa.liberado) {
          setErroValidacao(`Código ${previa.codigo} - ${previa.mensagem}`)
          setDados(d => ({ ...d, ...limparDadosValidacaoPJ() }))
          setHistorico([])
          return
        }
        nomeRfb = previa?.nome ?? undefined
      }

      const clienteId = data.clienteExistente?.id ?? ''

      const cli = data.clienteExistente
      setDados(d => ({
        ...d,
        nomeEmpresa:      data.razaoSocial ?? data.nomeFantasia ?? '',
        razaoSocial:      data.razaoSocial ?? '',
        fantasia:         data.nomeFantasia ?? '',
        nomeResponsavel:  nomeRfb ?? cli?.responsavel ?? d.nomeResponsavel,
        clienteId,
        nome:             cli?.responsavel ?? nomeRfb ?? d.nome,
        cpfResponsavel:   cli?.cpf ? cli.cpf.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : d.cpfResponsavel,
        dataNascimento:   cli?.dataNascimento ? cli.dataNascimento.split('T')[0] : d.dataNascimento,
        email:       cli?.email ?? d.email,
        ...telefoneFromCelular(cli?.celular, cli?.ddd, { ddd: d.ddd, telefone: d.telefone }),
        cepEmpresa:  data.cep ? fmtCEP(data.cep) : d.cepEmpresa,
        logradouroEmpresa: data.logradouro ?? d.logradouroEmpresa,
        numeroEmpresa:     data.numero ?? d.numeroEmpresa,
        bairroEmpresa:     data.bairro ?? d.bairroEmpresa,
        municipioEmpresa:  data.municipio ?? d.municipioEmpresa,
        estadoEmpresa:     data.uf ?? d.estadoEmpresa,
        validado: true,
      }))

      // Buscar histórico se cliente já existe
      if (clienteId) {
        fetch(`/api/pedidos?clienteId=${clienteId}&limit=5`)
          .then(r => r.json())
          .then(d => setHistorico(d.pedidos ?? []))
          .catch(() => {})
      }
    } catch {
      setErroValidacao('Erro de conexão')
      setDados(d => ({ ...d, ...limparDadosValidacaoPJ() }))
      setHistorico([])
    }
    finally { setLoading(false) }
  }

  async function autoPreencherPorCNPJ(valorCampo: string) {
    const cnpj = valorCampo.replace(/\D/g,'')
    if (cnpj.length !== 14) return

    // Cancela qualquer busca de CNPJ anterior ainda em andamento, evitando
    // que uma resposta obsoleta sobrescreva os dados do CNPJ atual.
    const resultado = await cnpjBuscaRef.current.executar(async (signal) => {
      const fmt = fmtCNPJ(cnpj)
      const [d1, d2] = await Promise.all([
        fetch(`/api/clientes?q=${cnpj}&limit=5`, { signal }).then(r => r.json()),
        fetch(`/api/clientes?q=${encodeURIComponent(fmt)}&limit=5`, { signal }).then(r => r.json()),
      ])
      // Junta os resultados e procura o que tem CNPJ igual (normalizado)
      const todos: Record<string, unknown>[] = [...(d1.clientes ?? []), ...(d2.clientes ?? [])]
      const c = todos.find((x: Record<string, unknown>) => (x.cnpj as string)?.replace(/\D/g,'') === cnpj)
      if (!c) return { cliente: null, cpfFormatado: null, nascFill: null }

      // Para PJ: cpf fica no registro do responsável (PF separado), não no registro da empresa
      let cpfFill = (c.cpf as string | null) ?? null
      let nascFill = (c.dataNascimento as string | null) ?? null

      if (!cpfFill && c.responsavel) {
        // Busca o cliente PF cujo nome bate com o responsável
        const primeiroNome = (c.responsavel as string).trim().split(' ')[0]
        const dr = await fetch(`/api/clientes?q=${encodeURIComponent(primeiroNome)}&tipo=PF&limit=10`, { signal }).then(r => r.json())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pf = (dr.clientes ?? []).find((x: any) =>
          x.tipoPessoa === 'PF' && x.nome?.toLowerCase().includes(primeiroNome.toLowerCase())
        )
        if (pf?.cpf) { cpfFill = pf.cpf; nascFill = pf.dataNascimento ?? nascFill }
      }

      const cpfFormatado = cpfFill ? cpfFill.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : null
      return { cliente: c as unknown as ClienteEncontradoPJ, cpfFormatado, nascFill }
    })

    if (resultado.cancelada) return

    if (resultado.erro) {
      setDados(d => ({ ...d, ...mergeDadosEmpresaPorCNPJ(d, null, { cpfFormatado: null, dataNascimentoIso: null }) }))
      return
    }

    const { cliente, cpfFormatado, nascFill } = resultado.dados!
    setDados(d => ({
      ...d,
      ...mergeDadosEmpresaPorCNPJ(d, cliente, { cpfFormatado, dataNascimentoIso: nascFill }),
    }))
  }

  // Dispara a busca de CPF com debounce (300ms) — evita disparos duplicados
  // quando o blur ocorre mais de uma vez em sequência rápida.
  function buscarClientePorCPFDebounced() {
    if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current)
    cpfDebounceRef.current = setTimeout(() => { buscarClientePorCPF() }, 300)
  }

  async function buscarClientePorCPF() {
    const cpf = dados.cpfResponsavel.replace(/\D/g,'')
    if (cpf.length !== 11) return

    // Cancela qualquer busca de CPF anterior ainda em andamento, evitando
    // que uma resposta obsoleta sobrescreva os dados do CPF atual.
    cpfAbortRef.current?.abort()
    const controller = new AbortController()
    cpfAbortRef.current = controller

    try {
      const res = await fetch(`/api/clientes?q=${cpf}&limit=1`, { signal: controller.signal })
      const data = await res.json()
      if (controller.signal.aborted) return

      const c = data.clientes?.[0]
      setDados(d => ({ ...d, ...mergeDadosClientePorCPF(d, c, cpf) }))

      if (c?.cpf?.replace(/\D/g,'') === cpf && c.tipoPessoa === 'PF') {
        fetch(`/api/pedidos?clienteId=${c.id}&limit=5`)
          .then(r => r.json()).then(d => setHistorico(d.pedidos ?? [])).catch(() => {})
      } else {
        setHistorico([])
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setDados(d => ({ ...d, ...mergeDadosClientePorCPF(d, null, cpf) }))
      setHistorico([])
    }
  }

  async function validarPF() {
    const cpf = dados.cpfResponsavel.replace(/\D/g,'')
    if (cpf.length !== 11) { setErroValidacao('CPF inválido'); return }
    if (!dados.dataNascimento) { setErroValidacao('Data de nascimento obrigatória'); return }
    setLoading(true); setErroValidacao('')
    try {
      // Consulta RFB via ReceitaWS (ou banco como fallback)
      const res = await fetch(`/api/cpf/${cpf}?nascimento=${dados.dataNascimento}`)
      const data = await res.json()

      if (!res.ok) {
        setErroValidacao(data.erro ?? 'CPF não encontrado na Receita Federal')
        return
      }

      // Checagem oficial da Safeweb: bloqueia se o CPF não estiver liberado para emissão
      const previa = await consultarPrevia(cpf, '1', dados.dataNascimento)
      if (previa && !previa.liberado) {
        setErroValidacao(`Código ${previa.codigo} - ${previa.mensagem}`)
        return
      }

      // Nome: ReceitaWS (primário) → Safeweb ConsultaPrevia → banco
      const nomeRfb: string = data.nome ?? previa?.nome ?? ''
      const clienteDb = data.clienteExistente

      // CPF novo (sem clienteDb) = dados novos: limpa contato/endereço do
      // cliente pesquisado anteriormente em vez de manter o que estava na tela
      // (lógica em lib/merge-dados-pf.ts, coberta por testes automatizados)
      setDados(d => ({ ...d, ...mergeDadosResponsavelPF(d, { nomeRfb, clienteDb }) }))

      if (clienteDb?.id) {
        fetch(`/api/pedidos?clienteId=${clienteDb.id}&limit=5`)
          .then(r => r.json()).then(d => setHistorico(d.pedidos ?? [])).catch(() => {})
      }
    } catch {
      setErroValidacao('Erro de conexão ao validar CPF')
    } finally { setLoading(false) }
  }

  function semValidacao() {
    setErroValidacao('')
    setDados(d => ({ ...d, nomeEmpresa: d.tipoPessoa === 'PJ' ? 'Sem validação' : '', validado: true }))
    setStep(2)
  }

  // ── CEP ───────────────────────────────────────────────────────────────────
  async function buscarCep(cep: string, tipo: 'resp' | 'emp') {
    if (cep.replace(/\D/g,'').length !== 8) return
    tipo === 'resp' ? setBuscandoCep(true) : setBuscandoCepEmp(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g,'')}/json/`)
      const data = await res.json()
      if (!data.erro) {
        if (tipo === 'resp') setDados(d => ({
          ...d, logradouro: data.logradouro ?? d.logradouro,
          bairro: data.bairro ?? d.bairro, municipio: data.localidade ?? d.municipio, estado: data.uf ?? d.estado,
        }))
        else setDados(d => ({
          ...d, logradouroEmpresa: data.logradouro ?? d.logradouroEmpresa,
          bairroEmpresa: data.bairro ?? d.bairroEmpresa, municipioEmpresa: data.localidade ?? d.municipioEmpresa, estadoEmpresa: data.uf ?? d.estadoEmpresa,
        }))
      }
    } catch {
      setErroValidacao('Erro ao buscar CEP. Verifique sua conexão.')
    }
    tipo === 'resp' ? setBuscandoCep(false) : setBuscandoCepEmp(false)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function finalizar() {
    setLoading(true); setErroValidacao('')
    try {
      // A data/hora do agendamento é preenchida quando o wizard abre (INITIAL),
      // mas o formulário tem vários passos — se a pessoa demorar pra preencher
      // tudo, esse horário "envelhece" e fica no passado. Antes disso travava a
      // venda com um erro confuso, o que levava a pessoa a simplesmente desligar
      // o agendamento pra conseguir finalizar (caso real do Arlen, 15/07/2026,
      // resultou em vendas sem nenhum compromisso criado na agenda). Agora o
      // sistema ajusta sozinho pra daqui a 15 minutos em vez de travar.
      let dataAgendamentoFinal = dados.dataAgendamento
      let horaAgendamentoFinal = dados.horaAgendamento

      if (dados.agendar) {
        const horario = await fetch('/api/sistema/horario').then(r => r.json()).catch(() => null)
        if (horario?.agora) {
          const agora = new Date(horario.agora)
          const horarioAgendado = new Date(`${dataAgendamentoFinal}T${horaAgendamentoFinal}:00-03:00`)
          if (horarioAgendado <= agora) {
            const novoHorario = new Date(agora.getTime() + 15 * 60_000)
            dataAgendamentoFinal = novoHorario.toISOString().split('T')[0]
            horaAgendamentoFinal = `${String(novoHorario.getHours()).padStart(2, '0')}:${String(novoHorario.getMinutes()).padStart(2, '0')}`
            setDados(d => ({ ...d, dataAgendamento: dataAgendamentoFinal, horaAgendamento: horaAgendamentoFinal }))
          }
        }
      }

      const isPJ = dados.tipoPessoa === 'PJ'
      const obsExtra = [
        dados.cei   && `CEI: ${dados.cei}`,
        dados.caepf && `CAEPF: ${dados.caepf}`,
        dados.observacoesFinanceiro  && `Financeiro: ${dados.observacoesFinanceiro}`,
        dados.observacoesAgendamento && `Agendamento: ${dados.observacoesAgendamento}`,
      ].filter(Boolean).join('\n') || undefined

      const body = {
        clienteId: dados.clienteId || null,
        clienteDados: {
          tipoPessoa:    dados.tipoPessoa,
          nome:          isPJ ? dados.razaoSocial || dados.nomeEmpresa : dados.nome,
          // Para PJ: cpf NÃO vai aqui (vai em responsavelDados)
          cpf:           isPJ ? undefined : dados.cpfResponsavel.replace(/\D/g,''),
          cnpj:          isPJ ? dados.cnpj.replace(/\D/g,'') : undefined,
          razaoSocial:   isPJ ? dados.razaoSocial : undefined,
          nomeFantasia:  isPJ ? dados.fantasia || undefined : undefined,
          responsavel:   isPJ ? dados.nome : undefined,
          email:         isPJ ? (dados.emailEmpresa || dados.email || undefined) : dados.email || undefined,
          ddd:           isPJ ? (dados.dddEmpresa || dados.ddd || undefined) : dados.ddd || undefined,
          celular:       isPJ ? (dados.dddEmpresa || dados.ddd) + dados.telEmpresa.replace(/\D/g,'') : dados.ddd + dados.telefone.replace(/\D/g,''),
          dataNascimento: isPJ ? undefined : dados.dataNascimento || undefined,
          cep:           (isPJ ? dados.cepEmpresa : dados.cep).replace(/\D/g,''),
          logradouro:    isPJ ? dados.logradouroEmpresa : dados.logradouro,
          numero:        isPJ ? dados.numeroEmpresa     : dados.numero,
          complemento:   (isPJ ? dados.complementoEmpresa : dados.complemento) || undefined,
          bairro:        isPJ ? dados.bairroEmpresa    : dados.bairro,
          cidade:        isPJ ? dados.municipioEmpresa : dados.municipio,
          estado:        isPJ ? dados.estadoEmpresa    : dados.estado,
        },
        // Para PJ: dados do responsável (pessoa física) para criar/atualizar cadastro PF
        responsavelDados: isPJ ? {
          nome:          dados.nome,
          cpf:           dados.cpfResponsavel.replace(/\D/g,''),
          dataNascimento: dados.dataNasc || dados.dataNascimento || undefined,
          pisNis:        dados.pisNis || undefined,
          email:         dados.email || undefined,
          ddd:           dados.ddd || undefined,
          celular:       dados.ddd + dados.telefone.replace(/\D/g,''),
          cep:           dados.cep.replace(/\D/g,''),
          logradouro:    dados.logradouro,
          numero:        dados.numero,
          complemento:   dados.complemento || undefined,
          bairro:        dados.bairro,
          cidade:        dados.municipio,
          estado:        dados.estado,
        } : undefined,
        modeloId:           dados.modeloId,
        parceiroId:         dados.parceiroId || undefined,
        agr:                dados.agr,
        formaPagamento:     dados.formaPagamento,
        tipoAtendimento:    dados.tipoAtendimento,
        unidadeAtendimento: dados.unidadeAtendimento || undefined,
        contabilidade:      dados.contabilidade || undefined,
        voucher:            dados.voucher || undefined,
        atendimentoExterno: dados.atendimentoExterno,
        valorDeslocamento:  dados.atendimentoExterno ? dados.valorDeslocamento : 0,
        valorVenda:         dados.valorVenda,
        desconto:           0,
        observacoes:        obsExtra,
        agendamento: dados.agendar ? {
          data: dataAgendamentoFinal, hora: horaAgendamentoFinal, duracao: dados.duracaoAgendamento,
        } : undefined,
      }

      const res = await fetch('/api/pedidos/nova-venda', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) { setErroValidacao(result.erro ?? 'Erro ao criar pedido'); return }
      setPedidoCriado({
        id: result.id, numero: result.numero, safewebProtocolo: result.safewebProtocolo, hopeUrlDocumentos: result.hopeUrlDocumentos,
        agendaSolicitado: dados.agendar, agendaOk: result.agendaOk ?? null,
      })
    } catch { setErroValidacao('Erro de conexão') }
    finally { setLoading(false) }
  }

  async function salvarProtocolo() {
    if (!pedidoCriado || !protocolo.trim()) return
    setSalvandoProt(true)
    await fetch(`/api/pedidos/${pedidoCriado.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VERIFICADO', numeroCompra: protocolo.trim() }),
    })
    setSalvandoProt(false)
    router.push('/pedidos/monitoramento')
  }

  // ─── Tela de sucesso ──────────────────────────────────────────────────────
  if (pedidoCriado) {
    const protocoloAuto = pedidoCriado.safewebProtocolo
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pedido gerado com sucesso!</h2>
            <p className="text-sm text-gray-500 mt-1">Pedido <strong className="font-mono">{pedidoCriado.numero}</strong></p>
          </div>

          {pedidoCriado.agendaSolicitado && pedidoCriado.agendaOk === false && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-left border border-amber-200 dark:border-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>O pedido foi criado, mas não consegui agendar na Google Agenda.</strong> Crie o compromisso manualmente pra não perder o horário com o cliente.
              </p>
            </div>
          )}

          {protocoloAuto ? (
            /* Protocolo criado automaticamente */
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 text-left space-y-2 border border-green-200 dark:border-green-800">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Protocolo Safeweb criado automaticamente
              </p>
              <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-400 tracking-wider text-center py-1">
                {protocoloAuto}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 text-center">
                {dados.tipoAtendimento === 'presencial'
                  ? 'Atendimento presencial — oriente o cliente a levar os documentos originais até a AR'
                  : 'Videoconferência agendada e vinculada ao Hope Portal'}
              </p>
              {pedidoCriado.hopeUrlDocumentos && (
                <a href={pedidoCriado.hopeUrlDocumentos} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition">
                  <Paperclip className="w-4 h-4" /> Anexar documentação
                </a>
              )}
            </div>
          ) : (
            /* Protocolo manual (presencial ou falha na geração automática) */
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 text-left space-y-3">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Próximos passos:</p>
                <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5 list-decimal pl-5">
                  <li>Acesse o <strong>Hope Portal Safeweb</strong> para gerar o protocolo</li>
                  <li>Cole o número do protocolo abaixo</li>
                  <li>O atendimento entrará na fila do Monitoramento</li>
                </ol>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Número do Protocolo Safeweb (Hope):</p>
                <div className="flex gap-2">
                  <input value={protocolo} onChange={e => setProtocolo(e.target.value)} placeholder="Ex: 1010564132"
                    className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={salvarProtocolo} disabled={!protocolo.trim() || salvandoProt}
                    className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
                    {salvandoProt ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push('/pedidos/monitoramento')}
              className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              Ir para Monitoramento
            </button>
            <button onClick={() => { setDados(INITIAL(defaultAgr)); setPedidoCriado(null); setStep(1); setHistorico([]) }}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              Nova Venda
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Modelos filtrados + agrupados por nome + ordenados por validade ─────
  const modelosFiltrados = modelos.filter(m => m.tipoPessoa === dados.tipoPessoa)

  const gruposMap = modelosFiltrados.reduce<Record<string, Modelo[]>>((acc, m) => {
    const key = getGrupo(m.nome)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  // Ordena dentro de cada grupo por validadeMeses (crescente)
  Object.values(gruposMap).forEach(items => items.sort((a, b) => a.validadeMeses - b.validadeMeses))

  // Ordena os grupos na ordem predefinida
  const grupos = GRUPOS_ORDEM
    .filter(g => gruposMap[g])
    .map(g => [g, gruposMap[g]] as [string, Modelo[]])

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <Stepper step={step} tipoPessoa={dados.tipoPessoa} />

      {/* ══════════════ STEP 1 — IDENTIFICAÇÃO (original) ══════════════════ */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Tipo do Cliente</p>
            <div className="flex gap-3">
              {(['PJ', 'PF'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => { set('tipoPessoa', t); setErroValidacao(''); set('validado', false); setHistorico([]) }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition
                    ${dados.tipoPessoa === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300'}`}>
                  {t === 'PJ' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dados.tipoPessoa === 'PJ' && (
                <Campo label="CNPJ" required>
                  <Input value={dados.cnpj}
                    onChange={e => { set('cnpj', fmtCNPJ(e.target.value)); set('validado', false) }}
                    onBlur={e => autoPreencherPorCNPJ(e.target.value)}
                    placeholder="00.000.000/0000-00" maxLength={18} />
                </Campo>
              )}
              <Campo label={dados.tipoPessoa === 'PJ' ? 'CPF do Responsável' : 'CPF'} required>
                <Input value={dados.cpfResponsavel}
                  onChange={e => { set('cpfResponsavel', fmtCPF(e.target.value)); set('validado', false) }}
                  onBlur={() => buscarClientePorCPFDebounced()}
                  placeholder="000.000.000-00" maxLength={14} />
              </Campo>
              <Campo label="Data de Nascimento" required>
                <Input type="date" value={dados.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} />
              </Campo>
            </div>

            {erroValidacao && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{erroValidacao}</span>
              </div>
            )}

            {dados.validado && dados.nomeEmpresa && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                <strong>{dados.nomeEmpresa}</strong>
                {dados.nomeResponsavel && <span className="ml-2 text-green-600 dark:text-green-400">— {dados.nomeResponsavel}</span>}
              </div>
            )}
            {dados.validado && dados.tipoPessoa === 'PF' && dados.nomeResponsavel && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-1">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold">CPF validado na Receita Federal</span>
                </div>
                <p className="text-base font-bold text-green-900 dark:text-green-200 pl-6">{dados.nomeResponsavel}</p>
                <p className="text-xs text-green-600 dark:text-green-400 pl-6">
                  {dados.cpfResponsavel} — {dados.dataNascimento ? new Date(dados.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={dados.tipoPessoa === 'PJ' ? validarCNPJ : validarPF}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Validar Dados
              </button>
              <button onClick={semValidacao}
                className="px-5 py-2.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition">
                Sem Validação
              </button>
              <span className="text-gray-300 dark:text-slate-600 hidden sm:block">|</span>
              <button onClick={() => router.push('/pedidos/nova-venda/online')}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 text-sm font-medium rounded-lg hover:bg-purple-100 transition">
                <Globe className="w-4 h-4" />
                Emissão Online
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!dados.validado}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              Avançar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 2 — CERTIFICADO ════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Histórico do cliente (se existir) */}
          {historico.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <History className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Certificado(s) do Cliente</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[480px]">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>{['Modelo', 'Data', 'Valor', 'Unidade', 'AGR', 'Status'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-gray-500 dark:text-slate-400">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {historico.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{p.itens[0]?.modelo?.nome ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{fmtData(p.createdAt)}</td>
                        <td className="px-3 py-2 text-gray-500">{fmt(p.valorFinal)}</td>
                        <td className="px-3 py-2 text-gray-500">{p.unidadeAtendimento ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{p.agr ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'EMITIDO' ? 'bg-green-100 text-green-700' :
                            p.status === 'GERADO'  ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lista de modelos — filtrada estritamente por tipoPessoa */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <Award className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Selecione o Modelo — {dados.tipoPessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </h3>
            </div>
            {grupos.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum modelo cadastrado para {dados.tipoPessoa}.</p>
            )}
            {grupos.map(([grupo, items]) => (
              <div key={grupo}>
                <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border-y border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">{grupo}</p>
                </div>
                {items.map(m => (
                  <label key={m.id}
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition
                      ${dados.modeloId === m.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <input type="radio" name="modelo" value={m.id} checked={dados.modeloId === m.id}
                      onChange={() => setDados(d => ({ ...d, modeloId: m.id, modeloNome: m.nome, modeloPreco: m.preco, valorVenda: m.preco }))}
                      className="text-blue-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.nome}</p>
                      <p className="text-xs text-gray-400">{m.tipoCertificado}{!m.nome.toLowerCase().includes('sem mídia') ? ` · ${m.suporte}` : ''} · {m.validadeMeses} meses</p>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={() => setStep(3)} disabled={!dados.modeloId}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 3 — RESPONSÁVEL ════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">— Dados do Responsável</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo label="CPF do Responsável" required>
                <Input value={dados.cpfResponsavel} readOnly className="bg-gray-50 dark:bg-slate-600 cursor-not-allowed" />
              </Campo>
              <Campo label="Data Nasc. Responsável" required>
                <Input type="date"
                  value={dados.tipoPessoa === 'PF' ? dados.dataNascimento : dados.dataNasc}
                  onChange={e => dados.tipoPessoa === 'PF' ? set('dataNascimento', e.target.value) : set('dataNasc', e.target.value)} />
              </Campo>
              <Campo label="Nome do Responsável" required>
                <Input value={dados.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" />
              </Campo>
              <div className="sm:col-span-3 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Campo label="E-mail" required>
                    <Input type="email" value={dados.email} onChange={e => set('email', e.target.value)} />
                  </Campo>
                </div>
                <div className="w-full sm:w-20 shrink-0">
                  <Campo label="DDD" required>
                    <Input value={dados.ddd} onChange={e => {
                      const v = e.target.value.replace(/\D/g,'').slice(0,2)
                      set('ddd', v)
                      if (v.length === 2) telefoneRef.current?.focus()
                    }} placeholder="11" maxLength={2} required />
                  </Campo>
                </div>
                <div className="flex-1">
                  <Campo label="Telefone" required>
                    <Input ref={telefoneRef} value={dados.telefone} onChange={e => set('telefone', e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="999999999" maxLength={9} required />
                  </Campo>
                </div>
              </div>
              <Campo label="PIS/NIS">
                <Input value={dados.pisNis} onChange={e => set('pisNis', e.target.value)} placeholder="Opcional" />
              </Campo>
              <Campo label="CEI">
                <Input value={dados.cei} onChange={e => set('cei', e.target.value)} placeholder="Opcional" />
              </Campo>
              <Campo label="CAEPF">
                <Input value={dados.caepf} onChange={e => set('caepf', e.target.value)} placeholder="Opcional" />
              </Campo>
            </div>
          </div>

          {/* Endereço — só para PF */}
          {dados.tipoPessoa === 'PF' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">— Endereço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Campo label="CEP" required>
                  <Input value={dados.cep} maxLength={9} placeholder="00000-000"
                    onChange={e => { const v = fmtCEP(e.target.value); set('cep', v); buscarCep(v, 'resp') }} />
                  {buscandoCep && <span className="text-xs text-gray-400">buscando...</span>}
                </Campo>
                <div className="sm:col-span-2">
                  <Campo label="Endereço" required><Input value={dados.logradouro} onChange={e => set('logradouro', e.target.value)} /></Campo>
                </div>
                <Campo label="Número" required><Input value={dados.numero} onChange={e => set('numero', e.target.value)} /></Campo>
                <Campo label="Complemento"><Input value={dados.complemento} onChange={e => set('complemento', e.target.value)} /></Campo>
                <Campo label="Bairro"><Input value={dados.bairro} onChange={e => set('bairro', e.target.value)} /></Campo>
                <Campo label="Município" required><Input value={dados.municipio} onChange={e => set('municipio', e.target.value)} /></Campo>
                <Campo label="Estado" required><Input value={dados.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0,2))} maxLength={2} /></Campo>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={nextStep} disabled={!dados.nome || !dados.email || dados.ddd.length !== 2 || dados.telefone.length !== 9}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 4 — EMPRESA (PJ apenas) ════════════════════════ */}
      {step === 4 && dados.tipoPessoa === 'PJ' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">— Dados da Empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <Campo label="CNPJ" required>
                  <Input value={dados.cnpj} readOnly className="bg-gray-50 dark:bg-slate-600 cursor-not-allowed" />
                </Campo>
              </div>
              <div className="sm:col-span-2">
                <Campo label="Razão Social" required>
                  <Input value={dados.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} />
                </Campo>
              </div>
              <div className="sm:col-span-2">
                <Campo label="Nome Fantasia"><Input value={dados.fantasia} onChange={e => set('fantasia', e.target.value)} /></Campo>
              </div>
              <div className="sm:col-span-2">
                <Campo label="Responsável Contato"><Input value={dados.respContato} onChange={e => set('respContato', e.target.value)} /></Campo>
              </div>
              <Campo label="E-mail da Empresa" required><Input type="email" value={dados.emailEmpresa} onChange={e => set('emailEmpresa', e.target.value)} required /></Campo>
              <div className="flex gap-2 sm:col-span-2">
                <div className="w-20 shrink-0">
                  <Campo label="DDD" required>
                    <Input value={dados.dddEmpresa} onChange={e => {
                      const v = e.target.value.replace(/\D/g,'').slice(0,2)
                      set('dddEmpresa', v)
                      if (v.length === 2) telEmpresaRef.current?.focus()
                    }} placeholder="11" maxLength={2} required />
                  </Campo>
                </div>
                <div className="flex-1">
                  <Campo label="Telefone" required><Input ref={telEmpresaRef} value={dados.telEmpresa} onChange={e => set('telEmpresa', e.target.value.replace(/\D/g,'').slice(0,9))} maxLength={9} required /></Campo>
                </div>
              </div>
              <Campo label="Inscrição Estadual"><Input value={dados.ie} onChange={e => set('ie', e.target.value)} placeholder="Opcional" /></Campo>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-slate-700 pb-3">— Endereço da Empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Campo label="CEP" required>
                <Input value={dados.cepEmpresa} maxLength={9} placeholder="00000-000"
                  onChange={e => { const v = fmtCEP(e.target.value); set('cepEmpresa', v); buscarCep(v, 'emp') }} />
                {buscandoCepEmp && <span className="text-xs text-gray-400">buscando...</span>}
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Endereço" required><Input value={dados.logradouroEmpresa} onChange={e => set('logradouroEmpresa', e.target.value)} /></Campo>
              </div>
              <Campo label="Número" required><Input value={dados.numeroEmpresa} onChange={e => set('numeroEmpresa', e.target.value)} /></Campo>
              <Campo label="Complemento"><Input value={dados.complementoEmpresa} onChange={e => set('complementoEmpresa', e.target.value)} /></Campo>
              <Campo label="Bairro"><Input value={dados.bairroEmpresa} onChange={e => set('bairroEmpresa', e.target.value)} /></Campo>
              <Campo label="Município" required><Input value={dados.municipioEmpresa} onChange={e => set('municipioEmpresa', e.target.value)} /></Campo>
              <Campo label="Estado" required><Input value={dados.estadoEmpresa} onChange={e => set('estadoEmpresa', e.target.value.toUpperCase().slice(0,2))} maxLength={2} /></Campo>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={nextStep} disabled={!dados.cnpj || !dados.razaoSocial || !dados.emailEmpresa || dados.dddEmpresa.length !== 2 || dados.telEmpresa.length !== 9}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 5 — PAGAMENTO ══════════════════════════════════ */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Forma de Pagamento Principal</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Campo label="Parceiro indicador">
                <Sel value={dados.parceiroId} onChange={e => set('parceiroId', e.target.value)}>
                  <option value="">Nenhum</option>
                  {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Sel>
              </Campo>
              <Campo label="Voucher Safeweb">
                <Input value={dados.voucher} onChange={e => set('voucher', e.target.value)} placeholder="Código do voucher" />
              </Campo>
              <Campo label="Unidade de Atendimento">
                <Sel value={dados.unidadeAtendimento} onChange={e => set('unidadeAtendimento', e.target.value)}>
                  <option value="">— Selecionar —</option>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </Sel>
              </Campo>
              <Campo label="Valor da Venda (R$)" required>
                <Input type="number" step="0.01" min={0} value={dados.valorVenda}
                  disabled={dados.formaPagamento === 'Bonificado'}
                  onChange={e => set('valorVenda', Number(e.target.value))} />
              </Campo>
              <Campo label="Forma de Pagamento">
                <Sel value={dados.formaPagamento} onChange={e => {
                  const forma = e.target.value
                  // O financeiro identifica um pedido bonificado pelo valor final
                  // ser zero (src/lib/reconciliar-emitidos.ts), não pela forma de
                  // pagamento — por isso zerar aqui é obrigatório, senão o
                  // cliente acabaria sendo cobrado por um certificado que era
                  // pra ser de graça.
                  if (forma === 'Bonificado') set('valorVenda', 0)
                  set('formaPagamento', forma)
                }}>
                  {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                </Sel>
              </Campo>
              <Campo label="Tipo de Atendimento">
                <Sel value={dados.tipoAtendimento} onChange={e => set('tipoAtendimento', e.target.value)}>
                  <option value="videoconferencia">Videoconferência (Hope)</option>
                  <option value="presencial">Presencial (Gedar)</option>
                </Sel>
              </Campo>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <input type="checkbox" id="ext" checked={dados.atendimentoExterno}
                onChange={e => set('atendimentoExterno', e.target.checked)} className="w-4 h-4" />
              <label htmlFor="ext" className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer">Atendimento externo (deslocamento)</label>
              {dados.atendimentoExterno && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-500">R$</span>
                  <Input type="number" step="0.01" min={0} value={dados.valorDeslocamento}
                    onChange={e => set('valorDeslocamento', Number(e.target.value))} className="w-28" />
                </div>
              )}
            </div>

            <Campo label="Observações para o Financeiro">
              <textarea value={dados.observacoesFinanceiro} onChange={e => set('observacoesFinanceiro', e.target.value)}
                rows={2} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </Campo>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-teal-600">#Agendamento</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Campo label="AGR">
                <Sel value={dados.agr} onChange={e => set('agr', e.target.value)}>
                  {AGR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Sel>
              </Campo>
              <Campo label="Agendar">
                <Sel value={dados.agendar ? 'sim' : 'nao'} onChange={e => set('agendar', e.target.value === 'sim')}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Sel>
              </Campo>
              {dados.agendar && (
                <>
                  <Campo label="Data"><Input type="date" value={dados.dataAgendamento} onChange={e => set('dataAgendamento', e.target.value)} /></Campo>
                  <Campo label="Hora"><Input type="time" value={dados.horaAgendamento} onChange={e => set('horaAgendamento', e.target.value)} /></Campo>
                  <div className="sm:col-span-2">
                    <Campo label="Duração">
                      <Sel value={dados.duracaoAgendamento} onChange={e => set('duracaoAgendamento', Number(e.target.value))}>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>1 hora</option>
                      </Sel>
                    </Campo>
                  </div>
                  <div className="sm:col-span-2">
                    <Campo label="Observações do Agendamento">
                      <Input value={dados.observacoesAgendamento} onChange={e => set('observacoesAgendamento', e.target.value)} />
                    </Campo>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 space-y-1.5 text-sm">
            {[
              ['Certificado',  dados.modeloNome],
              ['Cliente',      dados.tipoPessoa === 'PJ' ? (dados.razaoSocial || dados.nomeEmpresa) : dados.nome],
              ['Atendimento',  dados.tipoAtendimento === 'videoconferencia' ? 'Videoconferência' : 'Presencial'],
              ['AGR',          AGR_OPTIONS.find(a => a.value === dados.agr)?.label ?? dados.agr],
              ['Unidade',      dados.unidadeAtendimento || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">{k}:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{v}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-slate-700">
              <span>Total:</span>
              <span className="text-blue-700 dark:text-blue-400">
                {fmt(dados.valorVenda + (dados.atendimentoExterno ? dados.valorDeslocamento : 0))}
              </span>
            </div>
          </div>

          {erroValidacao && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erroValidacao}</div>
          )}

          <div className="flex justify-between pb-6">
            <button onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={finalizar} disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? 'Gerando...' : 'Finalizar Pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
