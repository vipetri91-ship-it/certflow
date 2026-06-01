'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  id:           string
  createdAt:    string
  acao:         string
  entidade:     string
  entidadeId:   string | null
  dados:        Record<string, unknown> | null
  usuarioNome:  string | null
  usuarioEmail: string | null
  acaoCor:      string
  dataHora:     string
}

const VERBOS: Record<string, string> = {
  CREATE: 'criou',
  UPDATE: 'alterou',
  DELETE: 'removeu',
  LOGIN:  'fez login',
  LOGOUT: 'saiu do sistema',
  VIEW:   'visualizou',
}

const ENTIDADES: Record<string, string> = {
  Pedido:       'o pedido',
  Cliente:      'o cliente',
  Parceiro:     'o parceiro',
  Lancamento:   'o lançamento',
  Usuario:      'o usuário',
  Certificado:  'o certificado',
  Modelo:       'o modelo',
  Configuracao: 'a configuração',
  Noticia:      'a notícia',
  SSTLead:      'o lead SST',
  AgendaEvento: 'o evento da agenda',
  Orcamento:    'o orçamento',
}

function gerarDescricao(props: Props): string {
  const primeiroNome = props.usuarioNome?.split(' ')[0] ?? 'Sistema'
  const d = props.dados

  if (props.acao === 'LOGIN')  return `${primeiroNome} fez login no sistema`
  if (props.acao === 'LOGOUT') return `${primeiroNome} saiu do sistema`

  const verbo   = VERBOS[props.acao]  ?? props.acao.toLowerCase()
  const entidade = ENTIDADES[props.entidade] ?? props.entidade.toLowerCase()

  // Tenta extrair um nome/identificador dos dados
  let detalhe = ''
  if (d) {
    if (d.numero)      detalhe = `#${d.numero}`
    else if (d.nome)   detalhe = `"${d.nome}"`
    else if (d.descricao) detalhe = `"${String(d.descricao).slice(0, 40)}"`
    else if (d.titulo) detalhe = `"${d.titulo}"`
    else if (d.valor)  detalhe = `de R$ ${Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    else if (d.valorFinal) detalhe = `de R$ ${Number(d.valorFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    else if (d.cliente) detalhe = `de "${d.cliente}"`
  }

  return `${primeiroNome} ${verbo} ${entidade}${detalhe ? ` ${detalhe}` : ''}`
}

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (typeof v === 'number') return v.toLocaleString('pt-BR')
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  const s = String(v)
  // Tenta detectar data ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return s
}

const CAMPOS_LEGÍVEIS: Record<string, string> = {
  nome: 'Nome', email: 'E-mail', telefone: 'Telefone', celular: 'Celular',
  cpf: 'CPF', cnpj: 'CNPJ', status: 'Status', valor: 'Valor', valorFinal: 'Valor Final',
  valorTotal: 'Valor Total', desconto: 'Desconto', formaPagamento: 'Forma de Pagamento',
  numero: 'Número', agr: 'AGR', tipoAtendimento: 'Tipo de Atendimento', cliente: 'Cliente',
  descricao: 'Descrição', dataVencimento: 'Data de Vencimento', tipo: 'Tipo',
  razaoSocial: 'Razão Social', nomeFantasia: 'Nome Fantasia', cidade: 'Cidade',
  estado: 'Estado', responsavel: 'Responsável', titulo: 'Título', publicada: 'Publicada',
  role: 'Perfil', ativo: 'Ativo', grupo: 'Grupo', etapa: 'Etapa',
}

export function AuditoriaLinha(props: Props) {
  const [aberto, setAberto] = useState(false)
  const descricao = gerarDescricao(props)
  const temDados  = props.dados && Object.keys(props.dados).length > 0

  return (
    <>
      <tr
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${aberto ? 'bg-blue-50/50' : ''}`}
        onClick={() => temDados && setAberto(o => !o)}
      >
        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap align-top pt-3.5">{props.dataHora}</td>
        <td className="px-4 py-3 text-center align-top pt-3.5">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${props.acaoCor}`}>
            {props.acao}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-gray-800">{descricao}</p>
          {props.usuarioEmail && (
            <p className="text-xs text-gray-400 mt-0.5">{props.usuarioEmail}</p>
          )}
        </td>
        <td className="px-4 py-3 text-center align-top pt-3.5">
          {temDados && (
            aberto
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </td>
      </tr>

      {/* Painel de detalhes */}
      {aberto && temDados && (
        <tr className="bg-blue-50/30">
          <td colSpan={4} className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Detalhes do registro</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(props.dados!).map(([chave, valor]) => (
                <div key={chave} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">
                    {CAMPOS_LEGÍVEIS[chave] ?? chave}
                  </p>
                  <p className="text-sm text-gray-800 break-words">{formatarValor(valor)}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}