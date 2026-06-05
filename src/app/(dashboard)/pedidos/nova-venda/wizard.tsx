'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Loader2, ChevronRight, ChevronLeft, User, Building2,
  AlertTriangle, Search, Award, CreditCard, Calendar, History,
} from 'lucide-react'

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

const INITIAL = (defaultAgr: string): WizardDados => ({
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
  dataAgendamento: new Date().toISOString().split('T')[0], horaAgendamento: '09:00',
  duracaoAgendamento: 20, observacoesFinanceiro: '', observacoesAgendamento: '',
})

const AGR_OPTIONS = [
  { value: 'vinicius',     label: 'Vinicius' },
  { value: 'arlen',        label: 'Arlen' },
  { value: 'ana.karolina', label: 'Ana Karolina' },
  { value: 'laryssa',      label: 'Laryssa' },
]
const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Safe2Pay']
const UNIDADES = ['Piracaia', 'Bragança Paulista']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt     = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtCPF  = (v: string) => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4').replace(/-$/,'')
const fmtCNPJ = (v: string) => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,'$1.$2.$3/$4-$5').replace(/-$/,'')
const fmtCEP  = (v: string) => v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d{0,3})/,'$1-$2').replace(/-$/,'')
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

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
function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${cls} ${className}`} {...props} />
}
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
  const [pedidoCriado,    setPedidoCriado]    = useState<{ id: string; numero: string; safewebProtocolo?: string | null } | null>(null)
  const [protocolo,       setProtocolo]       = useState('')
  const [salvandoProt,    setSalvandoProt]    = useState(false)

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
  async function validarCNPJ() {
    const cnpj = dados.cnpj.replace(/\D/g,'')
    if (cnpj.length !== 14) { setErroValidacao('CNPJ deve ter 14 dígitos'); return }
    setLoading(true); setErroValidacao('')
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`)
      const data = await res.json()
      if (!res.ok) { setErroValidacao(data.erro ?? 'CNPJ não encontrado'); return }

      const cpfNums = dados.cpfResponsavel.replace(/\D/g,'')
      let nomeRfb: string | undefined
      if (cpfNums.length === 11 && data.qsa?.length > 0) {
        const cpfUltimos = cpfNums.slice(-8, -2)
        const socios = data.qsa as { nome: string; cpfMascarado: string }[]
        const match = socios.find(s => s.cpfMascarado?.includes(cpfUltimos))
        if (!match) {
          setErroValidacao('Código: 27 - O CPF do responsável não corresponde ao responsável na RFB.')
          return
        }
        nomeRfb = match.nome
      }

      const clienteId = data.clienteExistente?.id ?? ''

      setDados(d => ({
        ...d,
        nomeEmpresa:      data.razaoSocial ?? data.nomeFantasia ?? '',
        razaoSocial:      data.razaoSocial ?? '',
        fantasia:         data.nomeFantasia ?? '',
        nomeResponsavel:  nomeRfb ?? data.clienteExistente?.responsavel ?? d.nomeResponsavel,
        clienteId,
        nome:             data.clienteExistente?.responsavel ?? nomeRfb ?? d.nome,
        email:       data.clienteExistente?.email ?? d.email,
        ddd:         data.clienteExistente?.ddd ?? d.ddd,
        telefone:    data.clienteExistente?.celular ?? d.telefone,
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
    } catch { setErroValidacao('Erro de conexão') }
    finally { setLoading(false) }
  }

  async function buscarClientePorCPF() {
    const cpf = dados.cpfResponsavel.replace(/\D/g,'')
    if (cpf.length !== 11) return
    try {
      const res = await fetch(`/api/clientes?q=${cpf}&limit=1`)
      const data = await res.json()
      const c = data.clientes?.[0]
      if (c?.cpf === cpf) {
        setDados(d => ({
          ...d,
          // Para PF: preenche clienteId e todos os dados
          ...(d.tipoPessoa === 'PF' ? { clienteId: c.id, validado: true } : {}),
          // Para ambos: preenche nome responsável e data de nascimento
          nomeResponsavel: c.nome ?? d.nomeResponsavel,
          nome:            c.nome ?? d.nome,
          dataNascimento:  c.dataNascimento ? c.dataNascimento.split('T')[0] : d.dataNascimento,
          dataNasc:        c.dataNascimento ? c.dataNascimento.split('T')[0] : d.dataNasc,
          email:     c.email    ?? d.email,
          ddd:       c.ddd      ?? d.ddd,
          telefone:  c.celular  ?? d.telefone,
          pisNis:    c.pisNis   ?? d.pisNis,
          cep:       c.cep      ? fmtCEP(c.cep) : d.cep,
          logradouro: c.logradouro ?? d.logradouro,
          numero:    c.numero   ?? d.numero,
          bairro:    c.bairro   ?? d.bairro,
          municipio: c.cidade   ?? d.municipio,
          estado:    c.estado   ?? d.estado,
        }))
        if (c.tipoPessoa === 'PF') {
          fetch(`/api/pedidos?clienteId=${c.id}&limit=5`)
            .then(r => r.json()).then(d => setHistorico(d.pedidos ?? [])).catch(() => {})
        }
      }
    } catch {}
  }

  async function validarPF() {
    const cpf = dados.cpfResponsavel.replace(/\D/g,'')
    if (cpf.length !== 11) { setErroValidacao('CPF inválido'); return }
    if (!dados.dataNascimento) { setErroValidacao('Data de nascimento obrigatória'); return }
    setLoading(true); setErroValidacao('')
    try {
      const res = await fetch(`/api/clientes?q=${cpf}&limit=1`)
      const data = await res.json()
      const c = data.clientes?.[0]
      if (c?.cpf === cpf) {
        setDados(d => ({
          ...d,
          clienteId:       c.id,
          validado:        true,
          nomeResponsavel: c.nome ?? d.nomeResponsavel,
          nome:            c.nome ?? d.nome,
          dataNascimento:  c.dataNascimento ? c.dataNascimento.split('T')[0] : d.dataNascimento,
          email:           c.email    ?? d.email,
          ddd:             c.ddd      ?? d.ddd,
          telefone:        c.celular  ?? d.telefone,
          pisNis:          c.pisNis   ?? d.pisNis,
          cep:             c.cep      ? fmtCEP(c.cep) : d.cep,
          logradouro:      c.logradouro ?? d.logradouro,
          numero:          c.numero   ?? d.numero,
          bairro:          c.bairro   ?? d.bairro,
          municipio:       c.cidade   ?? d.municipio,
          estado:          c.estado   ?? d.estado,
        }))
        fetch(`/api/pedidos?clienteId=${c.id}&limit=5`)
          .then(r => r.json()).then(d => setHistorico(d.pedidos ?? [])).catch(() => {})
      } else {
        setDados(d => ({ ...d, validado: true }))
      }
    } catch { setDados(d => ({ ...d, validado: true })) }
    finally { setLoading(false) }
    setStep(2)
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
    } catch {}
    tipo === 'resp' ? setBuscandoCep(false) : setBuscandoCepEmp(false)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function finalizar() {
    setLoading(true); setErroValidacao('')
    try {
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
          cpf:           isPJ ? undefined : dados.cpf.replace(/\D/g,''),
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
          data: dados.dataAgendamento, hora: dados.horaAgendamento, duracao: dados.duracaoAgendamento,
        } : undefined,
      }

      const res = await fetch('/api/pedidos/nova-venda', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) { setErroValidacao(result.erro ?? 'Erro ao criar pedido'); return }
      setPedidoCriado({ id: result.id, numero: result.numero, safewebProtocolo: result.safewebProtocolo })
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
                Videoconferência agendada e vinculada ao Hope Portal
              </p>
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
                    placeholder="00.000.000/0000-00" maxLength={18} />
                </Campo>
              )}
              <Campo label={dados.tipoPessoa === 'PJ' ? 'CPF do Responsável' : 'CPF'} required>
                <Input value={dados.cpfResponsavel}
                  onChange={e => { set('cpfResponsavel', fmtCPF(e.target.value)); set('validado', false) }}
                  onBlur={() => buscarClientePorCPF()}
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
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                <strong>{dados.nomeResponsavel}</strong>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
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
                      <p className="text-xs text-gray-400">{m.tipoCertificado} · {m.suporte} · {m.validadeMeses} meses</p>
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
              <Campo label="E-mail" required>
                <Input type="email" value={dados.email} onChange={e => set('email', e.target.value)} />
              </Campo>
              <div className="flex gap-2 sm:col-span-2">
                <div className="w-20 shrink-0">
                  <Campo label="DDD">
                    <Input value={dados.ddd} onChange={e => set('ddd', e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="11" maxLength={2} />
                  </Campo>
                </div>
                <div className="flex-1">
                  <Campo label="Telefone">
                    <Input value={dados.telefone} onChange={e => set('telefone', e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="999999999" maxLength={9} />
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
            <button onClick={nextStep} disabled={!dados.nome || !dados.email}
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
              <Campo label="E-mail da Empresa"><Input type="email" value={dados.emailEmpresa} onChange={e => set('emailEmpresa', e.target.value)} /></Campo>
              <div className="flex gap-2 sm:col-span-2">
                <div className="w-20 shrink-0">
                  <Campo label="DDD"><Input value={dados.dddEmpresa} onChange={e => set('dddEmpresa', e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="11" maxLength={2} /></Campo>
                </div>
                <div className="flex-1">
                  <Campo label="Telefone"><Input value={dados.telEmpresa} onChange={e => set('telEmpresa', e.target.value.replace(/\D/g,'').slice(0,9))} maxLength={9} /></Campo>
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
            <button onClick={nextStep} disabled={!dados.cnpj || !dados.razaoSocial}
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
              <Campo label="Contabilidade / Parceiro">
                <Input value={dados.contabilidade} onChange={e => set('contabilidade', e.target.value)} placeholder="Nome do escritório..." />
              </Campo>
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
                  onChange={e => set('valorVenda', Number(e.target.value))} />
              </Campo>
              <Campo label="Forma de Pagamento">
                <Sel value={dados.formaPagamento} onChange={e => set('formaPagamento', e.target.value)}>
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
