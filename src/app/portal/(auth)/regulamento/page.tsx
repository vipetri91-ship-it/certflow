import { getPortalSession } from '@/lib/portal-session'
import { redirect } from 'next/navigation'

export default async function RegulamentoPage() {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')

  const nomeExibicao = parceiro.nomeFantasia || parceiro.razaoSocial || parceiro.nome

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Regulamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">Portal V&G Certificação Digital</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
        <p className="font-medium">Olá, {nomeExibicao},</p>

        <p><strong>Seja bem-vindo ao Portal de Parceiros da V&G Certificação Digital!</strong></p>

        <p>Esta campanha é voltada a parceiros, visando premiar por meio de comissão a indicação de Certificado Digital.</p>

        <p>
          A comissão será gerenciada através deste portal, onde você pode acompanhar suas indicações,
          verificar o status dos certificados emitidos e acompanhar seus ganhos em tempo real.
        </p>

        <p>
          O pagamento é realizado após a análise e verificação da solicitação. O pagamento é efetuado ao
          parceiro responsável pelo cadastro até o dia <strong>15 de cada mês</strong>.
        </p>

        <p>
          A comissão fica disponível no portal, podendo o parceiro solicitar a qualquer momento o resgate
          dos valores em múltiplos de <strong>R$ 200,00</strong>.
        </p>

        <p>
          Após <strong>6 meses</strong> sem nenhuma nova indicação, o saldo de comissão total será dado
          como expirado, impossibilitando o resgate do valor acumulado.
        </p>

        <hr className="border-gray-100" />

        <p className="font-semibold text-gray-800">Benefícios:</p>

        <ul className="list-disc pl-5 space-y-2">
          <li>
            A partir de <strong>5 indicações nos últimos 12 meses</strong>, o parceiro adquire o privilégio
            de solicitar um Certificado Digital e-CPF ou e-CNPJ (A1 com validade de 12 meses) naquele ano.
          </li>
          <li>
            O portal controla os vencimentos dos certificados dos clientes, com alerta de vencimento
            e envio de e-mail automático para renovação.
          </li>
          <li>
            Você tem acesso ao relatório de certificados dos seus clientes que estão para vencer,
            facilitando a abordagem para renovação.
          </li>
        </ul>

        <hr className="border-gray-100" />

        <p className="font-semibold text-gray-800">Dúvidas?</p>
        <p>
          Entre em contato com a equipe da V&G Certificação Digital. Estamos sempre prontos para ajudar!
        </p>
      </div>
    </div>
  )
}
