import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'

const TIPO_LABELS: Record<string, { label: string; desc: string }> = {
  VENCIMENTO_60: { label: '60 dias antes do vencimento', desc: 'Aviso antecipado para planejar renovação' },
  VENCIMENTO_30: { label: '30 dias antes do vencimento', desc: 'Lembrete de renovação próxima' },
  VENCIMENTO_15: { label: '15 dias antes do vencimento', desc: 'Alerta urgente de vencimento' },
  VENCIMENTO_7: { label: '7 dias antes do vencimento', desc: 'Aviso crítico — último chamado' },
  POS_EMISSAO: { label: 'Após emissão do certificado', desc: 'Boas-vindas e orientações de uso' },
  NUTRICAO_3M: { label: '3 meses após emissão', desc: 'Dicas e benefícios do certificado digital' },
  NUTRICAO_6M: { label: '6 meses após emissão', desc: 'Segurança e boas práticas' },
  NUTRICAO_9M: { label: '9 meses após emissão', desc: 'Planejamento de renovação' },
}

export default async function EmailsPage() {
  const templates = await prisma.templateEmail.findMany({ orderBy: { tipo: 'asc' } })

  return (
    <div>
      <Header titulo="Automação de E-mails" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Configure os templates dos e-mails automáticos enviados aos clientes.
          O sistema dispara os e-mails diariamente através do job <code className="bg-gray-100 px-1 rounded text-xs">/api/jobs/processar-emails</code>.
        </p>

        <div className="grid gap-4">
          {Object.entries(TIPO_LABELS).map(([tipo, info]) => {
            const template = templates.find((t) => t.tipo === tipo)
            return (
              <div key={tipo} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{info.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{info.desc}</p>
                    {template && (
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-medium">Assunto:</span> {template.assunto}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        template?.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {template?.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <button className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}