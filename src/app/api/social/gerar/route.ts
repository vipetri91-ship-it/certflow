import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Grade de categorias ───────────────────────────────────────────────────────

const CATEGORIAS = [
  'EDUCATIVO',
  'BENEFICIO',
  'CTA',
  'SEGMENTO',
  'DICA_SEGURANCA',
  'DATA_EVENTO',
] as const

type Categoria = typeof CATEGORIAS[number]

const DIAS = ['SEGUNDA', 'QUARTA', 'SEXTA'] as const

const DESCRICOES: Record<Categoria, string> = {
  EDUCATIVO:      'Explique de forma simples o que é certificado digital, tipos (e-CPF, e-CNPJ, A1, A3) ou como funciona o processo',
  BENEFICIO:      'Destaque um benefício prático do certificado digital: assinar contratos, emitir NF-e, acessar e-CAC, poupar tempo, mobilidade',
  CTA:            'Chamada direta e urgente para emitir ou renovar o certificado digital com a V&G. Transmita facilidade e rapidez',
  SEGMENTO:       'Post direcionado a um público específico: contadores, advogados, empresas, agricultores/agro, MEI ou autônomos',
  DICA_SEGURANCA: 'Dica prática sobre segurança digital: como proteger o certificado, evitar fraudes, armazenar com segurança',
  DATA_EVENTO:    'Post relacionado a uma data comemorativa relevante para o público empresarial/profissional',
}

// ── Datas comemorativas relevantes ───────────────────────────────────────────

function dataComemoratica(hoje: Date): string | null {
  const m = hoje.getMonth() + 1
  const d = hoje.getDate()
  const datas: Record<string, string> = {
    '3-22':  'Dia do Contador',
    '5-1':   'Dia do Trabalhador',
    '5-25':  'Dia da Mulher Empreendedora',
    '6-12':  'Dia dos Namorados (aproveite para falar de facilidade digital)',
    '8-11':  'Dia do Advogado',
    '9-7':   'Dia da Independência do Brasil',
    '10-7':  'Dia do Empresário',
    '11-5':  'Dia do Profissional de TI',
    '12-31': 'Virada do Ano — balanço e planejamento',
  }
  return datas[`${m}-${d}`] ?? null
}

// ── Determinar categoria da vez ───────────────────────────────────────────────

async function determinarCategoria(diaSemana: string, hoje: Date): Promise<Categoria> {
  // Se é dia de DATA_EVENTO e tem data comemorativa próxima → prioriza
  const data = dataComemoratica(hoje)
  if (data && diaSemana === 'SEXTA') return 'DATA_EVENTO'

  // Conta posts por categoria para balancear
  const contagens = await prisma.postSocial.groupBy({
    by: ['categoria'],
    _count: { categoria: true },
  })
  const mapa: Record<string, number> = {}
  for (const c of contagens) mapa[c.categoria] = c._count.categoria

  // Escolhe a categoria com menos posts (excluindo DATA_EVENTO que é contextual)
  const candidatas = CATEGORIAS.filter(c => c !== 'DATA_EVENTO')
  return candidatas.reduce((min, c) => (mapa[c] ?? 0) < (mapa[min] ?? 0) ? c : min)
}

// ── Geração de conteúdo com IA ────────────────────────────────────────────────

async function gerarConteudo(categoria: Categoria, diaSemana: string, hoje: Date) {
  const dataComem = dataComemoratica(hoje)
  const dataStr   = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const instrucaoCategoria = categoria === 'DATA_EVENTO' && dataComem
    ? `Crie um post comemorativo para o "${dataComem}" conectando com certificado digital da V&G.`
    : DESCRICOES[categoria]

  const prompt = `Você é especialista em marketing digital para a V&G Certificação Digital (@vegcertificadora).

EMPRESA: V&G Certificação Digital — AR Safeweb em Piracaia/SP e Bragança Paulista/SP
SERVIÇOS: e-CPF, e-CNPJ, certificados A1 e A3, Token, Smart Card, videoconferência
CONTATO: (11) 93332-3003 | vegcertificadora.com.br
DATA: ${dataStr} (${diaSemana})

CATEGORIA DO POST: ${instrucaoCategoria}

ESTILO VISUAL: O post terá POUQUÍSSIMO texto na imagem — apenas o headline. O conteúdo vai na legenda.

Gere o conteúdo em JSON com este formato exato:
{
  "headline": "Frase curta e impactante para a imagem (máximo 6 palavras, pode ter palavra-chave em CAPS)",
  "legenda": "Legenda completa para Instagram/Facebook/LinkedIn (3-5 parágrafos, linguagem profissional mas acessível, com emojis moderados, inclui CTA no final)",
  "hashtags": "#hashtag1 #hashtag2 ... (10-15 hashtags relevantes)"
}

Retorne APENAS o JSON, sem explicações.`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const texto = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  return JSON.parse(texto.replace(/```json|```/g, '').trim())
}

// ── Enviar pelo Telegram ──────────────────────────────────────────────────────

async function notificarTelegram(post: {
  id: string; categoria: string; diaSemana: string
  headline: string; legenda: string; hashtags: string
}) {
  const token   = process.env.TELEGRAM_BOT_TOKEN
  const chatId  = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) return

  const labels: Record<string, string> = {
    EDUCATIVO: '📚 Educativo', BENEFICIO: '💼 Benefício', CTA: '🎯 CTA Direto',
    SEGMENTO: '🏢 Segmento', DICA_SEGURANCA: '💡 Dica de Segurança', DATA_EVENTO: '📅 Data/Evento',
  }

  // Links dos templates Canva (configuráveis)
  const templates = {
    feed:   process.env.CANVA_TEMPLATE_FEED   ?? 'https://canva.com/projects',
    stories: process.env.CANVA_TEMPLATE_STORIES ?? 'https://canva.com/projects',
  }

  const mensagem = `🎨 *POST DE ${post.diaSemana}* — ${labels[post.categoria] ?? post.categoria}

*HEADLINE PARA A IMAGEM:*
_"${post.headline}"_

*LEGENDA COMPLETA:*
${post.legenda}

${post.hashtags}

---
🖼️ [Abrir template Feed no Canva](${templates.feed})
📱 [Abrir template Stories no Canva](${templates.stories})

Responda *SIM* para aprovar ou envie o que ajustar.
ID: \`${post.id}\``

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: mensagem, parse_mode: 'Markdown' }),
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje      = new Date()
  const diasMap: Record<number, string> = { 1: 'SEGUNDA', 3: 'QUARTA', 5: 'SEXTA' }
  const diaSemana = diasMap[hoje.getDay()] ?? 'SEGUNDA'

  const categoria = await determinarCategoria(diaSemana, hoje)
  const semana    = Math.ceil(hoje.getDate() / 7)

  const conteudo = await gerarConteudo(categoria, diaSemana, hoje)

  const post = await prisma.postSocial.create({
    data: {
      categoria,
      semana,
      diaSemana,
      headline: conteudo.headline,
      legenda:  conteudo.legenda,
      hashtags: conteudo.hashtags,
      status:   'PENDENTE',
    },
  })

  await notificarTelegram({ id: post.id, categoria, diaSemana, ...conteudo })

  return NextResponse.json({ ok: true, post })
}