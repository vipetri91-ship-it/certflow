# MAPA DO SISTEMA — CertFlow ERP

**Versão:** 1.0  
**Data:** 09/06/2026  
**Sistema:** CertFlow — ERP da V&G Certificadora Digital (AR Safeweb)  
**Produção:** https://certflow-nine.vercel.app  
**Stack:** Next.js 16 · PostgreSQL (Supabase) · Prisma 7 · Vercel (região gru1)

---

## Visão Geral

O CertFlow é um ERP desenvolvido exclusivamente para a V&G Certificadora Digital, AR autorizada Safeweb. Centraliza a operação comercial, financeira e de relacionamento de uma Autoridade de Registro de certificados digitais. O sistema possui dois ambientes separados: o **painel interno** (operadores e gestores) e o **portal do parceiro** (contadores e indicadores).

---

## Estrutura de Acesso

### Perfis Internos

| Perfil | Nível de Acesso |
|---|---|
| **ADMIN** | Acesso total — todas as funções e configurações |
| **GERENTE** | Acesso operacional completo + financeiro + relatórios, sem gestão de usuários |
| **OPERADOR** | Clientes, certificados, pedidos, parceiros (leitura) |
| **FINANCEIRO** | Somente módulo financeiro |
| **VISUALIZADOR** | Somente leitura em todos os módulos |

### Portal do Parceiro
Acesso separado via `/portal/login`. Login próprio (loginParceiro/senhaParceiro). Cada parceiro vê apenas seus próprios dados.

---

## Módulos do Sistema

---

### MÓDULO 1 — Dashboard

**Objetivo:** Visão executiva em tempo real da operação. Cada AGR vê seu painel individual; gestores veem o consolidado.

**Arquivos principais:**
- `src/app/(dashboard)/dashboard/page.tsx` — servidor, busca todos os dados
- `src/app/(dashboard)/dashboard/painel-agr.tsx` — painel individual por AGR
- `src/app/(dashboard)/dashboard/kpi-carousel.tsx` — carrossel de KPIs
- `src/app/(dashboard)/dashboard/widget-*.tsx` — widgets individuais (11 widgets)

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| KPIs de vendas (dia / semana / mês / ano) | Concluído |
| Painel individual por AGR (ana.karolina, arlen, vinicius, laryssa) | Concluído |
| Widget financeiro — contas a receber | Concluído |
| Widget financeiro — contas a pagar | Concluído |
| Widget de vencimentos de certificados | Concluído |
| Widget de agenda pessoal (hoje) | Concluído |
| Widget calculadora de deslocamento (Distância × R$/km) | Concluído |
| Widget meta de vendas com celebração animada | Concluído |
| Widget Responsável RFB (consulta CPF na Receita Federal) | Concluído |
| Widget e-mail (webmail integrado) | Parcial — depende de variáveis SMTP |
| Pedidos abertos (aguardando verificação/emissão) | Concluído |
| Popup de certificado emitido (notificação ao AGR) | Concluído |

**Status geral:** Concluído  
**Riscos:** Widget de e-mail depende de configuração SMTP ativa; sem ela fica silencioso.

---

### MÓDULO 2 — Agenda

**Objetivo:** Gerenciamento de agendamentos de videoconferências e atendimentos presenciais, integrado ao Google Calendar.

