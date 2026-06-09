# Documentação de Integrações — CertFlow

**Versão:** 1.0  
**Data:** 09/06/2026  
**Projeto:** CertFlow — Sistema de Gestão de Certificação Digital V&G

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Mapa de Integrações](#mapa-de-integrações)
3. [Integrações Ativas](#integrações-ativas)
   - [Safeweb PSS](#1-safeweb-pss)
   - [Digisac — WhatsApp](#2-digisac--whatsapp)
   - [SMTP — E-mail](#3-smtp--e-mail)
   - [Anthropic Claude API](#4-anthropic-claude-api)
   - [Google Calendar](#5-google-calendar)
   - [Google Apps Script](#6-google-apps-script)
   - [Banco Inter — Cobranças](#7-banco-inter--cobranças)
   - [Telegram Bot](#8-telegram-bot)
   - [Vercel Blob — Armazenamento](#9-vercel-blob--armazenamento)
   - [BrasilAPI — CNPJ](#10-brasilapi--cnpj)
   - [CNPJ.ws — CNPJ (fallback)](#11-cnpjws--cnpj-fallback)
   - [IBGE — Códigos de Município](#12-ibge--códigos-de-município)
   - [ViaCEP — Geocodificação por CEP](#13-viacep--geocodificação-por-cep)
   - [Nominatim — Geocodificação](#14-nominatim--geocodificação)
   - [OSRM — Roteamento](#15-osrm--roteamento)
   - [Webmail — IMAP / Roundcube](#16-webmail--imap--roundcube)
   - [NextAuth.js — Autenticação](#17-nextauthjs--autenticação)
   - [Vercel Cron — Jobs Agendados](#18-vercel-cron--jobs-agendados)
4. [Webhooks Recebidos](#webhooks-recebidos)
   - [Safeweb Webhook](#safeweb-webhook)
   - [Inter Webhook](#inter-webhook)
   - [Digisac Webhook](#digisac-webhook)
5. [Integrações Parciais ou Incompletas](#integrações-parciais-ou-incompletas)
   - [ReceitaWS — CPF](#receitaws--cpf-parcial)
6. [Riscos Operacionais Identificados](#riscos-operacionais-identificados)
7. [Variáveis de Ambiente Completas](#variáveis-de-ambiente-completas)

---

## Visão Geral

O CertFlow integra **18 serviços externos** entre APIs parceiras, plataformas de comunicação, serviços de autenticação e armazenamento. A tabela abaixo resume o status de cada integração.

| # | Integração | Finalidade | Status |
|---|---|---|---|
| 1 | Safeweb PSS | Emissão e gestão de certificados | ✅ Ativa |
| 2 | Digisac (WhatsApp) | Envio de mensagens e chatbot | ✅ Ativa |
| 3 | SMTP | Envio de e-mails automáticos e relatórios | ✅ Ativa |
| 4 | Anthropic Claude | IA: assistente ZOE, extração de PDF, geração de conteúdo | ✅ Ativa |
| 5 | Google Calendar (OAuth) | Agenda de atendimentos | ✅ Ativa |
| 6 | Google Apps Script | Criação de eventos no Google Calendar (via script) | ✅ Ativa |
| 7 | Banco Inter | Geração de boletos e PIX, confirmação de pagamento | ✅ Ativa |
| 8 | Telegram Bot | Assistente de gestão via Telegram, relatórios | ✅ Ativa |
| 9 | Vercel Blob | Armazenamento de comprovantes e documentos | ✅ Ativa |
| 10 | BrasilAPI | Consulta de CNPJ na Receita Federal | ✅ Ativa |
| 11 | CNPJ.ws | Consulta de CNPJ (fallback do BrasilAPI) | ✅ Ativa |
| 12 | IBGE API | Códigos IBGE de município e UF | ✅ Ativa |
| 13 | ViaCEP | Resolução de CEP para endereço | ✅ Ativa |
| 14 | Nominatim (OpenStreetMap) | Geocodificação de endereços | ✅ Ativa |
| 15 | OSRM | Cálculo de rotas para deslocamento | ✅ Ativa |
| 16 | Webmail IMAP (Roundcube) | Contagem de e-mails não lidos | ✅ Ativa |
| 17 | NextAuth.js | Autenticação interna e do portal do parceiro | ✅ Ativa |
| 18 | Vercel Cron | Agendamento de jobs automáticos | ✅ Ativa |
| 19 | ReceitaWS | Consulta de CPF na Receita Federal | ⚠️ Parcial |

---

## Mapa de Integrações

```
                              ┌─────────────────────┐
                              │     CertFlow         │
                              │  certflow-nine.vercel│
                              └──────────┬──────────┘
                                         │
         ┌───────────┬──────────┬────────┴───┬──────────┬───────────┐
         │           │          │             │          │           │
   ┌─────▼────┐ ┌────▼────┐ ┌──▼──────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼────┐
   │ Safeweb  │ │ Digisac │ │  SMTP   │ │Anthro-│ │ Google │ │ Inter  │
   │   PSS    │ │WhatsApp │ │ E-mail  │ │  pic  │ │Calendar│ │ Banco  │
   └─────┬────┘ └────┬────┘ └─────────┘ └───────┘ └───┬────┘ └───┬────┘
         │           │                                  │          │
   [webhook] [webhook]                           [OAuth2]    [webhook]
         │           │                                  │          │
   /api/safeweb  /api/digisac                  /api/google  /api/inter
   /webhook      /webhook                      /callback    /webhook

         ┌───────────┬──────────┬────────────┬──────────┐
         │           │          │             │          │
   ┌─────▼────┐ ┌────▼────┐ ┌──▼──────┐ ┌───▼───┐ ┌───▼────┐
   │ Telegram │ │  Vercel │ │BrasilAPI│ │ IBGE  │ │ViaCEP/ │
   │   Bot    │ │  Blob   │ │CNPJ.ws  │ │  API  │ │Nominat.│
   └──────────┘ └─────────┘ └─────────┘ └───────┘ └────────┘
```

---

## Integrações Ativas

---

### 1. Safeweb PSS

**Finalidade:** Integração central do sistema. Responsável por toda a comunicação com a plataforma da AR Safeweb para emissão de protocolos, validação biométrica e gestão de certificados digitais.

**Status:** ✅ Ativa em produção

**Arquivo principal:** `src/lib/safeweb.ts`

**Arquivos relacionados:**
- `src/app/api/pedidos/nova-venda/route.ts` — orquestra o fluxo de venda
- `src/app/api/safeweb/webhook/route.ts` — recebe notificações da Safeweb
- `src/app/api/safeweb/consulta-previa/route.ts` — consulta prévia de cadastro
- `src/app/api/safeweb/validar-cert-online/route.ts` — valida certificado A3 PF
- `src/app/api/safeweb/testar/route.ts` — diagnóstico da conexão
- `src/app/api/biometria/route.ts` — validação biométrica do titular

**Autenticação:**
- Tipo: Basic Auth → JWT Token
- Formato: `Authorization: Basic base64(SAFEWEB_IDENTIFICADOR:SAFEWEB_SEGREDO)`
- Token JWT obtido via POST e armazenado em cache por **9 minutos** (renovado 60s antes do vencimento de 10 minutos)
- Cache em memória (não persiste entre deploys / reinicializações do serverless)

**Endpoints utilizados:**

| Endpoint | Método | Finalidade |
|---|---|---|
| `/Shared/HubAutenticacao/Autenticacoes/api/autorizacao/token` | POST | Obter JWT de autenticação |
| `/Shared/Product/api/GetListProdutoByAR/{idTipoEmissao}/{CNPJ_AR}` | GET | Buscar produtos disponíveis |
| `/Shared/Partner/api/ConsultaPrevia` | POST | Consulta prévia de situação cadastral |
| `/Shared/Partner/api/Add/{idTipoEmissao}` | POST | **Criar protocolo de emissão** |
| `/Shared/Partner/api/EmitirCertificadoOnline/{serie}/{idProduto}/{CNPJ_AR}` | GET | Validar certificado A3 PF para emissão online |
| `/Shared/Partner/api/ValidateBiometry/{cpf}` | GET | Validação biométrica (retorna boolean) |
| `/Shared/Partner/api/psbio/consulta/biometria/local` | POST | Biometria local PSBio |
| `/Shared/Partner/api/psbio/consulta/biometria/global` | POST | Biometria global PSBio |
| `/Hope/Shared/api/integration/solicitation` | POST | Vincular protocolo ao Hope Portal (videoconferência) |

**Tipos de emissão:**

| Código | Tipo |
|---|---|
| `3` | Videoconferência |
| `1` | Presencial |
| `5` | Emissão Online |

**Fluxo de entrada (dados enviados para Safeweb):**

```
Nova Venda
  → buscarProduto(idTipoEmissao, tipoPessoa, modelo, validade)
  → [emissão online] validarCertificadoA3PF(serie, idProduto)
  → adicionarVideoconferencia(params, idTipoEmissao)
      payload PF: CnpjAR, CodigoParceiro, idProduto, Nome, CPF, DataNascimento,
                  Contato{DDD, Telefone, Email}, PaisTelefone, Endereco{+IBGE},
                  ClienteNotaFiscal{+IBGE}, UrlSolicitacao
      payload PJ: idem + RazaoSocial, CNPJ, Titular{dados do responsável}
  → [videoconf] integracaoHope(protocolo)
```

**Fluxo de saída (dados recebidos da Safeweb):**

```
adicionarVideoconferencia → string plain "1010766479"
  CRÍTICO: resposta é string direta, não objeto JSON
  Leitura: String(data.Protocolo ?? ... ?? data ?? '')

integracaoHope → { urlSolicitacao, ... } 
  Salvo em: pedidos.hopeUrlDocumentos

Webhook Safeweb → POST /api/safeweb/webhook
  Payload: { evento, protocolo, ... }
  Eventos mapeados:
    emissao → EMITIDO
    cancelamento/revogacao → CANCELADO
    verificacao/confirmacao (aprovado) → VERIFICADO
```

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `SAFEWEB_IDENTIFICADOR` | Login da AR na Safeweb |
| `SAFEWEB_SEGREDO` | Senha da AR |
| `SAFEWEB_CODIGO_AR` | UUID do parceiro (CodigoParceiro) |
| `SAFEWEB_CNPJ_AR` | CNPJ da AR |
| `SAFEWEB_BASE_URL` | URL base da API (produção) |
| `SAFEWEB_BASE_URL_HOMOLOG` | URL base homologação |
| `SAFEWEB_IDENTIFICADOR_HOMOLOG` | Login homologação |
| `SAFEWEB_SEGREDO_HOMOLOG` | Senha homologação |
| `SAFEWEB_HOMOLOGACAO` | `"true"` para usar ambiente de homologação |
| `SAFEWEB_ATTENDANCE_PLACE_ID` | ID do local de atendimento no Hope Portal |
| `NEXTAUTH_URL` | URL do sistema (usada como UrlSolicitacao/webhook) |

**Região:** `gru1` (São Paulo) — declarado com `export const preferredRegion = 'gru1'` nos arquivos críticos para minimizar latência com servidores Safeweb no Brasil.

**Documentação completa do protocolo:** ver `docs/protocolo.md`.

---

### 2. Digisac — WhatsApp

**Finalidade:** Envio de mensagens WhatsApp para clientes (alertas de vencimento, notificações manuais) e recebimento de mensagens do proprietário via chatbot.

**Status:** ✅ Ativa em produção

**Arquivo principal:** `src/lib/digisac.ts`

**Arquivos relacionados:**
- `src/app/api/renovacoes/notificar-whatsapp/route.ts` — envio manual (tela renovações)
- `src/app/api/jobs/processar-whatsapp/route.ts` — job automático diário
- `src/app/api/digisac/webhook/route.ts` — recebe mensagens e aciona chatbot
- `src/app/api/test-whatsapp/route.ts` — teste de envio

**Autenticação:** Bearer token fixo (`DIGISAC_TOKEN`)

**Endpoints utilizados:**

| Endpoint | Método | Finalidade |
|---|---|---|
| `/contacts?number={numero}&serviceId={id}` | GET | Buscar contato existente |
| `/contacts` | POST | Criar contato novo |
| `/messages` | POST | Enviar mensagem de texto |

**Fluxo de envio:**

```
1. buscarOuCriarContato(numero, nomeCliente)
   → GET /contacts?number=55{numero}&serviceId={DIGISAC_CHANNEL_ID}
   → verificação exata de número (evita falso positivo)
   → se não encontrado: POST /contacts { number, serviceId, name }
   → retorna contactId

2. POST /messages { type: 'chat', text, contactId, serviceId }
```

**Formato do número:** `55{DDD}{numero}` (sem formatação, apenas dígitos)

**Templates de mensagem gerados por `gerarMensagemWhatsApp()`:**

| Situação | Tom |
|---|---|
| Vencimento em 60+ dias | Informativo |
| Vencimento em 30 dias | Alerta |
| Vencimento em 15 dias | Urgente |
| Vencimento em 7 dias | URGENTE |
| Certificado vencido | ATENÇÃO MÁXIMA |

**Job automático (diário às 9h UTC):**
- Pré-vencimento: dispara para certificados que vencem em 60, 30, 15 ou 7 dias
- Pós-vencimento: dispara para certificados vencidos há 1 e 7 dias
- Anti-duplicação: verifica `historicoContato` — não reenvia nos últimos 5 dias para o mesmo certificado
- Respeita configuração do parceiro: campo `whatsappVencimentoAtivo = false` bloqueia envios

**Chatbot WhatsApp (webhook Digisac):**
- Somente responde ao número do proprietário (`BOT_ADMIN_NUMERO`)
- Usa Claude Haiku com ferramentas de consulta ao banco
- Responde perguntas sobre vendas, vencimentos, financeiro e pedidos

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `DIGISAC_URL` | URL base da API Digisac (ex: `https://api.digisac.com.br/v1`) |
| `DIGISAC_TOKEN` | Token de autenticação Bearer |
| `DIGISAC_CHANNEL_ID` | ID do canal/serviço WhatsApp no Digisac |
| `BOT_ADMIN_NUMERO` | Número do proprietário que ativa o chatbot |

**Configuração necessária:** O webhook `/api/digisac/webhook` deve ser registrado nas configurações do Digisac como URL de notificação de mensagens recebidas.

---

### 3. SMTP — E-mail

**Finalidade:** Envio de e-mails transacionais automáticos (alertas de vencimento, nutrição, pós-emissão) e relatórios gerenciais.

**Status:** ✅ Ativa em produção

**Arquivos:**
- `src/lib/email/transporte.ts` — configuração do Nodemailer
- `src/lib/email/enviar.ts` — função principal com log no banco
- `src/lib/email/templates.ts` — templates HTML
- `src/app/api/jobs/processar-emails/route.ts` — job automático
- `src/app/api/jobs/relatorio-diario/route.ts` — relatório diário
- `src/app/api/renovacoes/notificar-email/route.ts` — envio manual
- `src/app/api/test-email/route.ts` — teste de envio

**Biblioteca:** Nodemailer

**Configuração:**

```
host:   SMTP_HOST
port:   SMTP_PORT (587 padrão, 465 = SSL)
secure: true se porta 465
auth:   { user: SMTP_USER, pass: SMTP_PASS }
from:   SMTP_FROM
```

**E-mails automáticos (job diário às 8h UTC):**

| Tipo | Trigger |
|---|---|
| `VENCIMENTO_60` | Certificado vence em 60 dias |
| `VENCIMENTO_30` | Certificado vence em 30 dias |
| `VENCIMENTO_15` | Certificado vence em 15 dias |
| `VENCIMENTO_7` | Certificado vence em 7 dias |
| `POS_EMISSAO` | Certificado emitido no dia |
| `NUTRICAO_3M` | 3 meses após emissão |
| `NUTRICAO_6M` | 6 meses após emissão |
| `NUTRICAO_9M` | 9 meses após emissão |

**Anti-duplicação:** Verifica `email_logs` — não reenvia o mesmo tipo para o mesmo certificado.

**Respeita configuração do parceiro:** `emailVencimentoAtivo = false` bloqueia envios automáticos.

**Relatório diário (21h UTC = 18h BRT):** Enviado para `vipetri91@gmail.com` com resumo de pedidos, receita e vencimentos próximos.

**Fluxo de saída:**
```
enviarEmail(params)
  → cria email_log com status PENDENTE
  → transporte.sendMail(from, to, subject, html)
  → atualiza email_log: ENVIADO (enviadoEm) ou ERRO (erro)
```

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `SMTP_HOST` | Servidor SMTP |
| `SMTP_PORT` | Porta (587 ou 465) |
| `SMTP_USER` | Usuário do servidor SMTP |
| `SMTP_PASS` | Senha do servidor SMTP |
| `SMTP_FROM` | Endereço "De" padrão |

---

### 4. Anthropic Claude API

**Finalidade:** Inteligência artificial em quatro contextos distintos: assistente interno ZOE, assistente do portal de parceiros (ZOE restrita), extração de conteúdo de PDFs e geração de posts para redes sociais.

**Status:** ✅ Ativa em produção

**Arquivos:**
- `src/app/api/assistente/chat/route.ts` — ZOE interna (AGRs)
- `src/app/api/assistente/extrair-pdf/route.ts` — extração de PDFs
- `src/app/api/social/gerar/route.ts` — geração de posts
- `src/app/api/portal/zoe/route.ts` — ZOE do portal de parceiros
- `src/app/api/telegram/webhook/route.ts` — bot Telegram
- `src/app/api/digisac/webhook/route.ts` — bot WhatsApp

**Biblioteca:** `@anthropic-ai/sdk`

**Modelos em uso:**

| Modelo | Onde é usado |
|---|---|
| `claude-haiku-4-5-20251001` | ZOE interna, ZOE do portal, social media, Telegram bot, WhatsApp bot |
| `claude-sonnet-4-6` | Extração de PDF (tarefa mais pesada) |

**Autenticação:** `ANTHROPIC_API_KEY` (Bearer implícito na SDK)

**Usos detalhados:**

#### ZOE Interna (`/api/assistente/chat`)
- Assistente conversacional para os AGRs (Agentes de Registro)
- **Tool use** com 6 ferramentas: `buscar_grupo`, `buscar_empresas_responsavel`, `buscar_cliente`, `prioridade_contatos`, `resumo_cliente`, `relatorio_semana`
- Todas as ferramentas consultam diretamente o banco de dados via Prisma
- Base de conhecimento configurável em `configuracoes` (chave `assistente_conhecimento`)
- Cache de 5 minutos para a base de conhecimento
- Resposta em streaming simulado (chunks de 8 chars a cada 10ms)
- Máximo de 5 iterações de tool use por resposta
- Max tokens: 2048

#### ZOE do Portal (`/api/portal/zoe`)
- Mesma arquitetura da ZOE interna, porém:
- Dados **escopados** para o parceiro autenticado (só clientes do parceiro)
- Tem conhecimento extra sobre SST e NR-1
- Sem acesso a dados financeiros ou internos
- 4 ferramentas: `buscar_meu_cliente`, `vencimentos_proximos`, `resumo_carteira`, `buscar_grupo`
- Max tokens: 1024

#### Extração de PDF (`/api/assistente/extrair-pdf`)
- Aceita PDF de até 20MB
- Converte para base64 e envia como `document` na API
- Extrai e organiza conteúdo em Markdown
- Salva metadado do PDF em `configuracoes` (chave `assistente_pdfs`)
- Disponível apenas para ADMIN e GERENTE

#### Social Media (`/api/social/gerar`)
- Gera posts para Instagram/Facebook/LinkedIn
- 6 categorias: EDUCATIVO, BENEFICIO, CTA, SEGMENTO, DICA_SEGURANCA, DATA_EVENTO
- Balanceia categorias automaticamente (conta posts por categoria no banco)
- Resposta em JSON: `{ headline, legenda, hashtags }`
- Após gerar, notifica via Telegram com o conteúdo

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API Anthropic |

---

### 5. Google Calendar

**Finalidade:** Criação, edição e consulta de eventos de atendimento no Google Calendar dos AGRs. Permite visualizar e gerenciar a agenda diretamente no CertFlow.

**Status:** ✅ Ativa em produção

**Arquivo principal:** `src/lib/google/calendar.ts`

**Arquivos relacionados:**
- `src/app/api/google/route.ts` — inicia o fluxo OAuth2
- `src/app/api/google/callback/route.ts` — recebe o código OAuth2

**Biblioteca:** `googleapis` (Google oficial)

**Autenticação:** OAuth2 Authorization Code Flow
- Scopes: `calendar`, `calendar.events`
- Redirect: `{NEXTAUTH_URL}/api/google/callback`
- Tokens armazenados nas credenciais da sessão (não no banco de dados)

**Operações disponíveis:**
- `criarEvento()` — cria evento com cor por AGR e tipo
- `listarEventos()` — lista eventos com filtros de data
- `atualizarEvento()` — atualiza campos específicos via PATCH
- `deletarEvento()` — deleta um evento por ID

**Sistema de cores (colorId do Google Calendar):**

| AGR | Tipo | Cor |
|---|---|---|
| Vinicius | Presencial | Basil (verde escuro) |
| Vinicius | Videoconferência | Sage (verde claro) |
| Arlen | Presencial | Blueberry (azul escuro) |
| Arlen | Videoconferência | Peacock (ciano) |
| Ana | Presencial | Grape (roxo escuro) |
| Ana | Videoconferência | Lavender (roxo claro) |
| — | Bonificado | Tangerine (laranja) |
| — | Pessoal | Tomato (vermelho) |
| — | Pré-agendado | Graphite (cinza) |

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID do projeto GCP |
| `GOOGLE_CLIENT_SECRET` | Client Secret do projeto GCP |

---

### 6. Google Apps Script

**Finalidade:** Alternativa à integração direta com Google Calendar API. O Apps Script atua como intermediário, permitindo criar eventos sem necessidade de OAuth2 por usuário.

**Status:** ✅ Ativa em produção (utilizada pela tela de agenda)

**Arquivo:** `src/app/api/agenda/route.ts`

**Como funciona:**
- O sistema faz `POST` / `GET` para uma URL de Web App do Google Apps Script
- O script rodando no Google Workspace cria/lista eventos no Google Calendar
- Autenticação por token secreto (`APPS_SCRIPT_TOKEN`) validado no script

**Endpoints:**
- `GET {APPS_SCRIPT_URL}?token={token}` — lista calendários conectados
- `POST {APPS_SCRIPT_URL}` — cria evento `{ titulo, descricao, inicio, duracao, agr, tipo, localizacao, token }`

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `APPS_SCRIPT_URL` | URL do Web App Google Apps Script (Ex: `https://script.google.com/macros/s/.../exec`) |
| `APPS_SCRIPT_TOKEN` | Token secreto para autenticar no script |

> **Nota:** Existem **duas formas** de integrar com o Google Calendar no sistema: via Apps Script (rota `/api/agenda`) e via API direta OAuth2 (`src/lib/google/calendar.ts`). A tela de agenda usa o Apps Script. A API direta existe como alternativa mas está menos utilizada.

---

### 7. Banco Inter — Cobranças

**Finalidade:** Geração de boletos bancários e chaves PIX para cobranças de clientes. Recebimento automático de notificações de pagamento.

**Status:** ✅ Ativa em produção

**Arquivo principal:** `src/lib/inter.ts`

**Arquivos relacionados:**
- `src/app/api/inter/cobranca/route.ts` — cria cobrança para um lançamento
- `src/app/api/inter/webhook/route.ts` — recebe notificação de pagamento

**Autenticação:** mTLS (certificado de cliente) + OAuth2 Client Credentials
- Certificado e chave privada armazenados como Base64 em variáveis de ambiente
- `mkAgent()` cria um `https.Agent` com o certificado a cada requisição
- Token OAuth2 com cache de 30 segundos antes do vencimento
- Scope: `cobranças.read cobranças.write`

**Endpoints utilizados:**

| Endpoint | Método | Finalidade |
|---|---|---|
| `/oauth/v2/token` | POST | Obter access token OAuth2 |
| `/cobranca/v3/cobrancas` | POST | Criar boleto/PIX |
| `/cobranca/v3/cobrancas/{nossoNumero}` | GET | Consultar situação da cobrança |

**Fluxo de criação de cobrança:**
```
1. POST /api/inter/cobranca { lancamentoId }
2. Busca lançamento + cliente no banco
3. POST /cobranca/v3/cobrancas { pagador, valorNominal, dataVencimento, ... }
4. Retorna: { nossoNumero, linhaDigitavel, pixCopiaECola }
5. Salva em lancamentos: { boleto, interCobrancaId, pixCopiaECola }
```

**Webhook de pagamento:**
```
POST /api/inter/webhook
Evento: COBRANCA_LIQUIDADA
  → localiza lancamento por interCobrancaId
  → atualiza: status = 'PAGO', dataPagamento
```

**Configuração necessária:** O webhook `/api/inter/webhook` deve ser registrado no painel do Banco Inter em: API → Webhooks → Cobrança.

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `INTER_CERT_B64` | Certificado mTLS codificado em Base64 |
| `INTER_KEY_B64` | Chave privada mTLS codificada em Base64 |
| `INTER_CLIENT_ID` | Client ID do aplicativo Inter |
| `INTER_CLIENT_SECRET` | Client Secret do aplicativo Inter |

---

### 8. Telegram Bot

**Finalidade:** Assistente de gestão para o proprietário via Telegram. Também recebe notificações de posts gerados para redes sociais e relatório mensal de atividade da equipe.

**Status:** ✅ Ativa em produção

**Arquivos:**
- `src/app/api/telegram/webhook/route.ts` — recebe mensagens e responde
- `src/app/api/jobs/relatorio-atividade/route.ts` — envia relatório mensal
- `src/app/api/social/gerar/route.ts` — notifica novo post gerado

**API utilizada:** `https://api.telegram.org/bot{TOKEN}/sendMessage`

**Autenticação:** Token do bot no path da URL (não no header)

**Fluxo do chatbot:**
```
1. Telegram → POST /api/telegram/webhook { message: { chat.id, text } }
2. Verifica: chatId === TELEGRAM_ADMIN_CHAT_ID (apenas o admin)
3. Envia "⏳ Consultando..."
4. gerarResposta(texto) via Claude Haiku com 5 tools:
   buscar_cliente, vencimentos, resumo_financeiro, contas_pagar, buscar_pedido
5. Envia resposta formatada em Markdown
```

**Notificações automáticas enviadas:**
- **Novo post de redes sociais:** headline, legenda, hashtags + link para template Canva
- **Relatório mensal de atividade:** minutos ativos/inativos por usuário (1º dia de cada mês, 8h UTC)

**Configuração necessária:** Registrar o webhook via Telegram Bot API:
```
POST https://api.telegram.org/bot{TOKEN}/setWebhook
{ url: "https://certflow-nine.vercel.app/api/telegram/webhook" }
```

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token do bot (obtido via @BotFather) |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat ID do proprietário (Vinicius) |
| `CANVA_TEMPLATE_FEED` | Link do template de feed no Canva |
| `CANVA_TEMPLATE_STORIES` | Link do template de stories no Canva |

---

### 9. Vercel Blob — Armazenamento

**Finalidade:** Armazenamento de arquivos de comprovantes de pagamento e documentos enviados pelos usuários.

**Status:** ✅ Ativa em produção

**Arquivo:** `src/app/api/upload/route.ts`

**Biblioteca:** `@vercel/blob`

**Operação disponível:**
- Upload público: `put('documentos/{timestamp}-{filename}', file, { access: 'public' })`
- Retorna URL pública permanente

**Limite:** 10MB por arquivo

**Fluxo:**
```
POST /api/upload (multipart/form-data)
  → put(path, file, { access: 'public' })
  → retorna { url, nome }
  URL salva em: lancamentos.comprovante ou outros campos de documento
```

**Dependências:** `BLOB_READ_WRITE_TOKEN` é configurada automaticamente quando o add-on Vercel Blob é adicionado ao projeto no painel Vercel. Não precisa ser definida manualmente.

---

### 10. BrasilAPI — CNPJ

**Finalidade:** Consulta de dados de CNPJ na Receita Federal para preenchimento automático de cadastro de clientes e parceiros, e para validação de responsável (QSA) em pedidos PJ.

**Status:** ✅ Ativa em produção

**Arquivos:**
- `src/app/api/cnpj/[cnpj]/route.ts` — consulta CNPJ completo
- `src/app/api/rfb/responsavel/route.ts` — valida responsável pelo QSA

**Endpoint:** `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`

**Dados retornados:** razão social, nome fantasia, situação cadastral, e-mail, telefone, endereço completo, QSA (sócios)

**Cache:** 1 hora (`next: { revalidate: 3600 }`)

**Uso no fluxo de venda PJ:**
```
POST /api/rfb/responsavel { cnpj, cpf }
  → BrasilAPI /cnpj/{cnpj}
  → ou fallback CNPJ.ws
  → verifica situação cadastral (ATIVA)
  → busca CPF no QSA (6 dígitos centrais comparados com máscara da Receita)
  → retorna { nome, empresa, cargo, permitido }
```

---

### 11. CNPJ.ws — CNPJ (fallback)

**Finalidade:** Fonte de dados secundária para CNPJ. Acionada automaticamente quando a BrasilAPI falha ou retorna erro.

**Status:** ✅ Ativa em produção (fallback automático)

**Arquivo:** `src/app/api/rfb/responsavel/route.ts`

**Endpoint:** `GET https://publica.cnpj.ws/cnpj/{cnpj}`

**Comportamento:** Usado somente em `buscarCNPJws()` quando `buscarBrasilAPI()` retorna `null`. Não precisa de credenciais.

---

### 12. IBGE — Códigos de Município

**Finalidade:** Obter o código IBGE numérico de municípios e UFs para preencher os campos `CidadeCodigo` e `UFCodigo` no payload da Safeweb.

**Status:** ✅ Ativa em produção

**Arquivo:** `src/lib/safeweb.ts` (função `buscarCodigoIbge`)

**Endpoint:** `GET https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`

**Comportamento:** Faz a requisição, filtra pelo nome da cidade e retorna os códigos. Usado internamente em `montarClienteNotaFiscal()` e `montarEndereco()`.

**Sem autenticação** — API pública.

---

### 13. ViaCEP — Geocodificação por CEP

**Finalidade:** Converter um CEP em endereço completo para uso na calculadora de deslocamento.

**Status:** ✅ Ativa em produção

**Arquivo:** `src/app/api/calculadora/deslocamento/route.ts` (função `geocodeCep`)

**Endpoint:** `GET https://viacep.com.br/ws/{cep}/json/`

**Timeout:** 5 segundos

**Sem autenticação** — API pública.

---

### 14. Nominatim — Geocodificação

**Finalidade:** Converter endereços textuais em coordenadas geográficas (latitude/longitude) para cálculo de distância de deslocamento.

**Status:** ✅ Ativa em produção

**Arquivo:** `src/app/api/calculadora/deslocamento/route.ts` (função `nominatim`)

**Endpoint:** `GET https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1&countrycodes=br`

**Headers obrigatórios:** `User-Agent: CertFlow/1.0 (certflow-nine.vercel.app)` (exigência do Nominatim)

**Timeout:** 8 segundos com `AbortSignal`

**Estratégia de fallback:** Tenta múltiplas variações do endereço em sequência (original, com abreviações expandidas, com estado expandido, só a cidade) com 500ms de delay entre tentativas para respeitar o rate limit.

**Sem autenticação** — API pública (uso de volume moderado).

---

### 15. OSRM — Roteamento

**Finalidade:** Calcular a distância real de rota de carro entre a origem (Piracaia/SP) e o endereço do cliente para calcular o custo de deslocamento.

**Status:** ✅ Ativa em produção

**Arquivo:** `src/app/api/calculadora/deslocamento/route.ts` (função `getDistanciaKm`)

**Endpoint:** `GET https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false`

**Origem fixa:** Piracaia/SP (`-23.0542, -46.3597`)

**Timeout:** 10 segundos

**Sem autenticação** — servidor público OSRM. Sujeito a instabilidade ocasional.

---

### 16. Webmail — IMAP / Roundcube

**Finalidade:** Exibir no dashboard o número de e-mails não lidos na caixa piracaia@vegcertificado.com.br. Permite acesso rápido ao webmail via auto-login.

**Status:** ✅ Ativa em produção

**Arquivos:**
- `src/app/api/webmail/unread/route.ts` — conta e-mails não lidos via IMAP
- `src/app/api/webmail/autologin/route.ts` — gera página HTML com auto-submit

**Conexão IMAP:**
```
host:   mail.vegcertificado.com.br
port:   993 (IMAPS)
secure: true (TLS)
user:   piracaia@vegcertificado.com.br
pass:   WEBMAIL_PASSWORD
TLS:    rejectUnauthorized: false
```

**Biblioteca:** `imapflow`

**Auto-login:** Gera uma página HTML que auto-submete um formulário POST para o Roundcube com as credenciais (`_user`, `_pass`, `_action=login`, `_task=login`). A senha é injetada server-side — nunca exposta ao frontend.

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `WEBMAIL_PASSWORD` | Senha da caixa piracaia@vegcertificado.com.br |

---

### 17. NextAuth.js — Autenticação

**Finalidade:** Gerenciar autenticação dos usuários internos do sistema. O portal do parceiro possui autenticação própria separada.

**Status:** ✅ Ativa em produção

**Arquivos:**
- `src/lib/auth.ts` — configuração NextAuth (usuários internos)
- `src/lib/auth-edge.ts` — versão Edge para middleware
- `src/lib/portal-session.ts` — autenticação separada do portal do parceiro
- `src/proxy.ts` — middleware de proteção de rotas
- `src/app/api/auth/[...nextauth]/route.ts` — handlers NextAuth
- `src/app/api/portal/login/route.ts` — login do parceiro
- `src/app/api/portal/logout/route.ts` — logout do parceiro

**Estratégia:** JWT sessions (não usa adapter de banco de dados para sessões)

**Provider:** Credentials apenas (sem OAuth social)

**Fluxo de login:**
```
POST /api/auth/callback/credentials { username, password }
  → verificarRateLimit(ip) — bloqueia após N tentativas
  → prisma.usuario.findUnique({ where: { username } })
  → bcrypt.compare(password, usuario.senha)
  → gera JWT { id, role }
  → cookie: authjs.session-token ou __Secure-authjs.session-token
```

**Rate limiting:** em memória (não persiste entre deploys), por IP. Bloqueia após múltiplas falhas.

**Portal do parceiro:** autenticação separada usando `loginParceiro` + `senhaParceiro` da tabela `parceiros`. Sessão salva em cookie `certflow-portal-session` (JWT customizado, não usa NextAuth).

**Proteção de rotas (middleware):**
- `/portal/*` → autenticação própria do parceiro
- `/login` → redireciona para `/dashboard` se já autenticado
- Demais rotas → redireciona para `/login` se não autenticado
- `/api/*` e arquivos estáticos → sem verificação no middleware

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `NEXTAUTH_SECRET` | Secret JWT do NextAuth |
| `AUTH_SECRET` | Secret compartilhado para tokens de jobs/crons |
| `NEXTAUTH_URL` | URL base do sistema |

---

### 18. Vercel Cron — Jobs Agendados

**Finalidade:** Executar tarefas automáticas recorrentes via Vercel Cron (configurado em `vercel.json`).

**Status:** ✅ Ativa em produção

**Arquivo de configuração:** `vercel.json`

**Jobs configurados:**

| Job | Path | Schedule | Horário BRT | Finalidade |
|---|---|---|---|---|
| Relatório diário | `/api/jobs/relatorio-diario` | `0 21 * * *` | 18h todos os dias | E-mail com resumo do dia |
| Processar e-mails | `/api/jobs/processar-emails` | `0 8 * * *` | 5h todos os dias | Enviar e-mails de vencimento e nutrição |
| Processar WhatsApp | `/api/jobs/processar-whatsapp` | `0 9 * * *` | 6h todos os dias | Enviar WhatsApp de vencimento |
| Social media | `/api/jobs/social-media` | `0 8 * * 1,3,5` | 5h Seg/Qua/Sex | Gerar post + notificar Telegram |
| Relatório atividade | `/api/jobs/relatorio-atividade` | `0 8 1 * *` | 5h dia 1 do mês | Enviar relatório de atividade via Telegram |

**Autenticação dos jobs:** O cron do Vercel faz `GET` sem headers de autenticação. Alguns endpoints aceitam `GET` sem token (proteção implícita pelo URL não público). Endpoints que aceitam `POST` manual exigem header `x-job-token: {AUTH_SECRET}`.

---

## Webhooks Recebidos

Endpoints que recebem notificações de sistemas externos (entrada de dados).

---

### Safeweb Webhook

**URL:** `POST /api/safeweb/webhook`

**Arquivo:** `src/app/api/safeweb/webhook/route.ts`

**Autenticação:** Nenhuma (confia no IP da Safeweb)

**Payload esperado:**
```json
{
  "evento": "emissao",
  "protocolo": "1010766479",
  ...
}
```

**Mapeamento de eventos:**

| Evento (normalizado, sem acento, minúsculo) | Ação |
|---|---|
| `emissao` | `status = EMITIDO`, `emitidoEm = agora` |
| `cancelamento`, `revogacao` | `status = CANCELADO` |
| `verificacao`, `confirmacao` (aprovado) | `status = VERIFICADO`, `verificadoEm = agora` |
| `verificacao`, `confirmacao` (recusado) | Nenhuma mudança de status |
| `solicitacao`, `validacao`, outros | Salva `safewebStatus`, nenhuma mudança |

**Localização do pedido:** busca por `safewebProtocolo = protocolo OR numeroCompra = protocolo`

---

### Inter Webhook

**URL:** `POST /api/inter/webhook`

**Arquivo:** `src/app/api/inter/webhook/route.ts`

**Autenticação:** Nenhuma (validada pelo Banco Inter)

**Payload esperado:**
```json
{
  "evento": "COBRANCA_LIQUIDADA",
  "cobranca": {
    "nossoNumero": "12345",
    "situacao": "PAGO",
    "dataPagamento": "2026-06-09",
    "valorPago": 299.90
  }
}
```

**Ação:** Localiza lançamento por `interCobrancaId = nossoNumero` e atualiza `status = PAGO`, `dataPagamento`.

**Configuração necessária:** Registrar a URL no painel do Banco Inter em: API → Webhooks → Cobrança.

---

### Digisac Webhook

**URL:** `POST /api/digisac/webhook`

**Arquivo:** `src/app/api/digisac/webhook/route.ts`

**Autenticação:** Nenhuma (confiar em origem Digisac)

**Payload esperado:**
```json
{
  "data": {
    "fromMe": false,
    "text": "Como foi o dia?",
    "contact": { "number": "5511943156015" }
  }
}
```

**Ação:**
- Ignora mensagens `fromMe = true`
- Ignora números diferentes de `BOT_ADMIN_NUMERO`
- Gera resposta via Claude Haiku com contexto financeiro/operacional
- Responde via `enviarWhatsApp()`

**Configuração necessária:** Registrar a URL como webhook de mensagens recebidas nas configurações do Digisac.

---

## Integrações Parciais ou Incompletas

---

### ReceitaWS — CPF (Parcial)

**Finalidade:** Consultar CPF na Receita Federal para obter nome do titular e situação cadastral.

**Status:** ⚠️ Parcial — funciona apenas se `RECEITAWS_TOKEN` estiver configurado

**Arquivo:** `src/app/api/cpf/[cpf]/route.ts`

**Endpoint:** `GET https://www.receitaws.com.br/v1/cpf/{cpf}/{DDMMYYYY}`

**Comportamento:**
```
Se RECEITAWS_TOKEN não estiver definido:
  → retorna dados do banco (fonte: 'banco') sem consultar a RFB
  → sem aviso ao usuário de que a RFB não foi consultada

Se RECEITAWS_TOKEN estiver definido mas data de nascimento não informada:
  → retorna erro 400

Se RFB retornar erro:
  → fallback para o banco de dados (fonte: 'banco')
```

**Risco:** O sistema funciona silenciosamente sem o token. O usuário pode receber dados desatualizados do banco sem saber que a Receita Federal não foi consultada.

**Dependências de ambiente:**

| Variável | Descrição |
|---|---|
| `RECEITAWS_TOKEN` | Token pago do serviço ReceitaWS (opcional mas necessário para consultar RFB) |

---

## Riscos Operacionais Identificados

### RISCO 1 — Webhook Digisac não registrado
- **O que acontece:** Se o webhook não estiver registrado no painel Digisac, o chatbot WhatsApp não receberá mensagens e ficará inoperante silenciosamente.
- **Como verificar:** Enviar mensagem WhatsApp para o número do bot e aguardar resposta.
- **Arquivos:** `src/app/api/digisac/webhook/route.ts`

---

### RISCO 2 — Webhook Telegram não registrado
- **O que acontece:** Se o webhook do bot não estiver registrado via `setWebhook`, o Telegram não enviará mensagens para o sistema. O bot não responderá.
- **Como verificar:** `GET https://api.telegram.org/bot{TOKEN}/getWebhookInfo`
- **Arquivos:** `src/app/api/telegram/webhook/route.ts`

---

### RISCO 3 — Webhook Inter não registrado
- **O que acontece:** Boletos pagos não serão marcados automaticamente como `PAGO` no sistema. O usuário precisará dar baixa manual.
- **Como verificar:** Painel Banco Inter → API → Webhooks.
- **Arquivos:** `src/app/api/inter/webhook/route.ts`

---

### RISCO 4 — Job de social media falha silenciosamente
- **O que acontece:** O cron `/api/jobs/social-media` faz `GET` e internamente chama `/api/social/gerar` via `POST` com o cookie do request. Em um contexto de cron (sem sessão de usuário), o cookie estará vazio, a autenticação falhará com 401, e o post não será gerado.
- **Impacto:** Social media não funciona via cron automaticamente — só via disparo manual autenticado.
- **Arquivo:** `src/app/api/jobs/social-media/route.ts`

---

### RISCO 5 — Token Safeweb em cache de memória
- **O que acontece:** O token JWT da Safeweb é armazenado em variável global em memória (`let cachedToken`). A cada cold start da função serverless (que ocorre frequentemente no Vercel com plano gratuito), o cache é zerado e um novo token é solicitado.
- **Impacto:** Aumento de chamadas de autenticação, possível throttling pela Safeweb em caso de muitos cold starts simultâneos.
- **Arquivo:** `src/lib/safeweb.ts`

---

### RISCO 6 — Google Apps Script como dependência crítica
- **O que acontece:** Se `APPS_SCRIPT_URL` não estiver configurado ou o script estiver fora do ar, a funcionalidade de agenda é completamente bloqueada.
- **Impacto:** Nenhuma criação de evento no Google Calendar. Não há fallback automático para a integração OAuth2.
- **Arquivo:** `src/app/api/agenda/route.ts`

---

### RISCO 7 — OSRM e Nominatim sem SLA
- **O que acontece:** Ambos são serviços públicos sem garantia de disponibilidade.
- **Impacto:** A calculadora de deslocamento (`/calculadora`) pode falhar quando esses serviços estiverem sobrecarregados.
- **Arquivo:** `src/app/api/calculadora/deslocamento/route.ts`

---

### RISCO 8 — ReceitaWS sem token não avisa o usuário
- **O que acontece:** Sem `RECEITAWS_TOKEN`, a consulta de CPF retorna dados do banco sem informar que a Receita Federal não foi consultada.
- **Impacto:** Cadastros criados sem verificação na RFB podem ter dados desatualizados (ex: nome errado, CPF cancelado).
- **Arquivo:** `src/app/api/cpf/[cpf]/route.ts`

---

### RISCO 9 — Duplicação protocolo Safeweb (safewebProtocolo × numeroCompra)
- **O que acontece:** O mesmo protocolo é armazenado em dois campos: `pedidos.safewebProtocolo` e `pedidos.numeroCompra`. O webhook usa `OR` para localizar o pedido.
- **Impacto:** Baixo risco operacional, mas manutenção confusa. Documentado em `docs/protocolo.md`.
- **Arquivo:** `src/app/api/safeweb/webhook/route.ts`

---

## Variáveis de Ambiente Completas

Lista de todas as variáveis de ambiente necessárias para operação completa do sistema.

| Variável | Integração | Obrigatória | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Supabase/Prisma | ✅ | URL de conexão PostgreSQL |
| `NEXTAUTH_URL` | NextAuth / Safeweb | ✅ | URL pública do sistema |
| `NEXTAUTH_SECRET` | NextAuth | ✅ | Secret JWT NextAuth |
| `AUTH_SECRET` | Jobs/Crons | ✅ | Token secreto para autenticação de jobs |
| `SAFEWEB_IDENTIFICADOR` | Safeweb | ✅ | Login da AR na Safeweb |
| `SAFEWEB_SEGREDO` | Safeweb | ✅ | Senha da AR |
| `SAFEWEB_CODIGO_AR` | Safeweb | ✅ | UUID CodigoParceiro |
| `SAFEWEB_CNPJ_AR` | Safeweb | ✅ | CNPJ da AR |
| `SAFEWEB_BASE_URL` | Safeweb | ✅ | URL base API produção |
| `SAFEWEB_ATTENDANCE_PLACE_ID` | Safeweb/Hope | ✅ | ID local de atendimento Hope |
| `DIGISAC_URL` | Digisac | ✅ | URL base API Digisac |
| `DIGISAC_TOKEN` | Digisac | ✅ | Token Bearer Digisac |
| `DIGISAC_CHANNEL_ID` | Digisac | ✅ | ID do canal WhatsApp |
| `SMTP_HOST` | E-mail | ✅ | Servidor SMTP |
| `SMTP_PORT` | E-mail | ✅ | Porta SMTP |
| `SMTP_USER` | E-mail | ✅ | Usuário SMTP |
| `SMTP_PASS` | E-mail | ✅ | Senha SMTP |
| `SMTP_FROM` | E-mail | ✅ | Endereço "De" |
| `ANTHROPIC_API_KEY` | Claude API | ✅ | Chave da API Anthropic |
| `INTER_CERT_B64` | Banco Inter | ✅ | Certificado mTLS em Base64 |
| `INTER_KEY_B64` | Banco Inter | ✅ | Chave privada mTLS em Base64 |
| `INTER_CLIENT_ID` | Banco Inter | ✅ | Client ID Inter |
| `INTER_CLIENT_SECRET` | Banco Inter | ✅ | Client Secret Inter |
| `TELEGRAM_BOT_TOKEN` | Telegram | ✅ | Token do bot Telegram |
| `TELEGRAM_ADMIN_CHAT_ID` | Telegram | ✅ | Chat ID do admin |
| `WEBMAIL_PASSWORD` | Webmail IMAP | ✅ | Senha do e-mail piracaia@ |
| `GOOGLE_CLIENT_ID` | Google Calendar | ✅ | Client ID GCP |
| `GOOGLE_CLIENT_SECRET` | Google Calendar | ✅ | Client Secret GCP |
| `APPS_SCRIPT_URL` | Apps Script | ✅ | URL do Web App Google Apps Script |
| `APPS_SCRIPT_TOKEN` | Apps Script | ✅ | Token de autenticação no script |
| `BOT_ADMIN_NUMERO` | WhatsApp Bot | ⚠️ Recomendada | Número que ativa o chatbot (padrão: 11943156015) |
| `SAFEWEB_HOMOLOGACAO` | Safeweb | ❌ Opcional | `"true"` para usar ambiente de teste |
| `SAFEWEB_BASE_URL_HOMOLOG` | Safeweb | ❌ Opcional | URL API homologação |
| `SAFEWEB_IDENTIFICADOR_HOMOLOG` | Safeweb | ❌ Opcional | Login homologação |
| `SAFEWEB_SEGREDO_HOMOLOG` | Safeweb | ❌ Opcional | Senha homologação |
| `RECEITAWS_TOKEN` | ReceitaWS | ❌ Opcional | Token para consulta de CPF na RFB |
| `CANVA_TEMPLATE_FEED` | Telegram/Canva | ❌ Opcional | Link template feed Canva |
| `CANVA_TEMPLATE_STORIES` | Telegram/Canva | ❌ Opcional | Link template stories Canva |