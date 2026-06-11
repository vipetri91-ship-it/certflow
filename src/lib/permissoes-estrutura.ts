// Estrutura completa de permissões do CertFlow
// Organizada por módulo → subgrupo → lista de permissões

import { prisma } from './prisma'

export interface PermissaoItem {
  key: string
  label: string
}

export interface Subgrupo {
  label: string
  itens: PermissaoItem[]
}

export interface Modulo {
  label: string
  subgrupos: Record<string, Subgrupo>
}

export const ESTRUTURA_PERMISSOES: Record<string, Modulo> = {
  cadastros: {
    label: 'Cadastros',
    subgrupos: {
      clientes: {
        label: 'Clientes',
        itens: [
          { key: 'clientes.listar',   label: 'Listar Clientes' },
          { key: 'clientes.criar_pf', label: 'Cadastrar Cliente Pessoa Física' },
          { key: 'clientes.criar_pj', label: 'Cadastrar Cliente Pessoa Jurídica' },
          { key: 'clientes.editar',   label: 'Editar Cliente' },
          { key: 'clientes.deletar',  label: 'Deletar Cliente' },
          { key: 'clientes.exportar', label: 'Exportar Clientes' },
        ],
      },
      parceiros: {
        label: 'Parceiros',
        itens: [
          { key: 'parceiros.listar',  label: 'Listar Parceiros' },
          { key: 'parceiros.criar',   label: 'Cadastrar Parceiro' },
          { key: 'parceiros.editar',  label: 'Editar Parceiro' },
          { key: 'parceiros.deletar', label: 'Deletar Parceiro' },
        ],
      },
      fornecedores: {
        label: 'Fornecedores',
        itens: [
          { key: 'fornecedores.listar',  label: 'Listar Fornecedores' },
          { key: 'fornecedores.criar',   label: 'Cadastrar Fornecedor' },
          { key: 'fornecedores.editar',  label: 'Editar Fornecedor' },
          { key: 'fornecedores.deletar', label: 'Deletar Fornecedor' },
        ],
      },
    },
  },

  certificado_digital: {
    label: 'Certificado Digital',
    subgrupos: {
      nova_venda: {
        label: 'Nova Venda',
        itens: [
          { key: 'vendas.criar',        label: 'Criar Nova Venda' },
          { key: 'vendas.alterar_valor',label: 'Alterar Valor de Venda' },
          { key: 'vendas.aplicar_desc', label: 'Aplicar Desconto' },
        ],
      },
      monitoramento: {
        label: 'Monitoramento',
        itens: [
          { key: 'monitor.listar',      label: 'Visualizar Monitoramento' },
          { key: 'monitor.protocolo',   label: 'Inserir Número de Protocolo' },
          { key: 'monitor.verificar',   label: 'Marcar como Verificado' },
          { key: 'monitor.emitir',      label: 'Finalizar / Emitir' },
          { key: 'monitor.cancelar',    label: 'Cancelar Pedido' },
        ],
      },
      gestao: {
        label: 'Gestão de Certificados',
        itens: [
          { key: 'certs.listar',        label: 'Listar Certificados' },
          { key: 'certs.renovar',       label: 'Renovar Certificado' },
          { key: 'certs.cancelar',      label: 'Cancelar Certificado' },
        ],
      },
    },
  },

  renovacoes: {
    label: 'Renovações',
    subgrupos: {
      vencimentos: {
        label: 'Controle de Vencimentos',
        itens: [
          { key: 'renov.listar',        label: 'Listar Certificados a Vencer' },
          { key: 'renov.whatsapp',      label: 'Enviar Notificação WhatsApp' },
          { key: 'renov.email',         label: 'Enviar Notificação E-mail' },
          { key: 'renov.historico',     label: 'Registrar/Ver Histórico de Contatos' },
          { key: 'renov.gerar',         label: 'Gerar Nova Renovação' },
        ],
      },
    },
  },

  financeiro: {
    label: 'Financeiro',
    subgrupos: {
      lancamentos: {
        label: 'Lançamentos',
        itens: [
          { key: 'fin.listar',       label: 'Listar Lançamentos' },
          { key: 'fin.criar',        label: 'Novo Lançamento' },
          { key: 'fin.editar',       label: 'Editar Lançamento' },
          { key: 'fin.deletar',      label: 'Excluir Lançamento' },
          { key: 'fin.receber',      label: 'Dar Baixa / Receber' },
          { key: 'fin.pagar',        label: 'Pagar Conta' },
          { key: 'fin.comprovante',  label: 'Anexar Comprovante de Pagamento' },
        ],
      },
      relatorios: {
        label: 'Relatórios Financeiros',
        itens: [
          { key: 'relat.listar',        label: 'Ver Relatórios' },
          { key: 'relat.faturamento',   label: 'Relatório de Faturamento' },
          { key: 'relat.comissoes',     label: 'Relatório de Comissões' },
        ],
      },
    },
  },

  configuracoes: {
    label: 'Configurações',
    subgrupos: {
      usuarios: {
        label: 'Usuários',
        itens: [
          { key: 'users.listar',        label: 'Listar Usuários' },
          { key: 'users.criar',         label: 'Criar Usuário' },
          { key: 'users.editar',        label: 'Editar Usuário' },
          { key: 'users.bloquear',      label: 'Bloquear/Reativar Usuário' },
          { key: 'users.permissoes',    label: 'Gerenciar Permissões' },
        ],
      },
      emails: {
        label: 'E-mails Automáticos',
        itens: [
          { key: 'emails.configurar',   label: 'Configurar Templates' },
          { key: 'emails.logs',         label: 'Ver Logs de Envio' },
        ],
      },
      auditoria: {
        label: 'Auditoria',
        itens: [
          { key: 'audit.listar',        label: 'Ver Trilha de Auditoria' },
        ],
      },
      sistema: {
        label: 'Sistema',
        itens: [
          { key: 'sistema.config',      label: 'Configurações do Sistema' },
          { key: 'sistema.modelos',     label: 'Modelos de Certificado' },
        ],
      },
      dashboard: {
        label: 'Dashboard',
        itens: [
          { key: 'dash.producao',       label: 'Ver Produção da Equipe' },
          { key: 'dash.financeiro',     label: 'Ver Resumo Financeiro' },
          { key: 'dash.agenda',         label: 'Ver Agenda' },
          { key: 'dash.vencimentos',    label: 'Ver Widget de Vencimentos' },
          { key: 'dash.todos_agrs',     label: 'Ver Todos os AGRs (Admin)' },
        ],
      },
    },
  },
}