**Arquivos principais:**
- `src/app/(dashboard)/agenda/page.tsx`
- `src/app/(dashboard)/agenda/agenda-fullscreen.tsx`
- `src/app/(dashboard)/agenda/editor-evento.tsx`
- `src/app/(dashboard)/agenda/lista-eventos.tsx`
- `src/lib/google/calendar.ts`
- `src/app/api/agenda/route.ts`
- `src/app/api/google/route.ts` e `callback/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Calendário fullscreen com visualização mensal/semanal/diária | Concluído |
| Criação de evento com AGR, tipo e duração | Concluído |
| Integração com Google Calendar (OAuth2) | Concluído |
| Cores distintas por AGR e tipo de atendimento (12 cores mapeadas) | Concluído |
| Criação automática de evento ao registrar nova venda com agendamento | Concluído |
| Notificação de agenda (componente `notificacao-agenda`) | Concluído |
| Edição e exclusão de evento | Concluído |

**Status geral:** Concluído  
**Riscos:** Exige token OAuth2 do Google armazenado no banco; se o token expirar sem refresh, a integração para silenciosamente. AGR `laryssa` não está mapeado nas cores do calendário (somente vinicius, arlen e ana).

---

### MÓDULO 3 — Clientes

**Objetivo:** Cadastro e gestão completa da carteira de clientes PF e PJ da AR.

**Arquivos principais:**
- `src/app/(dashboard)/clientes/page.tsx` — listagem
- `src/app/(dashboard)/clientes/novo/page.tsx` — cadastro
- `src/app/(dashboard)/clientes/[id]/page.tsx` — detalhe
- `src/app/(dashboard)/clientes/[id]/editar/page.tsx`
- `src/app/(dashboard)/clientes/importar/page.tsx`
- `src/app/api/clientes/route.ts` e `[id]/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Listagem com busca por nome, CPF, CNPJ, e-mail | Concluído |
| Cadastro PF e PJ com endereço completo | Concluído |
| Edição de dados cadastrais | Concluído |
| Página de detalhe com certificados e histórico | Concluído |
| Histórico de contatos (WhatsApp / e-mail / ligação) | Concluído |
| Botão de renovação direta a partir do detalhe | Concluído |
| Importação em massa (CSV/planilha) | Parcial — tela existe, implementação da importação pode ter limitações |
| Vinculação com parceiro indicador | Concluído |
| Grupos de clientes (campo `grupo`) | Parcial — campo existe no banco, sem UI de gestão de grupos |

**Status geral:** Concluído  
**Riscos:** A importação em massa não foi testada extensivamente. O campo `grupo` existe no banco mas não tem tela de filtro/gestão dedicada.

---

### MÓDULO 4 — Parceiros e Fornecedores

**Objetivo:** Gestão de parceiros indicadores (contadores, escritórios) e fornecedores. Inclui portal de autoatendimento para o parceiro.

