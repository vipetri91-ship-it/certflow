import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { RenovacoesLista } from './lista'

interface SearchParams { mes?: string; ano?: string; faixa?: string }
interface Props { searchParams: Promise<SearchParams> }

function diasRestantes(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export default async function RenovacoesPage({ searchParams }: Props) {
  const sp = await searchParams
  const hoje = new Date()
  const mesAtual = hoje.getMonth()
  const anoAtual = hoje.getFullYear()

  const mes = sp.mes !== undefined ? parseInt(sp.mes) : mesAtual
  const ano = sp.ano !== undefined ? parseInt(sp.ano) : anoAtual

  const inicioMes = new Date(ano, mes, 1)
  const fimMes    = new Date(ano, mes + 1, 0, 23, 59, 59)

  const include = {
    cliente: {
      select: {
        id: true, nome: true, email: true, celular: true, telefone: true,
        cpf: true, cnpj: true, razaoSocial: true, responsavel: true, tipoPessoa: true, grupo: true,
        parceiro: { select: { nome: true, razaoSocial: true, celular: true, telefone: true } },
      },
    },
    modelo:  { select: { nome: true, tipoPessoa: true, tipoCertificado: true } },
    pedido:  { select: { agr: true, numero: true } },
  }

  const [certificadosMes, vencidos] = await Promise.all([
    prisma.certificado.findMany({
      where: { status: 'ATIVO', dataVencimento: { gte: inicioMes, lte: fimMes } },
      include,
      orderBy: { dataVencimento: 'asc' },
    }),
    prisma.certificado.findMany({
      where: { status: 'ATIVO', dataVencimento: { lt: hoje } },
      include,
      orderBy: { dataVencimento: 'asc' },
      take: 200,
    }),
  ])

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  // Dados para o componente cliente
  const certsMes = certificadosMes.map(c => ({
    ...c,
    dataVencimento: c.dataVencimento.toISOString(),
    dataEmissao: c.dataEmissao.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    diasRestantes: diasRestantes(c.dataVencimento),
    cliente: {
      ...c.cliente,
      cpf: c.cliente.cpf ?? null,
      cnpj: c.cliente.cnpj ?? null,
      email: c.cliente.email ?? null,
      celular: c.cliente.celular ?? null,
      telefone: c.cliente.telefone ?? null,
      razaoSocial: c.cliente.razaoSocial ?? null,
      responsavel: c.cliente.responsavel ?? null,
      grupo:       c.cliente.grupo       ?? null,
      parceiro: c.cliente.parceiro ? {
        nome: c.cliente.parceiro.nome,
        razaoSocial: c.cliente.parceiro.razaoSocial ?? null,
        celular: c.cliente.parceiro.celular ?? null,
        telefone: c.cliente.parceiro.telefone ?? null,
      } : null,
    },
    pedido: c.pedido ? { agr: c.pedido.agr, numero: c.pedido.numero } : null,
  }))

  const certsVencidos = vencidos.map(c => ({
    ...c,
    dataVencimento: c.dataVencimento.toISOString(),
    dataEmissao: c.dataEmissao.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    diasRestantes: diasRestantes(c.dataVencimento),
    cliente: {
      ...c.cliente,
      cpf: c.cliente.cpf ?? null,
      cnpj: c.cliente.cnpj ?? null,
      email: c.cliente.email ?? null,
      celular: c.cliente.celular ?? null,
      telefone: c.cliente.telefone ?? null,
      razaoSocial: c.cliente.razaoSocial ?? null,
      responsavel: c.cliente.responsavel ?? null,
      grupo:       c.cliente.grupo       ?? null,
      parceiro: c.cliente.parceiro ? {
        nome: c.cliente.parceiro.nome,
        razaoSocial: c.cliente.parceiro.razaoSocial ?? null,
        celular: c.cliente.parceiro.celular ?? null,
        telefone: c.cliente.parceiro.telefone ?? null,
      } : null,
    },
    pedido: c.pedido ? { agr: c.pedido.agr, numero: c.pedido.numero } : null,
  }))

  const em7  = certsMes.filter(c => c.diasRestantes >= 0 && c.diasRestantes <= 7)
  const em15 = certsMes.filter(c => c.diasRestantes > 7 && c.diasRestantes <= 15)
  const em30 = certsMes.filter(c => c.diasRestantes > 15 && c.diasRestantes <= 30)
  const resto = certsMes.filter(c => c.diasRestantes > 30)

  return (
    <div>
      <Header titulo="Renovações" />
      <RenovacoesLista
        mes={mes}
        ano={ano}
        mesNome={MESES[mes]}
        vencidos={certsVencidos}
        em7={em7}
        em15={em15}
        em30={em30}
        resto={resto}
        faixaInicial={sp.faixa ?? 'todas'}
      />
    </div>
  )
}