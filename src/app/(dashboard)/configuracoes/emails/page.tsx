import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { EmailEditor } from './editor'

const TIPO_LABELS: Record<string, { label: string; desc: string; icone: string }> = {
  VENCIMENTO_60: { label: '60 dias antes do vencimento', desc: 'Aviso antecipado para planejar renovação', icone: '📅' },
  VENCIMENTO_30: { label: '30 dias antes do vencimento', desc: 'Lembrete de renovação próxima', icone: '⏰' },
  VENCIMENTO_15: { label: '15 dias antes do vencimento', desc: 'Alerta urgente de vencimento', icone: '⚠️' },
  VENCIMENTO_7:  { label: '7 dias antes do vencimento',  desc: 'Aviso crítico — último chamado', icone: '🚨' },
  POS_EMISSAO:   { label: 'Após emissão do certificado', desc: 'Boas-vindas e orientações de uso', icone: '✅' },
  NUTRICAO_3M:   { label: '3 meses após emissão',        desc: 'Dicas e benefícios do certificado digital', icone: '💡' },
  NUTRICAO_6M:   { label: '6 meses após emissão',        desc: 'Segurança e boas práticas', icone: '🔒' },
  NUTRICAO_9M:   { label: '9 meses após emissão',        desc: 'Planejamento de renovação', icone: '🔄' },
}

export default async function EmailsPage() {
  const templates = await prisma.templateEmail.findMany({ orderBy: { tipo: 'asc' } })

  const templateMap = Object.fromEntries(templates.map(t => [t.tipo, t]))

  const dados = Object.entries(TIPO_LABELS).map(([tipo, info]) => {
    const t = templateMap[tipo]
    return {
      tipo,
      label: info.label,
      desc: info.desc,
      icone: info.icone,
      assunto: t?.assunto ?? '',
      corpo: t?.corpo ?? '',
      ativo: t?.ativo ?? false,
      existe: !!t,
    }
  })

  const ativos = dados.filter(d => d.ativo).length

  return (
    <div>
      <Header titulo="Automação de E-mails" />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>{ativos} de {dados.length}</strong> templates ativos.
            O job <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">/api/jobs/processar-emails</code> processa os envios diariamente.
          </p>
        </div>

        <div className="grid gap-4">
          {dados.map(d => (
            <EmailEditor key={d.tipo} template={d} />
          ))}
        </div>
      </div>
    </div>
  )
}