**Arquivos principais:**
- `src/app/(dashboard)/parceiros/page.tsx` — listagem
- `src/app/(dashboard)/parceiros/[id]/page.tsx` — detalhe
- `src/app/(dashboard)/parceiros/[id]/editar/page.tsx`
- `src/app/(dashboard)/fornecedores/page.tsx`
- `src/app/api/parceiros/[id]/comissoes/route.ts`
- `src/app/api/parceiros/[id]/contatos/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Listagem de parceiros ativos com contagem de clientes e pedidos | Concluído |
| Cadastro com dados bancários e Pix | Concluído |
| Edição e inativação | Concluído |
| Tabela de comissões por modelo de certificado (% ou R$ fixo) | Concluído |
| Contatos adicionais do parceiro | Concluído |
| Fornecedores (filtrado do mesmo cadastro por `tipo='Fornecedor'`) | Concluído |
| Login/senha para portal do parceiro | Concluído |
| Ativação/desativação do painel do parceiro | Concluído |
| Configuração de permissões do painel do parceiro | Parcial — campo `permissoesPainel` (JSON) existe, UI básica |
| Preferências de notificação (WhatsApp/e-mail) por parceiro | Concluído |

**Status geral:** Concluído  
**Riscos:** O cálculo e pagamento de comissões não tem fluxo automatizado — é registrado mas não gera lançamentos financeiros automaticamente.

---

### MÓDULO 5 — Certificado Digital (Vendas e Protocolos)

**Objetivo:** Núcleo operacional do sistema. Registro de vendas, geração automática de protocolo Safeweb, monitoramento do ciclo de vida do certificado.

**Arquivos principais:**
- `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx` — formulário de nova venda
- `src/app/api/pedidos/nova-venda/route.ts` — lógica completa da venda
- `src/app/(dashboard)/pedidos/monitoramento/page.tsx` — painel de pedidos
- `src/app/(dashboard)/pedidos/[id]/page.tsx` — detalhe do pedido
- `src/lib/safeweb.ts` — toda a integração com a API Safeweb
- `src/app/api/safeweb/webhook/route.ts` — recebimento de eventos da Safeweb
- `docs/protocolo.md` — regra oficial imutável da geração de protocolo

**Telas:**

| Tela | Rota | Descrição |
|---|---|---|
| Nova Venda | `/pedidos/nova-venda` | Wizard multi-step: cliente → produto → atendimento → confirmação |
| Emissão Online | `/pedidos/nova-venda/online` | Fluxo dedicado para emissão online A3 em Nuvem |
| Monitoramento | `/pedidos/monitoramento` | Lista todos os pedidos com filtro por AGR, status, data, busca |
| Detalhe do Pedido | `/pedidos/[id]` | Protocolo, status, dados do cliente, ações (cancelar, liberar) |
| Notificações | `/pedidos/notificacoes` | Histórico de contatos/notificações por mês |
| Recibo | `/recibo` | Geração de recibo imprimível |
| Orçamento | `/orcamento` | Gerador de orçamento imprimível |
| Resp. RFB | `/pedidos/rfb` | Consulta de responsável na Receita Federal |

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Protocolo automático — Videoconferência (Add/3) | **Concluído e testado** |
| Protocolo automático — Presencial (Add/1) | **Concluído e testado** |
| Protocolo automático — Emissão Online (Add/5) | Concluído (não testado em produção) |
| Busca automática do idProduto Safeweb | Concluído |
| Suporte NUVEM — tentativa em cascata (tipos 5→3→1) | Concluído |
| Integração Hope Portal (link de documentos) | Concluído |
| Webhook Safeweb — atualização automática de status | Concluído |
| Ciclo: GERADO → VERIFICADO → EMITIDO → CANCELADO | Concluído |
| Popup de notificação "Certificado Emitido" para o AGR | Concluído |
| Consulta Prévia RFB antes da emissão | Concluído |
| Geração de lançamento financeiro automático na emissão (EMITIDO) | Concluído |
| Agendamento no Google Calendar ao registrar venda | Concluído |
| Cancelamento de protocolo Safeweb | Concluído (via API) |
| Boleto Inter integrado ao pedido | Parcial — API configurada, fluxo UI básico |
| Liberar Emissão Online após pagamento | Concluído |
| Atendimento externo com taxa de deslocamento | Concluído |
| Desconto sobre valor da venda | Concluído |
| Voucher de desconto | Parcial — campo existe, sem validação de vouchers |
| Geração de Recibo imprimível | Concluído |
| Biometria antes da emissão | Parcial — tela existe, integração depende de variável de ambiente |

**Status geral:** Concluído para os fluxos principais  
**Riscos:**
- A regra de geração de protocolo é documentada em `docs/protocolo.md` — qualquer alteração sem entendimento do fallback `data ??` pode quebrar silenciosamente
- O webhook Safeweb depende de URL pública configurada na tag `UrlSolicitacao` — se a URL mudar (ex: troca de domínio), os eventos param de chegar
- Emissão Online ainda não foi testada em produção real

---

### MÓDULO 6 — Renovações

**Objetivo:** Identificar certificados próximos ao vencimento e automatizar ou registrar o contato com o cliente.

**Arquivos principais:**
- `src/app/(dashboard)/renovacoes/page.tsx`
- `src/app/(dashboard)/renovacoes/lista.tsx`
- `src/app/(dashboard)/renovacoes/detalhe.tsx`
- `src/app/api/renovacoes/notificar-email/route.ts`
- `src/app/api/renovacoes/notificar-whatsapp/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Lista de certificados vencendo no mês selecionado | Concluído |
| Filtro por faixa de vencimento (7, 15, 30, 60 dias) | Concluído |
| Filtro por mês/ano | Concluído |
| Envio manual de WhatsApp via Digisac | Concluído |
| Envio manual de e-mail de renovação | Concluído |
| Registro automático no histórico de contatos | Concluído |
| Envio automático programado (job diário/semanal) | Parcial — jobs existem (`/api/jobs/`), dependem de cron externo configurado |
| Templates de e-mail editáveis (60/30/15/7 dias) | Concluído |

