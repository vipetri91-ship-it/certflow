import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transporte } from '@/lib/email/transporte'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function verificarToken(req: NextRequest): boolean {
  const token = req.headers.get('x-job-token') ?? req.nextUrl.searchParams.get('token')
  return token === process.env.AUTH_SECRET
}

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export async function POST(req: NextRequest) {
  if (!verificarToken(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const inicio = startOfDay(hoje)
  const fim = endOfDay(hoje)
  const dataFormatada = format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  // Buscar dados do dia
  const [pedidosDia, clientesDia, certificadosDia, receitaDia, vencendo7] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: inicio, lte: fim }, ignorarMetricasVendas: false },
      include: { cliente: { select: { nome: true } }, itens: { include: { modelo: { select: { nome: true } } } } },
    }),
    prisma.cliente.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    prisma.certificado.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    prisma.lancamento.aggregate({
      _sum: { valor: true },
      where: {
        tipo: 'RECEBER', status: 'PAGO',
        dataPagamento: { gte: inicio, lte: fim },
      },
    }),
    prisma.certificado.findMany({
      where: {
        status: 'ATIVO',
        dataVencimento: {
          gte: hoje,
          lte: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { cliente: { select: { nome: true } }, modelo: { select: { nome: true } } },
      take: 10,
    }),
  ])

  const receitaTotal = Number(receitaDia._sum.valor ?? 0)
  const valorPedidosDia = pedidosDia.reduce((acc, p) => acc + Number(p.valorFinal), 0)

  // Totais gerais
  const [totalClientes, totalCertAtivos, totalPedidosMes] = await Promise.all([
    prisma.cliente.count({ where: { ativo: true } }),
    prisma.certificado.count({ where: { status: 'ATIVO' } }),
    prisma.pedido.count({
      where: {
        status: { not: 'CANCELADO' },
        ignorarMetricasVendas: false,
        createdAt: {
          gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
          lte: fim,
        },
      },
    }),
  ])

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f6fb; color: #374151; }
    .wrap { max-width: 640px; margin: 24px auto; }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,.8); margin: 6px 0 0; font-size: 14px; }
    .body { background: #fff; padding: 28px 32px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 14px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin: 0 0 16px; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .card .val { font-size: 22px; font-weight: 700; color: #1e40af; }
    .card .lbl { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .pedido { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .pedido:last-child { border: none; }
    .pedido .nome { font-size: 13px; font-weight: 600; color: #111827; }
    .pedido .det { font-size: 12px; color: #6b7280; }
    .badge-ok { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .badge-warn { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .venc-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .venc-item:last-child { border: none; }
    .footer { background: #f8fafc; padding: 16px 32px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: #9ca3af; }
    .zero { color: #9ca3af; font-style: italic; font-size: 13px; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🛡️ CertFlow — Relatório Diário</h1>
    <p>${dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)}</p>
  </div>
  <div class="body">

    <div class="section">
      <h2>Resumo do Dia</h2>
      <div class="cards">
        <div class="card">
          <div class="val">${pedidosDia.length}</div>
          <div class="lbl">Pedidos hoje</div>
        </div>
        <div class="card">
          <div class="val">${formatarMoeda(valorPedidosDia)}</div>
          <div class="lbl">Valor em pedidos</div>
        </div>
        <div class="card">
          <div class="val">${clientesDia}</div>
          <div class="lbl">Clientes cadastrados</div>
        </div>
        <div class="card">
          <div class="val">${formatarMoeda(receitaTotal)}</div>
          <div class="lbl">Receita recebida</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Totais Gerais</h2>
      <div class="cards">
        <div class="card">
          <div class="val">${totalClientes}</div>
          <div class="lbl">Clientes ativos</div>
        </div>
        <div class="card">
          <div class="val">${totalCertAtivos}</div>
          <div class="lbl">Certificados ativos</div>
        </div>
        <div class="card">
          <div class="val">${totalPedidosMes}</div>
          <div class="lbl">Pedidos no mês</div>
        </div>
        <div class="card">
          <div class="val">${vencendo7.length}</div>
          <div class="lbl">Vencem em 7 dias</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Pedidos de Hoje</h2>
      ${pedidosDia.length === 0
        ? '<p class="zero">Nenhum pedido gerado hoje.</p>'
        : pedidosDia.map(p => `
        <div class="pedido">
          <div class="nome">${p.cliente.nome}</div>
          <div class="det">
            ${p.numero} &nbsp;·&nbsp;
            ${p.itens.map(i => i.modelo.nome).join(', ')} &nbsp;·&nbsp;
            <strong>${formatarMoeda(Number(p.valorFinal))}</strong>
            &nbsp; <span class="badge-ok">${p.status}</span>
          </div>
        </div>`).join('')
      }
    </div>

    ${vencendo7.length > 0 ? `
    <div class="section">
      <h2>⚠️ Vencem nos próximos 7 dias</h2>
      ${vencendo7.map(c => `
      <div class="venc-item">
        <strong>${c.cliente.nome}</strong> — ${c.modelo.nome}
        &nbsp; <span class="badge-warn">Vence ${format(c.dataVencimento, 'dd/MM/yyyy')}</span>
      </div>`).join('')}
    </div>` : ''}

  </div>
  <div class="footer">
    CertFlow · Relatório gerado automaticamente às ${format(hoje, 'HH:mm')} de ${format(hoje, 'dd/MM/yyyy')}
  </div>
</div>
</body>
</html>`

  try {
    await transporte.sendMail({
      from: process.env.SMTP_FROM,
      to: 'vipetri91@gmail.com',
      subject: `📊 CertFlow — Relatório ${format(hoje, 'dd/MM/yyyy')} | ${pedidosDia.length} pedidos · ${formatarMoeda(valorPedidosDia)}`,
      html,
    })

    return NextResponse.json({
      ok: true,
      resumo: {
        pedidos: pedidosDia.length,
        valorPedidos: valorPedidosDia,
        clientesNovos: clientesDia,
        vencendo7: vencendo7.length,
      },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, erro: String(err) }, { status: 500 })
  }
}

// Também aceita GET para Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req)
}