// Permissões padrão por perfil
export const PERMISSOES_PADRAO: Record<string, Record<string, boolean>> = {
  ADMIN: {}, // Gerado abaixo — tudo true
  GERENTE: {
    'clientes.listar': true, 'clientes.criar_pf': true, 'clientes.criar_pj': true, 'clientes.editar': true, 'clientes.exportar': true,
    'parceiros.listar': true, 'parceiros.criar': true, 'parceiros.editar': true,
    'fornecedores.listar': true,
    'vendas.criar': true, 'vendas.alterar_valor': true, 'vendas.aplicar_desc': true,
    'monitor.listar': true, 'monitor.protocolo': true, 'monitor.verificar': true, 'monitor.emitir': true,
    'certs.listar': true, 'certs.renovar': true,
    'renov.listar': true, 'renov.whatsapp': true, 'renov.email': true, 'renov.historico': true, 'renov.gerar': true,
    'fin.listar': true, 'fin.criar': true, 'fin.receber': true, 'fin.pagar': true,
    'relat.listar': true, 'relat.faturamento': true, 'relat.comissoes': true,
    'users.listar': true,
    'emails.logs': true,
    'audit.listar': true,
    'dash.producao': true, 'dash.agenda': true, 'dash.vencimentos': true, 'dash.todos_agrs': true,
  },
  OPERADOR: {
    // Cadastros — Clientes
    'clientes.criar_pf': true,   // ✅ Cadastrar Cliente PF
    'clientes.criar_pj': true,   // ✅ Cadastrar Cliente PJ
    'clientes.editar':   true,   // ✅ Editar Cliente / Editar Renovação / Informações
    // clientes.listar: false    // ❌ Relação de Clientes (lista geral)
    // clientes.exportar: false  // ❌ Exportar Clientes
    // clientes.deletar: false   // ❌ Deletar Cliente

    // Cadastros — Parceiros
    'parceiros.listar': true,    // ✅ Consultar Parceiro
    'parceiros.criar':  true,    // ✅ Cadastrar Novo Parceiro
    // parceiros.editar: false   // ❌ Editar Parceiro
    // parceiros.deletar: false  // ❌ Deletar Parceiro

    // Certificado Digital — Nova Venda
    'vendas.criar':         true,  // ✅ Redirecionar para Compra / Nova Venda
    'vendas.alterar_valor': true,  // ✅ Alterar Método de Pagamento
    // vendas.aplicar_desc: false  // ❌ Não habilitado

    // Certificado Digital — Monitoramento
    'monitor.listar':    true,  // ✅ Visualizar Monitoramento
    'monitor.protocolo': true,  // ✅ Inserir Protocolo (fluxo obrigatório)
    'monitor.verificar': true,  // ✅ Marcar como Pendente / Verificar
    'monitor.emitir':    true,  // ✅ Finalizar / Emitir Certificado
    // monitor.cancelar: false  // ❌ Cancelar Pedido

    // Renovações — tudo habilitado
    'renov.listar':     true,  // ✅ Relação de Certificados a Vencer + Gráficos
    'renov.whatsapp':   true,  // ✅ Notificar WhatsApp
    'renov.email':      true,  // ✅ Notificar E-mail
    'renov.historico':  true,  // ✅ Salvar Informações / Histórico de Contatos
    'renov.gerar':      true,  // ✅ Gerar Próxima Renovação

    // Financeiro — apenas anexar comprovante
    'fin.comprovante': true,   // ✅ Anexar Comprovante (único acesso financeiro)
    // fin.listar: false       // ❌ Sem acesso ao financeiro
    // fin.criar: false
    // fin.receber: false
    // fin.pagar: false
    // relat.*: false

    // Configurações — nenhuma
    // users.*, emails.*, audit.*, sistema.*: false

    // Dashboard
    'dash.agenda':      true,  // ✅ Ver agenda (necessário para atendimentos)
    'dash.vencimentos': true,  // ✅ Widget de vencimentos
    // dash.producao: false    // ❌ Aba Produção Geral
    // dash.financeiro: false  // ❌ Aba Financeiro
    // dash.todos_agrs: false  // ❌ Ver todos os AGRs
  },
  FINANCEIRO: {
    'fin.listar':      true,  // ✅ Ver lista de lançamentos
    'fin.pagar':       true,  // ✅ Dar Baixa (confirmar pagamento)
    'fin.comprovante': true,  // ✅ Anexar comprovante
    // fin.criar: false       // ❌ Sem criar lançamentos
    // fin.editar: false      // ❌ Sem editar lançamentos
    // fin.deletar: false     // ❌ Sem excluir lançamentos
    // fin.receber: false     // ❌ Sem dar baixa em receitas (só admin)
    // relat.*: false         // ❌ Sem relatórios
  },
  VISUALIZADOR: {
    'clientes.listar': true, 'parceiros.listar': true,
    'monitor.listar': true, 'certs.listar': true, 'renov.listar': true,
    'fin.listar': true, 'relat.listar': true,
    'dash.producao': true,
  },
}

