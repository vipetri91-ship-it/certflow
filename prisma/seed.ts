import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed...')

  // Usuário administrador padrão
  const senhaHash = await bcrypt.hash('certflow@2024', 12)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@certflow.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@certflow.com.br',
      senha: senhaHash,
      role: 'ADMIN',
    },
  })
  console.log(`✅ Admin criado: ${admin.email}`)

  // Categorias financeiras
  const categorias = [
    { nome: 'Certificados Digitais', tipo: 'RECEITA' as const, cor: '#3b82f6' },
    { nome: 'Comissões Parceiros', tipo: 'DESPESA' as const, cor: '#f97316' },
    { nome: 'Aluguel', tipo: 'DESPESA' as const, cor: '#ef4444' },
    { nome: 'Salários', tipo: 'DESPESA' as const, cor: '#8b5cf6' },
    { nome: 'Marketing', tipo: 'DESPESA' as const, cor: '#ec4899' },
    { nome: 'Taxas e Impostos', tipo: 'DESPESA' as const, cor: '#6b7280' },
    { nome: 'Outros (Receita)', tipo: 'RECEITA' as const, cor: '#10b981' },
    { nome: 'Outros (Despesa)', tipo: 'DESPESA' as const, cor: '#9ca3af' },
  ]

  for (const cat of categorias) {
    await prisma.categoriaFinanceira.upsert({
      where: { id: `seed-${cat.nome}` },
      update: {},
      create: { id: `seed-${cat.nome}`, ...cat },
    })
  }
  console.log(`✅ ${categorias.length} categorias financeiras criadas`)

  // Modelos de certificado
  const modelos = [
    { nome: 'e-CPF A1', tipoPessoa: 'PF', tipoCertificado: 'A1', suporte: 'ARQUIVO', validadeMeses: 12, preco: 180 },
    { nome: 'e-CPF A3 Token', tipoPessoa: 'PF', tipoCertificado: 'A3', suporte: 'TOKEN', validadeMeses: 36, preco: 350 },
    { nome: 'e-CPF A3 Cartão', tipoPessoa: 'PF', tipoCertificado: 'A3', suporte: 'CARTAO', validadeMeses: 36, preco: 380 },
    { nome: 'e-CPF A3 Nuvem', tipoPessoa: 'PF', tipoCertificado: 'A3', suporte: 'NUVEM', validadeMeses: 12, preco: 280 },
    { nome: 'e-CNPJ A1', tipoPessoa: 'PJ', tipoCertificado: 'A1', suporte: 'ARQUIVO', validadeMeses: 12, preco: 250 },
    { nome: 'e-CNPJ A3 Token', tipoPessoa: 'PJ', tipoCertificado: 'A3', suporte: 'TOKEN', validadeMeses: 36, preco: 450 },
    { nome: 'e-CNPJ A3 Cartão', tipoPessoa: 'PJ', tipoCertificado: 'A3', suporte: 'CARTAO', validadeMeses: 36, preco: 480 },
    { nome: 'e-CNPJ A3 Nuvem', tipoPessoa: 'PJ', tipoCertificado: 'A3', suporte: 'NUVEM', validadeMeses: 12, preco: 350 },
  ] as const

  for (const m of modelos) {
    await prisma.modeloCertificado.upsert({
      where: { id: `seed-${m.nome}` },
      update: {},
      create: { id: `seed-${m.nome}`, ...m },
    })
  }
  console.log(`✅ ${modelos.length} modelos de certificado criados`)

  // Templates de e-mail padrão
  const templates = [
    { tipo: 'VENCIMENTO_60' as const, assunto: '⚠️ Seu certificado digital vence em 60 dias', corpo: 'Template de vencimento 60 dias' },
    { tipo: 'VENCIMENTO_30' as const, assunto: '⚠️ Seu certificado digital vence em 30 dias', corpo: 'Template de vencimento 30 dias' },
    { tipo: 'VENCIMENTO_15' as const, assunto: '🚨 Seu certificado digital vence em 15 dias', corpo: 'Template de vencimento 15 dias' },
    { tipo: 'VENCIMENTO_7' as const, assunto: '🔴 URGENTE: Certificado vence em 7 dias', corpo: 'Template de vencimento 7 dias' },
    { tipo: 'POS_EMISSAO' as const, assunto: '✅ Certificado emitido com sucesso!', corpo: 'Template pós-emissão' },
    { tipo: 'NUTRICAO_3M' as const, assunto: '💡 Dicas para seu certificado digital', corpo: 'Template nutrição 3 meses' },
    { tipo: 'NUTRICAO_6M' as const, assunto: '🔒 Mantenha seu certificado seguro', corpo: 'Template nutrição 6 meses' },
    { tipo: 'NUTRICAO_9M' as const, assunto: '🔄 Hora de planejar a renovação!', corpo: 'Template nutrição 9 meses' },
  ]

  for (const t of templates) {
    await prisma.templateEmail.upsert({
      where: { tipo: t.tipo },
      update: {},
      create: { ...t, updatedAt: new Date() },
    })
  }
  console.log(`✅ ${templates.length} templates de e-mail criados`)

  console.log('\n✨ Seed concluído!')
  console.log('──────────────────────────────────────')
  console.log('🔑 Login inicial:')
  console.log('   E-mail: admin@certflow.com.br')
  console.log('   Senha:  certflow@2024')
  console.log('   ⚠️  Altere a senha após o primeiro acesso!')
  console.log('──────────────────────────────────────')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())