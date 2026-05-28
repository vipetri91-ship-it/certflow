import { getPortalSession } from '@/lib/portal-session'
import { redirect } from 'next/navigation'

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || '—'}</p>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-3">{titulo}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

function fmt(v?: string | null) {
  if (!v) return undefined
  // formata CPF
  if (/^\d{11}$/.test(v)) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  // formata CNPJ
  if (/^\d{14}$/.test(v)) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v
}

export default async function CadastroPage() {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {parceiro.nomeFantasia || parceiro.razaoSocial || parceiro.nome}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Seus dados cadastrais</p>
      </div>

      <Secao titulo="Identificação">
        <Campo label="Razão Social" value={parceiro.razaoSocial} />
        <Campo label="Nome Fantasia" value={parceiro.nomeFantasia} />
        <Campo label="CNPJ" value={fmt(parceiro.cnpj)} />
        <Campo label="CPF" value={fmt(parceiro.cpf)} />
      </Secao>

      <Secao titulo="Contato">
        <Campo label="E-mail" value={parceiro.email} />
        <Campo label="Celular" value={parceiro.celular} />
        <Campo label="Telefone" value={parceiro.telefone} />
        <Campo label="Contador Responsável" value={parceiro.contadorResponsavel} />
        <Campo label="Pessoa de Contato" value={parceiro.pessoaContato} />
      </Secao>

      {(parceiro.banco || parceiro.chavePix) && (
        <Secao titulo="Dados Bancários">
          <Campo label="Banco" value={parceiro.banco} />
          <Campo label="Agência" value={parceiro.agencia} />
          <Campo label="Conta" value={parceiro.conta ? `${parceiro.conta} (${parceiro.tipoConta ?? ''})` : undefined} />
          <Campo label="Chave Pix" value={parceiro.chavePix} />
        </Secao>
      )}
    </div>
  )
}