**Status geral:** Concluído para uso manual; automação depende de cron externo  
**Riscos:** Os jobs automáticos (`processar-emails`, `processar-whatsapp`) precisam ser chamados por um scheduler externo (Vercel Cron, Cron-job.org). Sem isso, só funcionam manualmente.

---

### MÓDULO 7 — Financeiro

**Objetivo:** Controle de contas a receber e a pagar, conciliação bancária com o Banco Inter e relatório de produção detalhada.

**Arquivos principais:**
- `src/app/(dashboard)/financeiro/contas-a-receber/page.tsx`
- `src/app/(dashboard)/financeiro/contas-a-pagar/page.tsx`
- `src/app/(dashboard)/financeiro/conciliacoes/page.tsx`
- `src/app/(dashboard)/relatorios/page.tsx`
- `src/lib/inter.ts`
- `src/app/api/inter/cobranca/route.ts`
- `src/app/api/financeiro/lancamentos/[id]/baixa/route.ts`
- `src/app/api/financeiro/lancamentos/[id]/comprovante/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Contas a Receber — listagem, filtros, busca | Concluído |
| Contas a Pagar — listagem, filtros, busca | Concluído |
| Baixa manual de lançamentos (marcar como pago) | Concluído |
| Upload de comprovante de pagamento | Concluído |
| Cadastro manual de lançamento (receber/pagar) | Concluído |
| Lançamento automático na emissão do certificado (EMITIDO) | Concluído |
| Geração de cobrança Inter (boleto/PIX) | Concluído |
| Webhook Inter — confirmação automática de pagamento | Concluído |
| Conciliação bancária Inter (extrato vs lançamentos) | Concluído |
| Relatório de Produção Detalhada | Concluído |
| Filtros avançados (modelo, AGR, parceiro, forma de pagamento) | Concluído |
| Exportação de relatório | Não implementado |
| DRE / fluxo de caixa | Não implementado |
| Categorias financeiras | Concluído (modelo no banco, uso básico) |
| Centro de custo | Parcial — campo existe, sem relatórios por centro |

**Status geral:** Concluído para operação diária  
**Riscos:** A integração Inter exige certificado mTLS (INTER_CERT_B64, INTER_KEY_B64). Sem ele, geração de boleto falha. Exportação de relatório em PDF/Excel não existe.

---

### MÓDULO 8 — SST (Segurança e Saúde no Trabalho)

**Objetivo:** Pipeline de prospecção de leads para serviços de SST (laudos, ASO, PCMSO). Módulo secundário da V&G.

**Arquivos principais:**
- `src/app/(dashboard)/sst/page.tsx`
- `src/app/api/sst/leads/route.ts`
- `src/app/api/sst/leads/[id]/route.ts`
- `src/app/api/sst/leads/[id]/historico/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Kanban de leads (PROSPECCAO, PROPOSTA, FECHADO, PERDIDO) | Concluído |
| Cadastro de lead com empresa, CNPJ, funcionários, valor estimado | Concluído |
| Histórico de interações por lead | Concluído |
| Arrastar entre etapas | Concluído |
| Integração com financeiro (geração de pedido/fatura) | Não implementado |
| Relatórios de conversão | Não implementado |

**Status geral:** Funcional para uso básico  
**Riscos:** Módulo visível somente para ADMIN. Sem integração com o restante do ERP (não gera pedido, não gera lançamento).

---

### MÓDULO 9 — Notícias e Comunicados

**Objetivo:** Publicação de comunicados internos e externos. Notícias internas para a equipe; notícias externas visíveis no Portal do Parceiro.

