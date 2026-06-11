# Documentação do Banco de Dados — CertFlow

**Versão:** 1.0  
**Data:** 09/06/2026  
**Banco:** PostgreSQL (Supabase)  
**ORM:** Prisma 7  
**Schema Prisma:** `prisma/schema.prisma`  
**Script de migração incremental:** `scripts/migrate.js` (executado automaticamente no build)

---

## Sumário

- [Enums](#enums)
- [Diagrama de Relacionamentos](#diagrama-de-relacionamentos)
- [Tabelas](#tabelas)
  - [usuarios](#tabela-usuarios)
  - [sessoes](#tabela-sessoes)
  - [sessao_atividade](#tabela-sessao_atividade)
  - [clientes](#tabela-clientes)
  - [historico_contatos](#tabela-historico_contatos)
  - [parceiros](#tabela-parceiros)
  - [contatos_parceiro](#tabela-contatos_parceiro)
  - [comissoes](#tabela-comissoes)
  - [modelos_certificado](#tabela-modelos_certificado)
  - [certificados](#tabela-certificados)
  - [pedidos](#tabela-pedidos)
  - [itens_pedido](#tabela-itens_pedido)
  - [lancamentos](#tabela-lancamentos)
  - [categorias_financeiras](#tabela-categorias_financeiras)
  - [templates_email](#tabela-templates_email)
  - [email_logs](#tabela-email_logs)
  - [audit_logs](#tabela-audit_logs)
  - [configuracoes](#tabela-configuracoes)
  - [noticias](#tabela-noticias)
  - [sst_leads](#tabela-sst_leads)
  - [sst_historico](#tabela-sst_historico)
  - [orcamentos](#tabela-orcamentos)
  - [posts_social](#tabela-posts_social)
- [Observações Globais](#observações-globais)

---

## Enums

Tipos enumerados definidos no PostgreSQL (não são tabelas — são restrições de valor).

| Enum | Valores | Uso |
|---|---|---|
| `TipoPessoa` | `PF`, `PJ` | clientes, parceiros, modelos_certificado |
| `TipoCertificado` | `A1`, `A3` | modelos_certificado |
| `SuporteCertificado` | `TOKEN`, `CARTAO`, `NUVEM`, `ARQUIVO` | modelos_certificado |
| `StatusCertificado` | `ATIVO`, `VENCIDO`, `CANCELADO`, `RENOVADO` | certificados |
| `StatusPedido` | `GERADO`, `VERIFICADO`, `EMITIDO`, `CANCELADO` | pedidos |
| `TipoLancamento` | `RECEBER`, `PAGAR` | lancamentos |
| `StatusLancamento` | `PENDENTE`, `PAGO`, `VENCIDO`, `CANCELADO` | lancamentos |
| `TipoTransacao` | `RECEITA`, `DESPESA` | categorias_financeiras |
| `Role` | `ADMIN`, `GERENTE`, `OPERADOR`, `FINANCEIRO`, `VISUALIZADOR` | usuarios |
| `StatusEmail` | `PENDENTE`, `ENVIADO`, `ERRO` | email_logs |
| `TipoEmailAutomatico` | `VENCIMENTO_60`, `VENCIMENTO_30`, `VENCIMENTO_15`, `VENCIMENTO_7`, `POS_EMISSAO`, `NUTRICAO_3M`, `NUTRICAO_6M`, `NUTRICAO_9M` | templates_email, email_logs |

> **Atenção:** O enum `StatusPedido` contém valores legados (`PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDO`) que foram migrados via `ALTER TYPE ADD VALUE` para os valores atuais. Esses valores antigos ainda existem no tipo PostgreSQL mas não são mais usados pelo sistema.

---

## Diagrama de Relacionamentos

```
┌─────────────┐         ┌───────────────────┐
│  usuarios   │────┐    │ modelos_certificado│
└─────────────┘    │    └───────────────────┘
      │ 1          │           │ 1
      │            │           ├─────────────────────────────────────┐
      │ N          │           │ N                                   │ N
┌─────────────┐    │    ┌──────────────┐              ┌────────────────────┐
│   pedidos   │────┘    │  certificados│              │     comissoes      │
└─────────────┘         └──────────────┘              └────────────────────┘
      │ 1                     │ N                             │ N
      ├──────────────┐        │                               │
      │ N            │ N      │ N                             │ 1
┌──────────────┐ ┌──────────────────┐            ┌────────────────────────┐
│ itens_pedido │ │  historico_contatos│           │       parceiros        │
└──────────────┘ └──────────────────┘            └────────────────────────┘
      │ N                                                │ 1
      │ 1                                         ┌──────┴────────────────┐
┌───────────────────┐                             │ N                     │ N
│ modelos_certificado│              ┌─────────────────────┐  ┌────────────────────┐
└───────────────────┘              │  contatos_parceiro  │  │      clientes      │
                                   └─────────────────────┘  └────────────────────┘

┌──────────────┐      ┌────────────────────┐
│  lancamentos │──────│categorias_financeiras│
└──────────────┘  N:1 └────────────────────┘
      │ N
      │ 1
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   pedidos   │    │  parceiros  │    │   usuarios   │
└─────────────┘    └─────────────┘    └──────────────┘

┌─────────────┐      ┌──────────────┐
│  email_logs │──────│  clientes    │
└─────────────┘  N:1 └──────────────┘
      │ N
      │ 1
┌──────────────┐

┌──────────────┐      ┌──────────────┐
│  audit_logs  │──────│  usuarios    │
└──────────────┘  N:1 └──────────────┘

┌──────────────┐      ┌──────────────┐
│  sst_historico│─────│  sst_leads   │
└──────────────┘  N:1 └──────────────┘

┌──────────────┐      ┌──────────────┐
│  orcamentos  │──────│  usuarios    │
└──────────────┘  N:1 └──────────────┘

┌────────────────┐    ┌──────────────┐
│sessao_atividade│────│  usuarios    │
└────────────────┘N:1 └──────────────┘
```

### Mapa completo de chaves estrangeiras

```
sessoes.usuarioId               → usuarios.id         (CASCADE DELETE)
clientes.parceiroId             → parceiros.id         (SET NULL)
historico_contatos.clienteId    → clientes.id          (CASCADE DELETE)
historico_contatos.certificadoId→ certificados.id      (opcional)
historico_contatos.usuarioId    → usuarios.id          (opcional)
parceiros.responsavelId         → usuarios.id          (relação "responsável")
contatos_parceiro.parceiroId    → parceiros.id         (CASCADE DELETE)
comissoes.parceiroId            → parceiros.id         (RESTRICT)
comissoes.modeloId              → modelos_certificado.id (RESTRICT)
certificados.clienteId          → clientes.id          (RESTRICT)
certificados.modeloId           → modelos_certificado.id (RESTRICT)
certificados.pedidoId           → pedidos.id           (SET NULL)
pedidos.clienteId               → clientes.id          (RESTRICT)
pedidos.parceiroId              → parceiros.id         (SET NULL)
pedidos.usuarioId               → usuarios.id          (RESTRICT)
itens_pedido.pedidoId           → pedidos.id           (CASCADE DELETE)
itens_pedido.modeloId           → modelos_certificado.id (RESTRICT)
lancamentos.categoriaId         → categorias_financeiras.id (SET NULL)
lancamentos.pedidoId            → pedidos.id           (SET NULL)
lancamentos.parceiroId          → parceiros.id         (sem FK declarada — apenas campo)
email_logs.clienteId            → clientes.id          (RESTRICT)
email_logs.certificadoId        → certificados.id      (SET NULL)
audit_logs.usuarioId            → usuarios.id          (SET NULL)
orcamentos.geradoPor            → usuarios.id          (SET NULL)
sessao_atividade.usuarioId      → usuarios.id          (CASCADE DELETE)
sst_historico.leadId            → sst_leads.id         (CASCADE DELETE)
```

---

## Tabelas

---

### Tabela: `usuarios`

**Finalidade:** Armazena os usuários internos do sistema (operadores, gerentes, administradores, financeiro).

**Origem dos dados:** Cadastro manual pelo ADMIN via `/usuarios/novo`.

**Quem utiliza:** Autenticação (NextAuth), auditoria, agenda, pedidos, orçamentos, sessão de atividade.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** — identificador único |
| `nome` | TEXT | NÃO | — | Nome completo do usuário |
| `username` | TEXT | SIM | (backfill do email) | Login único para autenticação |
| `email` | TEXT | SIM | — | E-mail (opcional após migração) |
| `senha` | TEXT | NÃO | — | Hash bcrypt da senha |
| `role` | Role (enum) | NÃO | `OPERADOR` | Perfil de acesso |
| `ativo` | BOOLEAN | NÃO | `true` | Controle de acesso ativo/inativo |
| `avatar` | TEXT | SIM | — | URL da foto do perfil |
| `whatsapp` | TEXT | SIM | — | Número WhatsApp do usuário |
| `nomeAgrDs` | TEXT | SIM | — | Nome do AGR conforme cadastro no Digisac |
| `unidade` | TEXT | SIM | — | Cidade/unidade de atuação |
| `comissao` | DECIMAL(5,2) | SIM | — | Percentual de comissão pessoal |
| `createdAt` | TIMESTAMP | NÃO | now() | Data de criação |
| `updatedAt` | TIMESTAMP | NÃO | auto | Data da última atualização |

**Índices únicos:** `username`, `email`

**Relacionamentos:**
- 1:N com `sessoes`, `audit_logs`, `pedidos`, `historico_contatos`, `orcamentos`, `sessao_atividade`
- 1:N com `parceiros` (como responsável)

**Possíveis redundâncias:**
- `email` pode ser nulo após a migração que separou login em `username` — dois campos para o mesmo conceito de "identificador de acesso".

**Possíveis melhorias:**
- Separar `username`/`email` em tabela de credenciais para suportar múltiplos métodos de login.
- Campo `comissao` pouco usado — poderia ser gerenciado pela tabela `comissoes`.

---

### Tabela: `sessoes`

**Finalidade:** Armazena sessões JWT ativas de usuários autenticados.

**Origem dos dados:** Criadas automaticamente no login (NextAuth).

**Quem utiliza:** Middleware de autenticação (`src/lib/auth.ts`).

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `token` | TEXT | NÃO | — | Token de sessão (único) |
| `usuarioId` | TEXT | NÃO | — | **FK** → usuarios.id (CASCADE DELETE) |
| `expiresAt` | TIMESTAMP | NÃO | — | Data/hora de expiração |
| `createdAt` | TIMESTAMP | NÃO | now() | Data de criação |

**Índices únicos:** `token`

**Comportamento de deleção:** Ao deletar o usuário, todas as sessões são deletadas em cascata.

**Possíveis melhorias:**
- Limpeza periódica de sessões expiradas (sem job dedicado atualmente).

---

### Tabela: `sessao_atividade`

**Finalidade:** Registra quantos minutos por dia cada usuário ficou ativo no sistema. Usado para relatórios de produtividade.

**Origem dos dados:** Heartbeat automático do frontend (componente `inatividade-watcher`).

**Quem utiliza:** Dashboard (widget de atividade), relatórios internos.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `usuarioId` | TEXT | NÃO | — | **FK** → usuarios.id (CASCADE DELETE) |
| `data` | TIMESTAMP | NÃO | — | Data do registro (por dia) |
| `minutosAtivos` | INTEGER | NÃO | `0` | Total de minutos ativos no dia |

**Índice único:** `(usuarioId, data)` — um registro por usuário por dia.

---

### Tabela: `clientes`

**Finalidade:** Cadastro central de todos os titulares de certificados digitais (PF e PJ).

**Origem dos dados:** Cadastro manual em `/clientes/novo`, preenchimento automático durante nova venda, importação em massa.

**Quem utiliza:** Pedidos, certificados, e-mail, histórico de contatos, renovações, portal do parceiro.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `tipoPessoa` | TipoPessoa (enum) | NÃO | — | `PF` ou `PJ` |
| `nome` | TEXT | NÃO | — | Nome completo (PF) ou razão social resumida (PJ) |
| `email` | TEXT | SIM | — | E-mail principal |
| `telefone` | TEXT | SIM | — | Telefone fixo |
| `celular` | TEXT | SIM | — | Celular / WhatsApp |
| `cpf` | TEXT | SIM | — | CPF (único quando informado) |
| `cnpj` | TEXT | SIM | — | CNPJ (único quando informado) |
| `rg` | TEXT | SIM | — | RG (não enviado à Safeweb) |
| `dataNascimento` | TIMESTAMP | SIM | — | Data de nascimento (obrigatória para PF na Safeweb) |
| `razaoSocial` | TEXT | SIM | — | Razão social completa (PJ) |
| `nomeFantasia` | TEXT | SIM | — | Nome fantasia (PJ) |
| `responsavel` | TEXT | SIM | — | Nome do responsável PJ (texto livre, legado) |
| `cep` | TEXT | SIM | — | CEP do endereço |
| `logradouro` | TEXT | SIM | — | Rua/Av. |
| `numero` | TEXT | SIM | — | Número |
| `complemento` | TEXT | SIM | — | Complemento |
| `bairro` | TEXT | SIM | — | Bairro |
| `cidade` | TEXT | SIM | — | Cidade |
| `estado` | TEXT | SIM | — | Sigla da UF (ex: SP) |
| `observacoes` | TEXT | SIM | — | Observações livres |
| `grupo` | TEXT | SIM | — | Agrupamento de clientes (ex: contabilidade) |
| `pisNis` | TEXT | SIM | — | PIS/NIS |
| `ddd` | TEXT | SIM | — | DDD separado do celular (exigido pela Safeweb) |
| `ativo` | BOOLEAN | NÃO | `true` | Soft delete |
| `parceiroId` | TEXT | SIM | — | **FK** → parceiros.id (SET NULL) |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Índices únicos:** `cpf`, `cnpj`

**Relacionamentos:**
- N:1 com `parceiros` (cliente indicado por parceiro)
- 1:N com `certificados`, `pedidos`, `email_logs`, `historico_contatos`

**Possíveis redundâncias:**
- `responsavel` (TEXT) e o relacionamento via `pedidos.responsavelDados` servem ao mesmo propósito de identificar o responsável PJ. O campo de texto é legado; o dado preciso fica no cadastro do responsável como cliente PF separado.
- `ddd` e `celular` poderiam ser um único campo `telefone_completo`.

**Possíveis melhorias:**
- Separar endereço em tabela própria para reutilização (cliente pode ter mais de um endereço).
- Adicionar campo `cnpjResponsavel` para PJ quando o responsável não está cadastrado como cliente.

---

### Tabela: `historico_contatos`

**Finalidade:** Log de cada contato realizado com um cliente (WhatsApp, e-mail, ligação), associado opcionalmente a um certificado específico.

**Origem dos dados:** Registrado manualmente na tela de renovações e na ficha do cliente; gerado automaticamente pelo sistema ao enviar WhatsApp/e-mail.

**Quem utiliza:** Módulo de renovações, ficha do cliente, página de notificações.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `clienteId` | TEXT | NÃO | — | **FK** → clientes.id (CASCADE DELETE) |
| `certificadoId` | TEXT | SIM | — | **FK** → certificados.id (opcional) |
| `observacao` | TEXT | NÃO | — | Descrição do contato realizado |
| `dataContato` | TIMESTAMP | NÃO | now() | Data/hora do contato |
| `proximoContato` | TIMESTAMP | SIM | — | Data agendada para próximo contato |
| `usuarioId` | TEXT | SIM | — | **FK** → usuarios.id (quem registrou) |
| `createdAt` | TIMESTAMP | NÃO | now() | |

**Possíveis redundâncias:**
- O campo `observacao` armazena o texto do contato incluindo o canal (ex: "WhatsApp enviado: ..."). Uma separação em `canal` (enum: WHATSAPP, EMAIL, LIGACAO, VISITA) e `conteudo` tornaria os dados mais estruturados.

---

### Tabela: `parceiros`

**Finalidade:** Cadastro de parceiros indicadores (contadores, escritórios) e fornecedores. Distinguidos pelo campo `tipo`.

**Origem dos dados:** Cadastro manual em `/parceiros/novo` ou `/fornecedores/novo`.

**Quem utiliza:** Clientes (vinculação), pedidos (rastreamento de origem), financeiro (comissões), portal do parceiro.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `tipoPessoa` | TipoPessoa | NÃO | — | `PF` ou `PJ` |
| `nome` | TEXT | NÃO | — | Nome ou razão social |
| `email` | TEXT | SIM | — | E-mail principal |
| `telefone` | TEXT | SIM | — | Telefone |
| `celular` | TEXT | SIM | — | Celular |
| `cpf` | TEXT | SIM | — | CPF (único) |
| `cnpj` | TEXT | SIM | — | CNPJ (único) |
| `razaoSocial` | TEXT | SIM | — | Razão social completa |
| `nomeFantasia` | TEXT | SIM | — | Nome fantasia |
| `tipo` | TEXT | NÃO | — | `Parceiro`, `Fornecedor`, `Contabilidade`, etc. |
| `banco` | TEXT | SIM | — | Banco para pagamento de comissão |
| `agencia` | TEXT | SIM | — | Agência bancária |
| `conta` | TEXT | SIM | — | Número da conta |
| `tipoConta` | TEXT | SIM | — | `Corrente` ou `Poupança` |
| `chavePix` | TEXT | SIM | — | Chave Pix |
| `nivel` | TEXT | SIM | — | Nível do parceiro (Bronze, Prata, Ouro, etc.) |
| `tipoParceria` | TEXT | SIM | — | Tipo da parceria (texto livre) |
| `renovacoes` | TEXT | SIM | — | Obs sobre renovações |
| `responsavelId` | TEXT | SIM | — | **FK** → usuarios.id (AGR responsável) |
| `contadorResponsavel` | TEXT | SIM | — | Nome do contador responsável (texto) |
| `pessoaContato` | TEXT | SIM | — | Pessoa de contato na empresa parceira |
| `emailAlternativo` | TEXT | SIM | — | E-mail secundário |
| `telefone2` | TEXT | SIM | — | Telefone adicional |
| `informacoesEnvio` | TEXT | SIM | — | Instruções especiais de envio (texto longo) |
| `tipoComissao` | TEXT | SIM | — | Forma de pagamento da comissão |
| `diaPagamento` | INTEGER | SIM | — | Dia do mês para pagamento |
| `loginParceiro` | TEXT | SIM | — | Login para o portal do parceiro (único) |
| `senhaParceiro` | TEXT | SIM | — | Senha do portal (hash bcrypt) |
| `statusPainel` | BOOLEAN | NÃO | `false` | Portal ativo/inativo |
| `permissoesPainel` | JSONB | SIM | — | Permissões customizadas do painel |
| `whatsappVencimentoAtivo` | BOOLEAN | NÃO | `true` | Recebe alertas WhatsApp de vencimento |
| `emailVencimentoAtivo` | BOOLEAN | NÃO | `true` | Recebe alertas e-mail de vencimento |
| `observacoes` | TEXT | SIM | — | Observações livres |
| `ativo` | BOOLEAN | NÃO | `true` | Soft delete |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Índices únicos:** `cpf`, `cnpj`, `loginParceiro`

**Relacionamentos:**
- 1:N com `clientes`, `pedidos`, `lancamentos`, `comissoes`, `contatos_parceiro`
- N:1 com `usuarios` (responsavelId)

**Possíveis redundâncias:**
- A tabela mistura parceiros indicadores e fornecedores no mesmo cadastro, distinguidos apenas pelo campo `tipo` (texto livre). Isso impede restrições diferenciadas e dificulta relatórios.

**Possíveis melhorias:**
- Separar `Fornecedor` em tabela própria com campos específicos (prazo de entrega, produtos fornecidos).
- `permissoesPainel` como JSONB sem schema definido é difícil de validar e manter.

---

### Tabela: `contatos_parceiro`

**Finalidade:** Múltiplos contatos (pessoas) dentro de um mesmo parceiro/empresa.

**Origem dos dados:** Cadastrado na página de detalhe do parceiro.

**Quem utiliza:** Ficha do parceiro.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `parceiroId` | TEXT | NÃO | — | **FK** → parceiros.id (CASCADE DELETE) |
| `nome` | TEXT | NÃO | — | Nome do contato |
| `cpf` | TEXT | SIM | — | CPF |
| `cargo` | TEXT | SIM | — | Cargo na empresa |
| `dataNascimento` | TIMESTAMP | SIM | — | Data de nascimento |
| `telefone` | TEXT | SIM | — | Telefone |
| `email` | TEXT | SIM | — | E-mail |
| `createdAt` | TIMESTAMP | NÃO | now() | |

---

### Tabela: `comissoes`

**Finalidade:** Define a tabela de comissão de cada parceiro por modelo de certificado. Suporta percentual, valor fixo, custo e valor ao cliente.

**Origem dos dados:** Configurada na ficha do parceiro.

**Quem utiliza:** Financeiro (cálculo de comissões), relatórios.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `parceiroId` | TEXT | NÃO | — | **FK** → parceiros.id (RESTRICT) |
| `modeloId` | TEXT | NÃO | — | **FK** → modelos_certificado.id (RESTRICT) |
| `percentual` | DECIMAL(5,2) | SIM | — | % de comissão sobre o valor da venda |
| `valorFixo` | DECIMAL(10,2) | SIM | — | Valor fixo de comissão por certificado |
| `valorCusto` | DECIMAL(10,2) | SIM | — | Custo do certificado para a AR |
| `valorCliente` | DECIMAL(10,2) | SIM | — | Preço sugerido ao cliente final |
| `ativo` | BOOLEAN | NÃO | `true` | |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Índice único:** `(parceiroId, modeloId)` — um parceiro só tem uma linha de comissão por modelo.

**Possíveis melhorias:**
- Não existe lógica de cálculo automático de comissão no sistema — a tabela existe mas o pagamento é manual.
- Os campos `percentual` e `valorFixo` são mutuamente exclusivos na prática, mas o banco não impõe essa regra.

---

### Tabela: `modelos_certificado`

**Finalidade:** Catálogo de produtos (tipos de certificado digital) que a AR oferece. Cada modelo corresponde a uma SKU.

**Origem dos dados:** Cadastrado manualmente em `/configuracoes/modelos`.

**Quem utiliza:** Nova venda (seleção de produto), buscarProduto Safeweb, comissões, itens_pedido, certificados.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `nome` | TEXT | NÃO | — | Nome comercial (ex: "e-CPF A3 Nuvem 1 Ano") |
| `descricao` | TEXT | SIM | — | Descrição adicional |
| `tipoPessoa` | TipoPessoa | NÃO | — | `PF` (e-CPF) ou `PJ` (e-CNPJ) |
| `tipoCertificado` | TipoCertificado | NÃO | — | `A1` ou `A3` |
| `suporte` | SuporteCertificado | NÃO | — | `TOKEN`, `CARTAO`, `NUVEM` ou `ARQUIVO` |
| `validadeMeses` | INTEGER | NÃO | `12` | Validade em meses (12 = 1 ano, 24 = 2 anos) |
| `preco` | DECIMAL(10,2) | NÃO | — | Preço de tabela |
| `codigoSafeweb` | TEXT | SIM | — | Código interno Safeweb (não usado na integração atual) |
| `ativo` | BOOLEAN | NÃO | `true` | |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Relacionamentos:**
- 1:N com `certificados`, `itens_pedido`, `comissoes`

**Regras de negócio:**
- O `idProduto` Safeweb **não** é armazenado aqui — é consultado em tempo real via API Safeweb durante a venda, usando `tipoPessoa`, `tipoCertificado`, `suporte` e `validadeMeses` como filtros.
- `codigoSafeweb` existe mas não é utilizado na integração atual.

**Possíveis melhorias:**
- Armazenar o `idProduto` Safeweb em cache nesta tabela reduziria uma chamada de API a cada venda.

---

### Tabela: `certificados`

**Finalidade:** Registro de cada certificado digital emitido para um cliente. É a principal tabela de pós-venda.

**Origem dos dados:** Criado manualmente ou via integração após emissão confirmada pela Safeweb (webhook).

**Quem utiliza:** Renovações (consulta por dataVencimento), ficha do cliente, relatórios, portal do parceiro.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `clienteId` | TEXT | NÃO | — | **FK** → clientes.id (RESTRICT) |
| `modeloId` | TEXT | NÃO | — | **FK** → modelos_certificado.id (RESTRICT) |
| `pedidoId` | TEXT | SIM | — | **FK** → pedidos.id (SET NULL) |
| `numeroSerie` | TEXT | SIM | — | Número de série do certificado emitido |
| `dataEmissao` | TIMESTAMP | NÃO | — | Data de emissão |
| `dataVencimento` | TIMESTAMP | NÃO | — | Data de vencimento (base do módulo renovações) |
| `status` | StatusCertificado | NÃO | `ATIVO` | `ATIVO`, `VENCIDO`, `CANCELADO` ou `RENOVADO` |
| `safewebId` | TEXT | SIM | — | ID interno da Safeweb (uso futuro) |
| `observacoes` | TEXT | SIM | — | Observações |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Relacionamentos:**
- N:1 com `clientes`, `modelos_certificado`, `pedidos`
- 1:N com `email_logs`, `historico_contatos`

**Possíveis redundâncias:**
- O status do certificado (`ATIVO`, `VENCIDO`) não é atualizado automaticamente pelo sistema — depende de job ou atualização manual. Pode haver divergência entre `dataVencimento` passada e `status = ATIVO`.

**Possíveis melhorias:**
- Job diário para atualizar `status = VENCIDO` quando `dataVencimento < hoje`.
- Vincular `safewebId` ao protocolo do pedido para rastreabilidade completa.

---

### Tabela: `pedidos`

**Finalidade:** Registro de cada venda de certificado digital. É a tabela central da operação, conectando cliente, produto, usuário, parceiro, protocolos Safeweb e financeiro.

**Origem dos dados:** Criado pelo fluxo de nova venda em `/pedidos/nova-venda`.

**Quem utiliza:** Monitoramento, dashboard, financeiro, webhook Safeweb, Hope Portal, portal do parceiro.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `numero` | TEXT | NÃO | — | Número único (ex: PED-202606-10355) — gerado pelo sistema |
| `clienteId` | TEXT | NÃO | — | **FK** → clientes.id (RESTRICT) |
| `parceiroId` | TEXT | SIM | — | **FK** → parceiros.id (SET NULL) |
| `usuarioId` | TEXT | NÃO | — | **FK** → usuarios.id (RESTRICT) — AGR que fez a venda |
| `agr` | TEXT | SIM | — | Chave textual do AGR (ex: `ana.karolina`, `vinicius`) |
| `status` | StatusPedido | NÃO | `GERADO` | `GERADO` → `VERIFICADO` → `EMITIDO` ou `CANCELADO` |
| `valorTotal` | DECIMAL(10,2) | NÃO | — | Valor bruto |
| `desconto` | DECIMAL(10,2) | NÃO | `0` | Desconto aplicado |
| `valorFinal` | DECIMAL(10,2) | NÃO | — | Valor efetivo (valorTotal − desconto) |
| `formaPagamento` | TEXT | SIM | — | Forma de pagamento (texto livre) |
| `tipoAtendimento` | TEXT | SIM | — | `videoconferencia`, `presencial` ou `emissao-online` |
| `agr` | TEXT | SIM | — | Chave do AGR responsável |
| `numeroCompra` | TEXT | SIM | — | Protocolo Safeweb (cópia usada pelo Hope webhook) |
| `safewebProtocolo` | TEXT | SIM | — | Protocolo gerado na Safeweb (campo principal) |
| `safewebStatus` | TEXT | SIM | — | Último evento do webhook Safeweb |
| `safewebSerieA3` | TEXT | SIM | — | Série do cert A3 PF (emissão online) |
| `hopeUrlDocumentos` | TEXT | SIM | — | Link do Hope Portal para upload de documentos |
| `popupNotificacaoVisto` | BOOLEAN | NÃO | `false` | Se o AGR já fechou o popup de "Certificado Emitido" |
| `voucher` | TEXT | SIM | — | Código de voucher aplicado |
| `boletoUrl` | TEXT | SIM | — | URL do boleto gerado |
| `boletoCodigo` | TEXT | SIM | — | Linha digitável do boleto |
| `boletoVencimento` | TIMESTAMP | SIM | — | Vencimento do boleto |
| `contabilidade` | TEXT | SIM | — | Escritório contábil / parceiro indicador |
| `codigoCobranca` | TEXT | SIM | — | Código de cobrança financeiro |
| `atendimentoExterno` | BOOLEAN | NÃO | `false` | Se houve deslocamento externo |
| `valorDeslocamento` | DECIMAL(10,2) | SIM | — | Valor da taxa de deslocamento |
| `unidadeAtendimento` | TEXT | SIM | — | Cidade/unidade onde ocorreu |
| `verificadoEm` | TIMESTAMP | SIM | — | Timestamp da verificação de cadastro |
| `emitidoEm` | TIMESTAMP | SIM | — | Timestamp da emissão do certificado |
| `observacoes` | TEXT | SIM | — | Observações livres |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Índice único:** `numero`

**Relacionamentos:**
- N:1 com `clientes`, `parceiros`, `usuarios`
- 1:N com `itens_pedido`, `lancamentos`, `certificados`

**Regras de negócio críticas:**
- `numero` segue o padrão `PED-AAAAMM-NNNNN` (gerado aleatoriamente, sem garantia de sequência).
- `safewebProtocolo` e `numeroCompra` guardam o mesmo valor — o webhook usa ambos para localizar o pedido (`OR` na query).
- A regra completa de geração do protocolo está documentada em `docs/protocolo.md`.
- Status segue transição unidirecional: `GERADO → VERIFICADO → EMITIDO`. O cancelamento pode ocorrer em qualquer etapa.

**Possíveis redundâncias:**
- `safewebProtocolo` e `numeroCompra` armazenam o mesmo valor. Existe por motivo histórico de compatibilidade. Ver `docs/protocolo.md`.
- `agr` (texto) e `usuarioId` (FK) representam o mesmo AGR — duplicação para facilitar filtros sem JOIN.

**Possíveis melhorias:**
- Unificar `safewebProtocolo` e `numeroCompra` em um único campo após confirmar que o webhook usa apenas um deles.
- Adicionar constraint de transição de status no banco (trigger) para evitar retrocesso acidental.

---

### Tabela: `itens_pedido`

**Finalidade:** Itens individuais de cada pedido. Estrutura de N itens por pedido (atualmente sempre 1 item por pedido).

**Origem dos dados:** Criado junto com o pedido no fluxo de nova venda.

**Quem utiliza:** Relatórios, cálculo de valor, vinculação de modelo ao pedido.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `pedidoId` | TEXT | NÃO | — | **FK** → pedidos.id (CASCADE DELETE) |
| `modeloId` | TEXT | NÃO | — | **FK** → modelos_certificado.id (RESTRICT) |
| `quantidade` | INTEGER | NÃO | `1` | Quantidade (sempre 1 no uso atual) |
| `precoUnit` | DECIMAL(10,2) | NÃO | — | Preço unitário no momento da venda |
| `desconto` | DECIMAL(10,2) | NÃO | `0` | Desconto no item |
| `subtotal` | DECIMAL(10,2) | NÃO | — | `precoUnit × quantidade − desconto` |

**Comportamento de deleção:** Ao deletar o pedido, todos os itens são deletados em cascata.

**Possíveis redundâncias:**
- `precoUnit` e `subtotal` são calculados e armazenados — `subtotal` poderia ser uma coluna calculada, mas o armazenamento explícito garante histórico correto mesmo se o preço do modelo mudar.

---

### Tabela: `lancamentos`

**Finalidade:** Controle financeiro de contas a receber e a pagar. Inclui integração com Banco Inter para geração de cobranças.

**Origem dos dados:** Criado automaticamente quando o pedido é marcado como `EMITIDO` (certificado emitido) — ver [ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md](./ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md); criado manualmente em `/financeiro/contas-a-receber/novo` e `/financeiro/contas-a-pagar/novo`.

**Quem utiliza:** Módulo financeiro, conciliações Inter, relatórios.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `tipo` | TipoLancamento | NÃO | — | `RECEBER` ou `PAGAR` |
| `descricao` | TEXT | NÃO | — | Descrição do lançamento |
| `valor` | DECIMAL(10,2) | NÃO | — | Valor |
| `dataVencimento` | TIMESTAMP | NÃO | — | Data de vencimento |
| `dataPagamento` | TIMESTAMP | SIM | — | Data em que foi efetivamente pago/recebido |
| `status` | StatusLancamento | NÃO | `PENDENTE` | `PENDENTE`, `PAGO`, `VENCIDO` ou `CANCELADO` |
| `categoriaId` | TEXT | SIM | — | **FK** → categorias_financeiras.id (SET NULL) |
| `pedidoId` | TEXT | SIM | — | **FK** → pedidos.id (SET NULL) |
| `parceiroId` | TEXT | SIM | — | ID do parceiro (sem FK declarada no banco) |
| `comprovante` | TEXT | SIM | — | URL do comprovante de pagamento |
| `notaFiscal` | TEXT | SIM | — | Número ou URL da nota fiscal |
| `boleto` | TEXT | SIM | — | Linha digitável do boleto |
| `observacoes` | TEXT | SIM | — | Observações |
| `referencia` | TEXT | SIM | — | Número de referência (ex: número do pedido) |
| `tipoConta` | TEXT | SIM | — | Tipo da conta (ex: `Certificado`, `Comissão`) |
| `centroCusto` | TEXT | SIM | — | Centro de custo |
| `formaPagamento` | TEXT | SIM | — | Forma de pagamento |
| `banco` | TEXT | SIM | — | Banco associado ao lançamento |
| `interCobrancaId` | TEXT | SIM | — | Nosso número Inter (para rastreio da cobrança) |
| `pixCopiaECola` | TEXT | SIM | — | Código Pix copia e cola |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Relacionamentos:**
- N:1 com `pedidos`, `categorias_financeiras`
- `parceiroId` referencia `parceiros.id` mas **sem FK declarada** — risco de inconsistência.

**Possíveis redundâncias:**
- `boleto` (linha digitável aqui) e `boletoUrl`/`boletoCodigo` em `pedidos` duplicam dados do mesmo boleto.

**Possíveis melhorias:**
- Declarar FK de `parceiroId` para garantir integridade referencial.
- `status = VENCIDO` não é atualizado automaticamente — dependeria de job diário comparando `dataVencimento`.

---

### Tabela: `categorias_financeiras`

**Finalidade:** Categorias para classificar lançamentos financeiros (ex: Certificado, Comissão, Aluguel).

**Origem dos dados:** Cadastrado manualmente (sem tela dedicada no frontend — gerenciado diretamente).

**Quem utiliza:** `lancamentos.categoriaId`, relatórios.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `nome` | TEXT | NÃO | — | Nome da categoria |
| `tipo` | TipoTransacao | NÃO | — | `RECEITA` ou `DESPESA` |
| `cor` | TEXT | SIM | — | Cor em hex para exibição |
| `ativo` | BOOLEAN | NÃO | `true` | |
| `createdAt` | TIMESTAMP | NÃO | now() | |

**Possíveis melhorias:**
- Não existe tela de gerenciamento de categorias no frontend.

---

### Tabela: `templates_email`

**Finalidade:** Templates HTML/texto dos e-mails automáticos enviados aos clientes (alertas de vencimento, pós-emissão, nutrição).

**Origem dos dados:** Configurado em `/configuracoes/emails`.

**Quem utiliza:** Jobs automáticos de envio de e-mail (`/api/jobs/processar-emails`).

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `tipo` | TipoEmailAutomatico | NÃO | — | Tipo único do template |
| `assunto` | TEXT | NÃO | — | Assunto do e-mail |
| `corpo` | TEXT | NÃO | — | Corpo em HTML/Markdown |
| `ativo` | BOOLEAN | NÃO | `true` | |
| `updatedAt` | TIMESTAMP | NÃO | auto | |

**Índice único:** `tipo` — um único template por tipo.

**Tipos disponíveis:**

| Tipo | Quando disparado |
|---|---|
| `VENCIMENTO_60` | 60 dias antes do vencimento |
| `VENCIMENTO_30` | 30 dias antes |
| `VENCIMENTO_15` | 15 dias antes |
| `VENCIMENTO_7` | 7 dias antes |
| `POS_EMISSAO` | Após emissão do certificado |
| `NUTRICAO_3M` | 3 meses após emissão |
| `NUTRICAO_6M` | 6 meses após emissão |
| `NUTRICAO_9M` | 9 meses após emissão |

---

### Tabela: `email_logs`

**Finalidade:** Log de todos os e-mails enviados ou agendados para clientes.

**Origem dos dados:** Registrado pelo sistema ao enviar ou agendar e-mail automático.

**Quem utiliza:** Jobs de envio, relatórios de comunicação, evita reenvio duplicado.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `clienteId` | TEXT | NÃO | — | **FK** → clientes.id (RESTRICT) |
| `certificadoId` | TEXT | SIM | — | **FK** → certificados.id (SET NULL) |
| `tipo` | TipoEmailAutomatico | NÃO | — | Tipo do e-mail |
| `destinatario` | TEXT | NÃO | — | E-mail de destino (cópia no momento do envio) |
| `assunto` | TEXT | NÃO | — | Assunto usado |
| `status` | StatusEmail | NÃO | `PENDENTE` | `PENDENTE`, `ENVIADO` ou `ERRO` |
| `erro` | TEXT | SIM | — | Mensagem de erro se falhou |
| `enviadoEm` | TIMESTAMP | SIM | — | Timestamp do envio bem-sucedido |
| `agendadoPara` | TIMESTAMP | SIM | — | Data/hora programada para envio |
| `createdAt` | TIMESTAMP | NÃO | now() | |

---

### Tabela: `audit_logs`

**Finalidade:** Trilha de auditoria completa de todas as ações relevantes no sistema (CREATE, UPDATE, DELETE).

**Origem dos dados:** Gerado pela função `registrarAuditoria()` em `src/lib/audit.ts`, chamada em todas as rotas de mutação.

**Quem utiliza:** Tela de auditoria em `/configuracoes/auditoria`.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `usuarioId` | TEXT | SIM | — | **FK** → usuarios.id (SET NULL) |
| `acao` | TEXT | NÃO | — | Ação realizada (`CREATE`, `UPDATE`, `DELETE`) |
| `entidade` | TEXT | NÃO | — | Nome da entidade afetada (ex: `Pedido`, `Cliente`) |
| `entidadeId` | TEXT | SIM | — | ID do registro afetado |
| `dados` | JSONB | SIM | — | Snapshot dos dados no momento da ação |
| `ip` | TEXT | SIM | — | IP do cliente |
| `createdAt` | TIMESTAMP | NÃO | now() | |

**Comportamento de deleção:** Ao deletar o usuário, o campo `usuarioId` vira NULL (histórico preservado).

**Possíveis melhorias:**
- Sem índice em `entidade` + `entidadeId` — buscas por entidade podem ser lentas com volume alto.
- Sem política de retenção — a tabela cresce indefinidamente.

---

### Tabela: `configuracoes`

**Finalidade:** Armazenamento de configurações persistentes do sistema em formato chave-valor. Usado para dados que variam em produção mas não são variáveis de ambiente.

**Origem dos dados:** Salvo pelas telas de configurações (assistente, empresa, etc.).

**Quem utiliza:** Assistente IA (base de conhecimento, PDFs indexados), dados da empresa.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `chave` | TEXT | NÃO | — | Chave única (ex: `assistente_conhecimento`, `empresa_nome`) |
| `valor` | TEXT | NÃO | — | Valor (pode ser JSON serializado para dados complexos) |

**Índice único:** `chave`

**Chaves conhecidas em uso:**

| Chave | Conteúdo |
|---|---|
| `assistente_conhecimento` | Texto base de conhecimento do assistente IA |
| `assistente_pdfs` | JSON com metadados dos PDFs indexados |
| `empresa_*` | Dados cadastrais da empresa/AR |

**Possíveis melhorias:**
- Sem tipagem — `valor` é sempre TEXT, mesmo para números ou JSONs. Sem validação de schema.

---

### Tabela: `noticias`

**Finalidade:** Comunicados e notícias publicados pela AR para exibição no portal do parceiro e painel interno.

**Origem dos dados:** Cadastrado em `/noticias/nova`.

**Quem utiliza:** Portal do parceiro, painel interno de notícias.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `titulo` | TEXT | NÃO | — | Título |
| `resumo` | TEXT | SIM | — | Resumo curto |
| `conteudo` | TEXT | NÃO | — | Conteúdo completo (Markdown) |
| `categoria` | TEXT | NÃO | `Avisos` | Categoria: Avisos, Legislação, Novos Serviços, Promoções |
| `publicada` | BOOLEAN | NÃO | `false` | Controla visibilidade no portal |
| `fixada` | BOOLEAN | NÃO | `false` | Destaque no topo da lista |
| `autorNome` | TEXT | SIM | — | Nome do autor (texto livre) |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | now() | |

**Possíveis melhorias:**
- `autorNome` como texto livre — poderia ser FK para `usuarios.id` para rastreabilidade.
- `categoria` como TEXT sem enum — qualquer valor pode ser inserido.

---

### Tabela: `sst_leads`

**Finalidade:** Pipeline de prospecção de leads para o serviço de SST (Segurança e Saúde no Trabalho).

**Origem dos dados:** Cadastrado manualmente em `/sst`.

**Quem utiliza:** Módulo SST (kanban).

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `nome` | TEXT | NÃO | — | Nome do contato / lead |
| `empresa` | TEXT | SIM | — | Empresa |
| `cnpj` | TEXT | SIM | — | CNPJ |
| `telefone` | TEXT | SIM | — | Telefone |
| `email` | TEXT | SIM | — | E-mail |
| `funcionarios` | INTEGER | SIM | — | Número de funcionários |
| `laudos` | TEXT | SIM | — | Laudos necessários |
| `valorEstimado` | DECIMAL(10,2) | SIM | — | Valor estimado do contrato |
| `parcelas` | INTEGER | SIM | — | Número de parcelas |
| `origem` | TEXT | SIM | — | Canal de origem (WhatsApp, indicação, etc.) |
| `etapa` | TEXT | NÃO | `PROSPECCAO` | Etapa do funil: `PROSPECCAO`, `PROPOSTA`, `FECHADO`, `PERDIDO` |
| `observacoes` | TEXT | SIM | — | Obs livres |
| `responsavelNome` | TEXT | SIM | — | Nome do responsável (texto livre) |
| `createdAt` | TIMESTAMP | NÃO | now() | |
| `updatedAt` | TIMESTAMP | NÃO | now() | |

**Relacionamentos:**
- 1:N com `sst_historico`

**Possíveis redundâncias:**
- `responsavelNome` como texto — poderia ser FK para `usuarios.id`.
- Não há integração com o módulo financeiro ou de pedidos.

---

### Tabela: `sst_historico`

**Finalidade:** Log de interações e evoluções de cada lead SST.

**Origem dos dados:** Registrado no kanban SST ao mover o card ou adicionar observação.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `leadId` | TEXT | NÃO | — | **FK** → sst_leads.id (CASCADE DELETE) |
| `texto` | TEXT | NÃO | — | Descrição da interação |
| `autorNome` | TEXT | SIM | — | Nome de quem registrou (texto livre) |
| `createdAt` | TIMESTAMP | NÃO | now() | |

---

### Tabela: `orcamentos`

**Finalidade:** Armazena orçamentos gerados pela ferramenta de orçamento. Histórico de cotações.

**Origem dos dados:** Salvo ao gerar orçamento em `/orcamento`.

**Quem utiliza:** Tela de orçamento.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `destinatario` | TEXT | NÃO | — | Nome do destinatário |
| `itens` | JSONB | NÃO | `[]` | Array de itens do orçamento |
| `formas` | TEXT[] | NÃO | `{}` | Formas de pagamento aceitas |
| `total` | DECIMAL(10,2) | NÃO | `0` | Total do orçamento |
| `geradoPor` | TEXT | SIM | — | **FK** → usuarios.id (SET NULL) |
| `createdAt` | TIMESTAMP | NÃO | now() | |

**Possíveis melhorias:**
- `itens` como JSONB sem schema fixo — dificulta queries e relatórios sobre os produtos orçados.

---

### Tabela: `posts_social`

**Finalidade:** Armazena posts de redes sociais gerados pela IA para o calendário editorial.

**Origem dos dados:** Gerado pela IA Anthropic via `/api/social/gerar`.

**Quem utiliza:** Módulo de conteúdo social em `/conteudo`.

| Campo | Tipo PostgreSQL | Nulo | Padrão | Descrição |
|---|---|---|---|---|
| `id` | TEXT | NÃO | cuid() | **PK** |
| `categoria` | TEXT | NÃO | — | Categoria: EDUCATIVO, BENEFICIO, CTA, SEGMENTO, etc. |
| `semana` | INTEGER | NÃO | `1` | Número da semana no mês |
| `diaSemana` | TEXT | NÃO | — | `SEGUNDA`, `QUARTA` ou `SEXTA` |
| `headline` | TEXT | NÃO | — | Título do post |
| `legenda` | TEXT | NÃO | — | Legenda completa |
| `hashtags` | TEXT | NÃO | `''` | Hashtags sugeridas |
| `status` | TEXT | NÃO | `PENDENTE` | `PENDENTE` ou `APROVADO` |
| `criadoEm` | TIMESTAMP | NÃO | now() | |

---

## Observações Globais

### Padrão de identificadores
Todos os IDs são `TEXT` gerados via `cuid()` (Collision-resistant Unique Identifiers). Não são UUID padrão — são strings alfanuméricas prefixadas com `c` (ex: `clx1234abcd...`). Isso significa que não há ordenação natural por tempo nos IDs (use `createdAt` para isso).

### Soft delete
As tabelas `usuarios`, `clientes`, `parceiros`, `modelos_certificado` e `comissoes` implementam soft delete via campo `ativo BOOLEAN`. Registros inativados permanecem no banco e nas foreign keys. Nenhuma tabela usa hard delete automático por inativação.

### Sem foreign key: `lancamentos.parceiroId`
O campo `parceiroId` em `lancamentos` não tem foreign key declarada no banco. Isso é um risco de integridade: um parceiro pode ser deletado sem que seus lançamentos percam a referência (ficarão com `parceiroId` apontando para um ID inexistente).

### Migração incremental
O sistema não usa o sistema de migrations do Prisma (`prisma migrate`). Em vez disso, usa um script customizado (`scripts/migrate.js`) executado a cada build no Vercel. Cada `ALTER TABLE` é idempotente (`IF NOT EXISTS`), mas a ordem das operações é linear e não versionada. Isso torna difícil reverter uma migração específica.

### Enums legados no PostgreSQL
O enum `StatusPedido` contém os valores originais `PENDENTE`, `EM_ANDAMENTO` e `CONCLUIDO` que foram substituídos por `GERADO`, `VERIFICADO` e `EMITIDO`. Os valores antigos ainda existem no tipo PostgreSQL (não podem ser removidos sem recriar o tipo), mas não são mais usados pelo código.

### Ausência de índices de performance
Além dos índices únicos declarados, não há índices de busca adicionais. Queries frequentes que podem ser lentas com volume alto:
- `certificados` filtrado por `dataVencimento` (usado em renovações)
- `pedidos` filtrado por `status`, `agr` e `createdAt` (usado no monitoramento e dashboard)
- `lancamentos` filtrado por `status` e `dataVencimento` (usado no financeiro)
- `audit_logs` filtrado por `entidade` (usado na auditoria)

### JSONB sem schema
Os campos `permissoesPainel` (parceiros), `dados` (audit_logs) e `itens` (orcamentos) são JSONB sem schema fixo. Isso oferece flexibilidade mas elimina validação em nível de banco.