import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'

const CORES_CATEGORIA: Record<string, string> = {
  'Avisos':         'bg-blue-100 text-blue-700',
  'Legislação':     'bg-purple-100 text-purple-700',
  'Novos Serviços': 'bg-green-100 text-green-700',
  'Promoções':      'bg-orange-100 text-orange-700',
}

function fmtData(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function parseBold(text: string): React.ReactNode {
  const partes = text.split(/\*\*(.*?)\*\*/)
  return partes.map((p, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{p}</strong> : p)
}

function renderMarkdown(text: string) {
  return text.split('\n').map((linha, i) => {
    if (linha.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-1">{linha.slice(3)}</h2>
    if (linha.startsWith('# '))  return <h1 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-1">{linha.slice(2)}</h1>
    if (linha.startsWith('- ') || linha.startsWith('• '))
      return <p key={i} className="text-sm text-gray-700 pl-3 leading-relaxed before:content-['•'] before:mr-2 before:text-gray-400">{parseBold(linha.slice(2))}</p>
    if (linha.trim() === '') return <div key={i} className="h-2" />
    return <p key={i} className="text-sm text-gray-700 leading-relaxed">{parseBold(linha)}</p>
  })
}

export default async function PortalNoticiasPage() {
  const parceiro = await getPortalSession()
  if (!parceiro) redirect('/portal/login')

  const noticias = await prisma.noticia.findMany({
    where: { publicada: true },
    orderBy: [{ fixada: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notícias & Comunicados</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fique por dentro das novidades da V&G Certificação Digital</p>
      </div>

      {noticias.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Nenhum comunicado publicado ainda</p>
          <p className="text-sm mt-1">Em breve publicaremos novidades por aqui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {noticias.map(n => (
            <details key={n.id}
              className={cn(
                'group bg-white rounded-2xl border shadow-sm overflow-hidden transition-all',
                n.fixada ? 'border-blue-200' : 'border-gray-100'
              )}>
              <summary className="flex items-start gap-3 px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50/60 transition">
                {n.fixada && <Pin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-1 rotate-45" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', CORES_CATEGORIA[n.categoria] ?? 'bg-gray-100 text-gray-600')}>
                      {n.categoria}
                    </span>
                    {n.fixada && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        Em destaque
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm leading-snug">{n.titulo}</p>
                  {n.resumo && <p className="text-xs text-gray-500 mt-0.5">{n.resumo}</p>}
                  <p className="text-[11px] text-gray-400 mt-1.5">{fmtData(n.createdAt)}</p>
                </div>
                <span className="text-gray-400 text-xs shrink-0 mt-1 group-open:rotate-90 transition-transform">▶</span>
              </summary>

              <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-1">
                {renderMarkdown(n.conteudo)}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}