**Arquivos principais:**
- `src/app/(dashboard)/noticias/page.tsx`
- `src/app/(dashboard)/noticias/nova/page.tsx`
- `src/app/(dashboard)/noticias/[id]/editar/page.tsx`
- `src/app/portal/(auth)/noticias/page.tsx`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Listagem com categorias (Avisos, Legislação, Novos Serviços, Promoções) | Concluído |
| Criação e edição com suporte a Markdown | Concluído |
| Fixar notícia no topo | Concluído |
| Publicar/despublicar | Concluído |
| Exibição no Portal do Parceiro | Concluído |

**Status geral:** Concluído

---

### MÓDULO 10 — Conteúdo Social (IA)

**Objetivo:** Geração automatizada de posts para redes sociais usando IA (Anthropic Claude), com calendário editorial semanal.

**Arquivos principais:**
- `src/app/(dashboard)/conteudo/page.tsx`
- `src/app/api/social/gerar/route.ts`
- `src/app/api/social/posts/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Geração de posts com IA (headline, legenda, hashtags) | Concluído |
| Calendário editorial por semana e dia da semana | Concluído |
| Categorias: Educativo, Benefício, CTA, Segmento, Dica de Segurança, Data/Evento | Concluído |
| Aprovação/rejeição de posts | Concluído |
| Agendamento automático para redes sociais | Não implementado |
| Publicação direta (Instagram, Facebook, LinkedIn) | Não implementado |

**Status geral:** Parcial — geração funciona, publicação automática não existe  
**Riscos:** Depende da variável `ANTHROPIC_API_KEY`. Geração consume tokens da API Anthropic a cada chamada.

---

### MÓDULO 11 — Configurações

**Objetivo:** Administração do sistema, integrações, modelos de produto e controle de acesso.

**Arquivos principais:**
- `src/app/(dashboard)/configuracoes/modelos/page.tsx`
- `src/app/(dashboard)/configuracoes/emails/page.tsx`
- `src/app/(dashboard)/configuracoes/empresa/page.tsx`
- `src/app/(dashboard)/configuracoes/assistente/page.tsx`
- `src/app/(dashboard)/configuracoes/auditoria/page.tsx`
- `src/app/(dashboard)/configuracoes/perfis/[role]/page.tsx`
- `src/app/(dashboard)/usuarios/page.tsx`
- `src/lib/permissoes-estrutura.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Modelos de certificado (CRUD, preço, suporte, validade, código Safeweb) | Concluído |
| Templates de e-mail automático (8 tipos, editor HTML) | Concluído |
| Dados da empresa/AR | Concluído |
| Assistente IA — base de conhecimento (texto livre + PDFs) | Concluído |
| Auditoria — log completo de ações com filtros | Concluído |
| Gestão de usuários (CRUD, role, foto, WhatsApp) | Concluído |
| Perfis de permissão (visualização das permissões por role) | Concluído |
| Status das integrações externas (painel de saúde) | Concluído |
| Edição de permissões customizadas por usuário | Parcial — estrutura existe, UI básica |

**Status geral:** Concluído  
**Riscos:** Permissões são baseadas em roles fixas (enum). Customização granular por usuário não está completamente implementada.

---

### MÓDULO 12 — Portal do Parceiro

**Objetivo:** Ambiente separado para contadores e parceiros indicadores acompanharem sua carteira de clientes, certificados e relatórios, sem acesso ao painel interno.

