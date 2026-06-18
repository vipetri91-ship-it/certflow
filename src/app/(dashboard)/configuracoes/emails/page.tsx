import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { EmailEditor } from './editor'
import { TIPO_EMAIL_LABELS } from '@/lib/email/tipos'

export default async function EmailsPage() {
  const desde90d = new Date(Date.now() - 90 * 86_400_000)

  const [templates, statsPorTipo] = await Promise.all([
    prisma.templateEmail.findMany({ orderBy: { tipo: 'asc' } }),
    prisma.emailLog.groupBy({
      by: ['tipo', 'status'],
      where: { createdAt: { gte: desde90d } },
      _count: { _all: true },
    }),
  ])

  const abertosPorTipo = await prisma.emailLog.groupBy({
    by: ['tipo'],
    where: { createdAt: { gte: desde90d }, abertoEm: { not: null } },
    _count: { _all: true },
  })
  const mapAbertos = Object.fromEntries(abertosPorTipo.map(a => [a.tipo, a._count._all]))

  const templateMap = Object.fromEntries(templates.map(t => [t.tipo, t]))

  const dados = Object.entries(TIPO_EMAIL_LABELS).map(([tipo, info]) => {
    const t = templateMap[tipo]
    const enviados = statsPorTipo.filter(s => s.tipo === tipo && s.status === 'ENVIADO').reduce((s, r) => s + r._count._all, 0)
    const erros    = statsPorTipo.filter(s => s.tipo === tipo && s.status === 'ERRO').reduce((s, r) => s + r._count._all, 0)
    const abertos  = mapAbertos[tipo] ?? 0
    return {
      tipo,
      label: info.label,
      desc: info.desc,
      icone: info.icone,
      assunto: t?.assunto ?? '',
      corpo: t?.corpo ?? '',
      ativo: t?.ativo ?? false,
      existe: !!t,
      enviados,
      erros,
      abertos,
      taxaAbertura: enviados > 0 ? Math.round((abertos / enviados) * 100) : null,
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
            Estatísticas dos últimos 90 dias.
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
