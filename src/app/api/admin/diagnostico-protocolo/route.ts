import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Endpoint temporário de diagnóstico — somente leitura, somente ADMIN.
// Compara pedidos recentes (com geração automática de protocolo) para
// identificar diferenças entre os que geraram protocolo e os que não geraram.
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const pedidos = await prisma.pedido.findMany({
    where: {
      tipoAtendimento: { in: ['videoconferencia', 'presencial', 'emissao-online'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      numero: true,
      agr: true,
      tipoAtendimento: true,
      status: true,
      safewebProtocolo: true,
      safewebStatus: true,
      numeroCompra: true,
      hopeUrlDocumentos: true,
      emitidoEm: true,
      verificadoEm: true,
      createdAt: true,
      updatedAt: true,
      observacoes: true,
      usuario: { select: { nome: true, role: true } },
      itens: {
        select: {
          modelo: {
            select: { nome: true, tipoPessoa: true, tipoCertificado: true, suporte: true, validadeMeses: true, codigoSafeweb: true, ativo: true },
          },
        },
      },
      cliente: {
        select: {
          tipoPessoa: true,
        },
      },
    },
  })

  // Auditoria relacionada a cada pedido (ex.: alterações manuais de status via PATCH)
  const auditLogs = await prisma.auditLog.findMany({
    where: { entidade: 'Pedido', entidadeId: { in: pedidos.map(p => p.id) } },
    orderBy: { createdAt: 'asc' },
    select: { entidadeId: true, acao: true, dados: true, createdAt: true, usuario: { select: { nome: true } } },
  })

  return NextResponse.json({ pedidos, auditLogs })
}