**Arquivos principais:**
- `src/app/portal/login/page.tsx`
- `src/app/portal/(auth)/page.tsx` — dashboard do parceiro
- `src/app/portal/(auth)/certificados/page.tsx`
- `src/app/portal/(auth)/relatorios/page.tsx`
- `src/app/portal/(auth)/zoe/page.tsx` — assistente IA
- `src/app/portal/(auth)/noticias/page.tsx`
- `src/app/portal/(auth)/regulamento/page.tsx`
- `src/lib/portal-session.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Login separado com credenciais próprias | Concluído |
| Dashboard com gráfico de certificados emitidos (12 meses) | Concluído |
| Lista de pedidos/certificados da carteira | Concluído |
| Relatório de vencimentos do mês | Concluído |
| Assistente IA "Zoe" (chat sobre a carteira do parceiro) | Concluído |
| Notícias publicadas pela AR | Concluído |
| Regulamento do programa de parceria | Concluído |
| Cadastro de novo cliente direto pelo portal | Concluído |
| Área de indicar novo lead | Não implementado |
| Extrato de comissões | Não implementado |

**Status geral:** Concluído para funcionalidades principais  
**Riscos:** A Zoe usa a API Anthropic com contexto dos dados do parceiro — custo variável por uso.

---

### MÓDULO 13 — Biometria

**Objetivo:** Consulta biométrica de CPF antes da emissão do certificado, validando identidade do titular.

**Arquivos principais:**
- `src/app/(dashboard)/biometria/page.tsx`
- `src/app/api/biometria/route.ts`

**Funcionalidades:**

| Funcionalidade | Status |
|---|---|
| Consulta por CPF | Concluído |
| Validação local (AR) e global (Safeweb) | Concluído |
| Exibição de resultado por camada (local/global/validação) | Concluído |

**Status geral:** Concluído  
**Riscos:** Depende de variável de ambiente específica da API de biometria. Não está integrado ao fluxo de nova venda (é consulta separada).

---

## Fluxo de Navegação Principal

```
/login
  └─► /dashboard
        ├─► /agenda
        │
        ├─► /clientes
        │     ├─► /clientes/novo
        │     └─► /clientes/[id]
        │           └─► /clientes/[id]/editar
        │
        ├─► /parceiros
        │     ├─► /parceiros/novo
        │     └─► /parceiros/[id]
        │           └─► /parceiros/[id]/editar
        │
        ├─► /fornecedores
        │     └─► /fornecedores/novo
        │
        ├─► /pedidos/nova-venda          ← fluxo principal de venda
        │     └─► /pedidos/nova-venda/online  ← emissão online dedicada
        ├─► /pedidos/monitoramento
        ├─► /pedidos/notificacoes
        ├─► /pedidos/[id]
        ├─► /recibo
        ├─► /orcamento
        ├─► /pedidos/rfb
        │
        ├─► /renovacoes
        │
        ├─► /financeiro  → redireciona para /financeiro/contas-a-receber
        │     ├─► /financeiro/contas-a-receber
        │     │     └─► /financeiro/contas-a-receber/novo
        │     ├─► /financeiro/contas-a-pagar
        │     │     └─► /financeiro/contas-a-pagar/novo
        │     └─► /financeiro/conciliacoes
        │
        ├─► /relatorios
        │
        ├─► /sst
        ├─► /noticias
        │     ├─► /noticias/nova
        │     └─► /noticias/[id]/editar
        │
        ├─► /conteudo  (posts sociais)
        ├─► /biometria
        │
        ├─► /usuarios
        │     ├─► /usuarios/novo
        │     └─► /usuarios/[id]/editar
        │
        └─► /configuracoes
              ├─► /configuracoes/modelos
              ├─► /configuracoes/emails
              ├─► /configuracoes/empresa
              ├─► /configuracoes/assistente
              ├─► /configuracoes/auditoria
              └─► /configuracoes/perfis/[role]


/portal/login
  └─► /portal  (dashboard do parceiro)
        ├─► /portal/certificados
        ├─► /portal/relatorios
        ├─► /portal/noticias
        ├─► /portal/zoe  (assistente IA)
        ├─► /portal/regulamento
        └─► /portal/cadastro