// Gera todas as permissões do ADMIN como true
function gerarAdminPermissoes(): Record<string, boolean> {
  const perms: Record<string, boolean> = {}
  for (const modulo of Object.values(ESTRUTURA_PERMISSOES)) {
    for (const subgrupo of Object.values(modulo.subgrupos)) {
      for (const item of subgrupo.itens) {
        perms[item.key] = true
      }
    }
  }
  return perms
}

PERMISSOES_PADRAO.ADMIN = gerarAdminPermissoes()

// Verifica se um perfil possui uma permissão granular específica,
// considerando a configuração salva em `Configuracao.permissoes_{ROLE}`
// (com fallback para PERMISSOES_PADRAO). ADMIN sempre retorna true.
export async function temPermissaoGranular(role: string, key: string): Promise<boolean> {
  if (role === 'ADMIN') return true

  const config = await prisma.configuracao.findUnique({ where: { chave: `permissoes_${role}` } })

  let permissoes: Record<string, boolean>
  if (config?.valor) {
    try {
      permissoes = JSON.parse(config.valor)
    } catch {
      permissoes = PERMISSOES_PADRAO[role] ?? {}
    }
  } else {
    permissoes = PERMISSOES_PADRAO[role] ?? {}
  }

  return permissoes[key] === true
}