```

---

## Integrações Externas

| Integração | Variáveis de Ambiente | Status | Uso |
|---|---|---|---|
| **Safeweb PSS** | `SAFEWEB_IDENTIFICADOR`, `SAFEWEB_SEGREDO`, `SAFEWEB_CODIGO_AR`, `SAFEWEB_CNPJ_AR`, `SAFEWEB_BASE_URL` | Ativo | Protocolo automático, produtos, webhook |
| **Hope Portal (Safeweb)** | `SAFEWEB_ATTENDANCE_PLACE_ID` | Ativo | Vinculação de protocolo ao portal de documentos |
| **IBGE** | *(API pública, sem chave)* | Ativo | Códigos de município e UF para ClienteNotaFiscal |
| **Google Calendar** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Ativo | Agendamento de videoconferências e atendimentos |
| **Digisac (WhatsApp)** | `DIGISAC_URL`, `DIGISAC_TOKEN`, `DIGISAC_CHANNEL_ID` | Ativo | Envio de WhatsApp para renovações e notificações |
| **Banco Inter** | `INTER_CERT_B64`, `INTER_KEY_B64`, `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET` | Ativo | Geração de boletos e cobranças PIX |
| **SMTP (E-mail)** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT` | Ativo | Envio de e-mails automáticos de renovação |
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | Ativo | Assistente interno, Zoe (portal), geração de posts |
| **Telegram** | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Configurado | Notificações internas via bot |
| **Digisac Webhook** | *(recebe, sem chave)* | Configurado | Recebimento de mensagens WhatsApp |

---

## Dependências Entre Módulos

```
Dashboard
  └── depende de: Pedidos, Clientes, Certificados, Financeiro, Agenda

Nova Venda (Pedidos)
  └── depende de: Clientes, Modelos de Certificado, Safeweb API, Google Calendar, Financeiro (lançamento automático)

Monitoramento (Pedidos)
  └── depende de: Safeweb Webhook (atualização de status)

Renovações
  └── depende de: Clientes, Certificados, Digisac (WhatsApp), SMTP (e-mail)

Financeiro
  └── depende de: Pedidos (lançamento automático), Banco Inter (cobranças)

Portal do Parceiro
  └── depende de: Parceiros, Pedidos, Clientes, Notícias, Anthropic (Zoe)

Assistente IA (interno)
  └── depende de: Anthropic, Configurações (base de conhecimento)

Conteúdo Social
  └── depende de: Anthropic

Agenda
  └── depende de: Google Calendar OAuth2
```

---

## Funcionalidades Concluídas (resumo)

- Fluxo completo de venda com geração automática de protocolo Safeweb (video + presencial)
- Monitoramento de pedidos com atualização automática via webhook
- Popup de notificação ao AGR quando certificado é emitido
- Gestão completa de clientes PF e PJ
- Agenda integrada ao Google Calendar com cores por AGR
- Módulo financeiro com boleto Inter e conciliação bancária
- Envio manual de WhatsApp e e-mail para renovações
- Templates de e-mail configuráveis
- Portal do parceiro completo com assistente IA Zoe
- Auditoria completa de ações
- Sistema de permissões por role

## Funcionalidades Parcialmente Concluídas

- Emissão Online A3 em Nuvem (código pronto, não testado em produção real)
- Jobs automáticos de renovação (existem, sem cron configurado)
- Importação de clientes em massa
- Biometria (tela existe, não integrada ao fluxo de venda)
- Extrato de comissões para parceiros
- Publicação automática de posts em redes sociais

## Funcionalidades Planejadas / Não Implementadas

- Exportação de relatórios (PDF / Excel)
- DRE e fluxo de caixa
- Cálculo e pagamento automático de comissões
- Publicação direta em Instagram / Facebook / LinkedIn
- Relatórios de conversão SST
- Integração do módulo SST com financeiro
- Área de indicação de leads no portal do parceiro

---

## Riscos Globais Identificados

| Risco | Impacto | Módulo |
|---|---|---|
| Alteração em `adicionarVideoconferencia` sem entender o fallback `data ??` | Alto — quebra geração de protocolo silenciosamente | Certificado Digital |
| Token OAuth2 do Google não renovado | Médio — agenda para de criar eventos | Agenda |
| Expiração do certificado mTLS do Inter | Médio — boletos param de ser gerados | Financeiro |
| Jobs de renovação sem cron configurado | Médio — notificações automáticas não disparam | Renovações |
| URL do webhook Safeweb desatualizada (mudança de domínio) | Alto — status dos pedidos para de atualizar | Pedidos |
| Custo variável da API Anthropic | Baixo/Médio — Zoe e assistente consomem tokens por uso | Portal / Configurações |