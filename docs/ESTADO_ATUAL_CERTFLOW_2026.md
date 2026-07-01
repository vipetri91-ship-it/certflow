# Estado Atual do CertFlow — Documentação Técnica Completa

**Gerado em:** 16/06/2026  
**Versão:** Pós-migração Railway  
**Autor:** Claude Sonnet 4.6 (análise automatizada do código-fonte)  
**Objetivo:** Registro auditável e permanente para onboarding, auditorias e recuperação de contexto.

---

## 1. Visão Geral do Sistema

### O que é o CertFlow

CertFlow é o ERP interno da **V&G Certificado Digital**, uma AR (Autoridade de Registro) credenciada pela **Safeweb**. O sistema gerencia o ciclo de vida completo de certificados digitais: desde a venda até a emissão, passando pelo agendamento, verificação de documentos, financeiro e pós-venda.

### Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.2.6 |
| Linguagem | TypeScript | — |
| ORM | Prisma | 7.8.0 |
| Adapter DB | PrismaPg (`@prisma/adapter-pg`) | 7.8.0 |
| Banco de Dados | **Neon PostgreSQL** (SA East / AWS) | — |
| Autenticação | NextAuth v5 beta | 5.0.0-beta.31 |
| Hospedagem | **Railway** (migrado de Vercel em 16/06/2026) | — |
| UI | Tailwind CSS v4 + Radix UI + Lucide | — |
| Validação | Zod v4 | — |
| Formulários | React Hook Form | 7.75.0 |
| Senhas | bcryptjs | 3.0.3 |

### Infraestrutura

```
Usuário (browser)
      │
      ▼
  Railway (servidor dedicado, always-on)
  certflow-production-8917.up.railway.app
  Região: US West (sfo)
      │
      ├── Neon PostgreSQL (SA East, ep-aged-firefly-acb9wue2)
      ├── Safeweb PSS API (pss.safewebpss.com.br)
      ├── Digisac API (api.digisac.com.br)
      ├── Telegram Bot API
      ├── Google Calendar (via Apps Script)
      ├── Banco Inter API
      ├── Brevo SMTP (email)
      └── Vercel Blob (armazenamento de arquivos)
```

### Estrutura de Diretórios

```
certflow/
├── prisma/
│   └── schema.prisma          ← Modelos de dados
├── scripts/
│   └── migrate.js             ← Migrations executadas no build
├── src/
│   ├── app/
│   │   ├── (dashboard)/       ← Páginas protegidas (layout com sidebar)
│   │   ├── (portal)/          ← Portal de parceiros (login separado)
│   │   ├── login/             ← Tela de login
│   │   └── api/               ← 80+ endpoints API
│   ├── components/            ← Componentes reutilizáveis
│   ├── generated/prisma/      ← Tipos gerados pelo Prisma
│   └── lib/
│       ├── auth.ts            ← Configuração NextAuth
│       ├── prisma.ts          ← Cliente Prisma singleton
│       ├── safeweb.ts         ← Integração completa com Safeweb PSS
│       ├── digisac.ts         ← Integração WhatsApp (Digisac)
│       ├── audit.ts           ← Registro de auditoria
│       └── rate-limit.ts      ← Anti brute-force (in-memory)
├── docs/                      ← Documentação técnica
├── .env.railway               ← Referência de variáveis para Railway
└── vercel.json                ← Crons legados (não ativos no Railway)
```

---

## 2. Fluxo Completo de Certificados

### Estados do Pedido

```
[Nova Venda]
     │
     ▼
  GERADO ──────────────────────────────────────────► CANCELADO
     │    (qualquer momento, via endpoint cancelar)
     │ Webhook: verificacao/confirmacao (aprovado)
     ▼
 VERIFICADO ─────────────────────────────────────► CANCELADO
     │
     │ Webhook: emissao
     │ OU PATCH manual pelo operador
     ▼
  EMITIDO ──── cria Certificado (ATIVO)
           └── cria Lançamento financeiro (RECEBER / PENDENTE)
```

### Quem altera cada status

| Status | Trigger | Endpoint |
|--------|---------|----------|
| `GERADO` | Operador cria nova venda | `POST /api/pedidos/nova-venda` |
| `VERIFICADO` | Webhook Safeweb (evento `verificacao` ou `confirmacao` aprovado) | `POST /api/safeweb/webhook` |
| `EMITIDO` | Webhook Safeweb (evento `emissao`) OU operador manualmente | `POST /api/safeweb/webhook` ou `PATCH /api/pedidos/[id]` |
| `CANCELADO` | Operador + cancelamento Safeweb integrado | `POST /api/pedidos/[id]/cancelar` |

### O que acontece na emissão

Quando o status vai para `EMITIDO` (seja via webhook ou manualmente), dois registros são criados **idempotentemente** (se ainda não existirem):

1. **`Certificado`** — vinculado ao cliente, com `dataEmissao = agora` e `dataVencimento = agora + validadeMeses`.
2. **`Lancamento`** — tipo `RECEBER`, status `PENDENTE`, valor = `pedido.valorFinal`, vinculado ao pedido.

---

## 3. Integração Safeweb

### Arquivo principal: `src/lib/safeweb.ts`

#### Autenticação

- Credenciais: `SAFEWEB_IDENTIFICADOR` + `SAFEWEB_SEGREDO` (Base64 → Basic Auth)
- Token JWT com validade de 10 minutos
- Cache em memória — reutiliza com margem de 60s (`_tokenCache`)
- Suporte a ambiente de **homologação** (`SAFEWEB_HOMOLOGACAO=true`)

#### Funções exportadas

| Função | Descrição |
|--------|-----------|
| `getToken()` | Obtém/renova JWT da Safeweb |
| `realizarConsultaPrevia(params)` | Verifica CPF/CNPJ na RFB antes da emissão |
| `adicionarVideoconferencia(params, idTipoEmissao, protocoloOrigem?)` | Cria protocolo na Safeweb (presencial, vídeo ou online) |
| `integracaoHope(protocolo)` | Vincula protocolo ao portal Hope (link de documentos) |
| `cancelarSolicitacao(protocolo, idJustificativa?)` | Cancela protocolo na Safeweb (idJustificativa padrão = 4) |
| `listarProdutos(idTipoEmissao)` | Lista produtos disponíveis para a AR |
| `buscarProduto(filtros)` | Mapeia modelo CertFlow → idProduto Safeweb automaticamente |
| `consultarProtocolo(protocolo)` | Consulta status de um protocolo na Safeweb |
| `validarCertificadoOnline(numeroSerie, idProduto)` | Valida cert A3 PF para emissão online |
| `liberarEmissaoOnline(protocolo)` | Libera protocolo após confirmação de pagamento |
| `diagnosticar()` | Verifica configuração e autenticação Safeweb |

#### Helpers internos

- `buscarCodigosIbge(cidade, uf)` — cache em memória dos códigos IBGE (obrigatório para Safeweb)
- `montarEndereco(end?)` — formata endereço com códigos IBGE
- `montarClienteNotaFiscal(...)` — monta objeto de faturamento
- `montarContato(ddd, telefone, email)` — remove DDD duplicado do campo telefone

### Arquivo: `src/app/api/pedidos/nova-venda/route.ts`

Fluxo de criação de um novo pedido:

```
1. Autenticação (auth())
2. Validação do payload (Zod)
3. Criar ou atualizar Cliente (busca por CPF/CNPJ antes de criar)
4. Para PJ: criar/atualizar cliente PF (responsável) separadamente
5. Criar Pedido (status=GERADO)
6. Se tipoAtendimento = presencial | videoconferencia | emissao-online:
   a. buscarProduto() → idProduto Safeweb
   b. Para emissão online: validarCertificadoOnline()
   c. adicionarVideoconferencia() → safewebProtocolo
   d. Salvar safewebProtocolo + numeroCompra no Pedido
   e. Para videoconferência: integracaoHope() → hopeUrlDocumentos
   (timeout máximo: 40 segundos via Promise.race)
7. Se agendamento informado: criar evento no Google Calendar
8. Registrar auditoria
9. Retornar { id, numero, safewebProtocolo, hopeUrlDocumentos }
```

**Importante:** O Lançamento financeiro **não é criado aqui**. É criado somente quando o pedido vai para `EMITIDO`.

### Arquivo: `src/app/api/safeweb/webhook/route.ts`

- **Roda em `gru1` (São Paulo)** — garante IP brasileiro para a Safeweb
- URL registrada em cada pedido via `UrlSolicitacao` no payload da Safeweb
- Recebe eventos e atualiza `pedido.safewebStatus` (último evento recebido)

#### Função `eventoParaStatus(evento, acao?)`

```typescript
// Normaliza: remove acentos, converte para minúsculas
// Mapeamento:
"emissao"                          → "EMITIDO"
"cancelamento" | "revogacao"       → "CANCELADO"
"verificacao" | "confirmacao" + aprovado → "VERIFICADO"
"verificacao" | "confirmacao" + reprovado → null (sem mudança)
outros (Solicitacao, Validacao...) → null (apenas atualiza safewebStatus)
```

**Atenção:** A Safeweb envia nomes de eventos com grafias inconsistentes (acentos e maiúsculas variáveis). O código normaliza antes de comparar.

---

## 4. Tipos de Emissão

| `tipoAtendimento` | `idTipoEmissao` | Descrição | HOPE? |
|-------------------|-----------------|-----------|-------|
| `presencial` | `1` | Cliente vai à AR com documentos | Não |
| `videoconferencia` | `3` | Reunião por vídeo, documentos enviados pelo Hope | **Sim** |
| `emissao-online` | `5` | Emissão usando cert A3 PF existente do cliente | Não |

### Busca automática de produto Safeweb

`buscarProduto()` faz o mapeamento automático:

- `tipoPessoa: PF` → e-CPF
- `tipoPessoa: PJ` → e-CNPJ
- `validadeMeses ≤ 12` → "1 Ano"
- `validadeMeses > 12` → "2 Anos"
- Para suporte `NUVEM`: testa tipos 5, 3 e 1 como fallback

---

## 5. Fluxo de Webhooks Safeweb

```
Safeweb
  │ POST /api/safeweb/webhook
  │ { evento, protocolo, acao?, motivoRecusa? }
  ▼
Busca pedido por: numeroCompra OU safewebProtocolo
  │
  ├── Não encontrado → retorna 200 com aviso (não acumula na fila Safeweb)
  │
  └── Encontrado → eventoParaStatus(evento, acao)
        │
        ├── null → só atualiza safewebStatus (informativo)
        │
        ├── VERIFICADO → update status + verificadoEm
        │
        ├── CANCELADO → update status
        │
        └── EMITIDO → update status + emitidoEm + popupNotificacaoVisto=false
                    → cria Certificado (se não existir)
                    → cria Lançamento (se não existir)
                    → registra AuditLog
```

**Nota:** `popupNotificacaoVisto = false` garante que o popup "Certificado Emitido" apareça para o AGR na próxima vez que abrir o sistema.

---

## 6. Investigação Realizada em 15/06/2026

### Contexto

Protocolos de videoconferência estavam ficando presos no status `VERIFICADO` sem avançar para `EMITIDO`, mesmo após a reunião de vídeo e verificação dos documentos.

### Protocolos analisados

| Protocolo | Tipo | Status encontrado | Resultado |
|-----------|------|-------------------|-----------|
| 1010811247 | Videoconferência | VERIFICADO | Aguardando evento `emissao` da Safeweb |
| 1010807667 | Videoconferência | VERIFICADO | Aguardando evento `emissao` da Safeweb |
| 1010813157 | Videoconferência | VERIFICADO | Aguardando evento `emissao` da Safeweb |
| 1010810289 | Presencial | EMITIDO | Funcionando normalmente |
| 1010810219 | Presencial | EMITIDO | Funcionando normalmente |
| 1010810334 | Presencial | EMITIDO | Funcionando normalmente |

### Conclusões da investigação

1. **Presenciais funcionam automaticamente** — o evento `emissao` chega via webhook e o sistema processa corretamente.
2. **Videoconferências ficam presas em VERIFICADO** — isso é o comportamento esperado da Safeweb: o evento `emissao` só chega após a reunião de vídeo ser concluída e aprovada internamente pela Safeweb.
3. **O webhook estava funcionando** — o CertFlow recebia e processava os eventos corretamente.
4. **O problema estava antes do evento `emissao`** — a Safeweb simplesmente ainda não havia enviado esse evento para as videoconferências analisadas.
5. **`safewebStatus` guarda apenas o último evento** — não há histórico de eventos; campo sobrescreve a cada evento recebido.
6. **Não existe tabela de eventos Safeweb** — logs de webhook não são persistidos; dependência total dos logs do servidor.

---

## 7. Descobertas Importantes (registro permanente)

### Banco de dados real é Neon (não Supabase)

**Descoberto em 16/06/2026 durante a migração para Railway.**

Os arquivos `.env` locais e os históricos de conversa continham uma URL Supabase (`aws-0-sa-east-1.pooler.supabase.com`, projeto `rlisraudrrjhgeornejj`) que não existe — o projeto Supabase referenciado nunca foi válido ou foi descartado.

O banco de produção real sempre foi **Neon**:
- Host pooler: `ep-aged-firefly-acb9wue2-pooler.sa-east-1.aws.neon.tech`
- Host direto: `ep-aged-firefly-acb9wue2.sa-east-1.aws.neon.tech`
- Database: `neondb`
- User: `neondb_owner`

### Migração Vercel → Railway (16/06/2026)

**Motivo:** Vercel Hobby usa funções serverless com cold starts. O webhook da Safeweb chegava enquanto a função estava "dormindo", causando timeout e perda do evento.

**Solução:** Railway com servidor dedicado always-on — sem cold starts, webhook sempre recebe resposta imediata.

### Login é por username (não e-mail)

A autenticação foi migrada de e-mail + senha antiga para **username + senha**. O campo `username` foi backfillado a partir do e-mail (removendo o domínio: `vinicius@vg.com` → `vinicius`). Após a migração os usuários trocaram suas senhas.

### `aciRemovalCandidate: true` na integração Hope

O payload enviado ao Hope inclui `aciRemovalCandidate: true`, que sinaliza ao portal Hope que não é necessário comparecer fisicamente à AR para assinar o ACI (Acordo de Certificação em Identidade). Isso permite aprovação automática em videoconferências.

---

## 8. Riscos Arquiteturais Identificados

### P0 — Crítico (resolver imediatamente)

| Risco | Descrição | Impacto |
|-------|-----------|---------|
| Crons sem execução no Railway | `vercel.json` define 5 crons; Railway não lê este arquivo; nenhum cron está rodando | Relatório diário, emails, WhatsApp, social media e relatório mensal parados |
| Google OAuth desatualizado | Credenciais criadas para `vazcertflow.com.br` mas NEXTAUTH_URL ainda aponta para Railway | Login social não funciona; OAuth falhará quando domínio ativar |

### P1 — Alto (resolver em até 7 dias)

| Risco | Descrição | Impacto |
|-------|-----------|---------|
| Sem histórico de webhooks Safeweb | `safewebStatus` só guarda o último evento; não há tabela de log | Impossível auditar sequência de eventos; debug depende de logs do servidor |
| Logs do servidor voláteis | Railway descarta logs de containers antigos; sem persistência | Perde evidências de problemas após novo deploy |
| Rate limit in-memory | `src/lib/rate-limit.ts` usa Map JavaScript; reinicia com o processo | Proteção anti brute-force zerada a cada deploy |
| Apps Script não configurado | `APPS_SCRIPT_URL=pendente` — Google Calendar via Apps Script inativo | Agendamentos não criam eventos no Google Calendar |
| Railway em Trial | Conta Railway Trial com $5 ou 30 dias — serviço para ao esgotar | Sistema fora do ar sem aviso |

### P2 — Médio (planejar)

| Risco | Descrição | Impacto |
|-------|-----------|---------|
| `safewebProtocolo` e `numeroCompra` duplicados | Dois campos guardam o mesmo número de protocolo | Confusão e busca em dois campos no webhook |
| Catch silencioso em emissão | `} catch { /* não bloqueia */ }` em criação de Certificado e Lançamento | Falha silenciosa; usuário não é notificado |
| Vercel Blob em Railway | `BLOB_READ_WRITE_TOKEN` usa Vercel Blob — funciona mas cria dependência do Vercel | Upload de arquivos depende de outro provedor |
| Token Vercel não revogado | Token Vercel Personal ainda ativo — revogar em vercel.com/account/tokens | Risco de segurança se exposto |

---

## 9. Alterações Feitas em 14–16/06/2026

### 16/06/2026 — Migração para Railway

| O que foi feito | Impacto | Risco |
|----------------|---------|-------|
| DATABASE_URL corrigido de Supabase (inexistente) para Neon | Banco de dados funciona no Railway | Nenhum — correção de credencial errada |
| NEXTAUTH_URL / AUTH_URL apontando para Railway | Login funciona no Railway | Sessões Vercel invalidadas |
| Google OAuth: novas credenciais criadas para `vazcertflow.com.br` | OAuth preparado para o novo domínio | Precisa atualizar redirect URI quando domínio ativar |
| Railway CLI autenticado e projeto linkado | Gestão do Railway sem intervenção manual | Nenhum |

### 15/06/2026 — Investigação e correções Safeweb

| Commit | O que mudou | Impacto |
|--------|------------|---------|
| `13128ed` | Webhook Safeweb agora cria Certificado e Lançamento ao emitir (antes só atualizava status) | Correção crítica: emissão via webhook agora completa o ciclo igual ao botão manual |
| `8f91271` | Cron de reconciliação limitado a 1x por dia (limite Vercel Hobby) | Evitava atingir limite de 12 execuções/hora |
| `0541d3f` | `aciRemovalCandidate: true` na integração Hope | Aprovação automática no Hope sem necessidade de ACI presencial |
| `3457c82` | Reconciliação global em tempo real via `NotificacaoEmissaoWatcher` | Verifica protocolos em VERIFICADO e tenta promover para EMITIDO |
| `471576d` | Verificação automática de protocolos sem interação do usuário | Reduz necessidade de intervenção manual |
| `29bbfa4` | Reconciliação automática de protocolos presos em VERIFICADO | Primeira implementação da reconciliação |

### 14/06/2026

| Commit | O que mudou |
|--------|------------|
| `4be540c` | Estrutura de histórico inteligente e renovações manuais (schema) |
| `d9d71cf` | Redução de exposição de PII no diagnóstico e audit logs (LGPD) |
| `7ba3887` | Correção de race conditions em buscas assíncronas de CPF/CNPJ |
| `db13526` | Remoção de endpoints de teste sem autenticação |

---

## 10. Mapa de Endpoints

### Autenticação
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth v5 — login, logout, session, callbacks |
| `/api/perfil` | GET/PATCH | Dados do usuário logado |

### Clientes
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/clientes` | GET/POST | Listar e criar clientes |
| `/api/clientes/[id]` | GET/PATCH/DELETE | Operações em cliente específico |
| `/api/clientes/importar` | POST | Importação em lote |
| `/api/cpf/[cpf]` | GET | Consulta CPF na RFB (autenticado) |
| `/api/cnpj/[cnpj]` | GET | Consulta CNPJ na RFB |
| `/api/rfb/responsavel` | GET | Consulta responsável PJ na RFB |

### Pedidos
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/pedidos` | GET | Listar pedidos |
| `/api/pedidos/nova-venda` | POST | Criar pedido + protocolo Safeweb |
| `/api/pedidos/[id]` | GET/PATCH | Consultar e atualizar pedido |
| `/api/pedidos/[id]/cancelar` | POST | Cancelar pedido (integra com Safeweb) |
| `/api/pedidos/[id]/notificar` | POST | Notificar cliente via WhatsApp |
| `/api/pedidos/[id]/liberar-emissao-online` | POST | Liberar emissão online após pagamento |
| `/api/pedidos/buscar-serie-a3` | GET | Busca número de série do A3 PF |
| `/api/pedidos/notificacoes-pendentes` | GET | Pedidos com popup não visto |

### Certificados
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/certificados` | GET/POST | Listar e criar certificados |
| `/api/certificados/[id]` | GET/PATCH | Operações em certificado |
| `/api/certificados/[id]/renovar` | POST | Iniciar processo de renovação |

### Safeweb
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/safeweb/webhook` | POST/GET | **Webhook principal** — recebe eventos Safeweb |
| `/api/safeweb/testar` | GET | Testa autenticação e configuração Safeweb |
| `/api/safeweb/consulta-previa` | POST | Consulta prévia CPF/CNPJ na RFB via Safeweb |
| `/api/safeweb/validar-cert-online` | POST | Valida cert A3 PF para emissão online |
| `/api/admin/diagnostico-protocolo` | GET | Diagnóstico de protocolos (somente ADMIN) |

### Financeiro
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/financeiro/lancamentos` | GET/POST | Listar e criar lançamentos |
| `/api/financeiro/lancamentos/[id]` | GET/PATCH/DELETE | Operações em lançamento |
| `/api/financeiro/lancamentos/[id]/baixa` | POST | Registrar pagamento |
| `/api/financeiro/lancamentos/[id]/comprovante` | POST | Upload de comprovante |
| `/api/financeiro/categorias` | GET/POST | Categorias financeiras |
| `/api/financeiro/conciliacoes` | GET/POST | Conciliação de extratos |
| `/api/inter/cobranca` | POST | Criar cobrança no Banco Inter |
| `/api/inter/webhook` | POST | Webhook do Banco Inter (confirmação de pagamento) |

### Parceiros
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/parceiros` | GET/POST | Listar e criar parceiros |
| `/api/parceiros/[id]` | GET/PATCH/DELETE | Operações em parceiro |
| `/api/parceiros/[id]/comissoes` | GET/POST | Comissões do parceiro |
| `/api/parceiros/[id]/contatos` | GET/POST | Contatos do parceiro |

### Portal de Parceiros
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/portal/login` | POST | Login no portal do parceiro |
| `/api/portal/logout` | POST | Logout do portal |
| `/api/portal/zoe` | POST | Assistente Zoe para parceiros |

### Agenda e Calendar
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/agenda` | GET/POST | Listar e criar eventos no Google Calendar |
| `/api/agenda/eventos/[id]` | GET/PATCH/DELETE | Operações em evento |

### Integrações Externas
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/digisac/webhook` | POST | Webhook WhatsApp — bot admin + futuro agente cliente |
| `/api/telegram/webhook` | POST | Webhook Telegram |
| `/api/google/route` | GET | OAuth Google |
| `/api/google/callback` | GET | Callback OAuth Google |
| `/api/biometria` | POST | Integração biometria |

### Jobs (Crons)
| Rota | Schedule (vercel.json) | Descrição |
|------|----------------------|-----------|
| `/api/jobs/relatorio-diario` | 21h UTC (18h BRT) diário | Relatório diário de vendas/emissões |
| `/api/jobs/processar-emails` | 8h UTC (5h BRT) diário | Disparo de emails automáticos (vencimentos) |
| `/api/jobs/processar-whatsapp` | 9h UTC (6h BRT) diário | Disparo de mensagens WhatsApp automáticas |
| `/api/jobs/social-media` | 8h UTC seg/qua/sex | Geração de conteúdo para redes sociais |
| `/api/jobs/relatorio-atividade` | 8h UTC dia 1 do mês | Relatório mensal de atividade |

**⚠️ ATENÇÃO:** Nenhum desses crons está ativo no Railway. O arquivo `vercel.json` era exclusivo do Vercel.

### Utilitários
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/upload` | POST | Upload de arquivos (Vercel Blob) |
| `/api/notificacoes` | GET | Notificações do usuário |
| `/api/auditoria` | GET | Logs de auditoria |
| `/api/usuarios` | GET/POST | Gestão de usuários |
| `/api/usuarios/[id]` | GET/PATCH/DELETE | Operações em usuário |
| `/api/noticias` | GET/POST | Comunicados internos |
| `/api/configuracoes/modelos` | GET/POST | Modelos de certificado |
| `/api/configuracoes/emails` | GET | Templates de email |
| `/api/calculadora/deslocamento` | POST | Cálculo de valor de deslocamento |
| `/api/assistente/chat` | POST | Assistente IA interno (Claude) |
| `/api/sistema/horario` | GET | Horário atual do servidor |
| `/api/sessao/heartbeat` | POST | Rastreia atividade do usuário |

---

## 11. Modelos Prisma

### `Usuario`
Usuário do sistema (AGR, operador, admin, financeiro).

Campos-chave: `username` (único, backfillado do email), `senha` (bcrypt), `role` (ADMIN/GERENTE/OPERADOR/FINANCEIRO/VISUALIZADOR), `ativo`, `comissao`.

### `Cliente`
Pessoa física ou jurídica que compra certificado. CPF/CNPJ únicos. Endereço completo para Safeweb.

### `Pedido`
Registro central da venda. Campos críticos:
- `status`: GERADO/VERIFICADO/EMITIDO/CANCELADO
- `safewebProtocolo`: número do protocolo Safeweb (campo principal)
- `numeroCompra`: alias histórico — mesmo valor que `safewebProtocolo`
- `safewebStatus`: **último** evento recebido via webhook (sobrescreve)
- `tipoAtendimento`: presencial/videoconferencia/emissao-online
- `hopeUrlDocumentos`: link do Hope para upload de documentos (videoconferência)
- `popupNotificacaoVisto`: controla popup "Certificado Emitido" para o AGR
- `safewebCancelamentoPendente`: true quando cancelamento local ocorreu sem confirmação Safeweb
- `emitidoEm`, `verificadoEm`, `canceladoEm`: timestamps de cada transição

### `Certificado`
Criado automaticamente quando Pedido vai para EMITIDO. Campos: `dataEmissao`, `dataVencimento`, `status` (ATIVO/VENCIDO/CANCELADO/RENOVADO/NAO_RENOVADO/REVOGADO), `numeroSerie`, `safewebId`.

Suporta encadeamento de renovação via `certificadoAnteriorId`.

### `Lancamento`
Registro financeiro (contas a receber ou pagar). Criado automaticamente na emissão. Campos de integração com Banco Inter: `interCobrancaId`, `pixCopiaECola`.

### `Parceiro`
Empresa parceira/indicadora. Suporta portal externo com `loginParceiro`/`senhaParceiro` e `permissoesPainel` (JSONB).

### `ModeloCertificado`
Catálogo de produtos: tipo (A1/A3), suporte (TOKEN/CARTAO/NUVEM/ARQUIVO), validade, preço, `codigoSafeweb`.

### Outras tabelas
`AuditLog`, `EmailLog`, `TemplateEmail`, `Configuracao`, `Noticia`, `SSTLead`, `SSTHistorico`, `Orcamento`, `PostSocial`, `SessaoAtividade`, `RenovacaoManual`, `HistoricoContato`, `ContatoParceiro`, `Comissao`.

---

## 12. Dívidas Técnicas

### Alta Prioridade

1. **Histórico de eventos Safeweb** — Criar tabela `safeweb_eventos` com: pedidoId, evento, protocolo, acao, payload completo (JSON), createdAt. Hoje `safewebStatus` sobrescreve — impossível rastrear sequência de eventos.

2. **Crons no Railway** — Substituir `vercel.json` por um processo de cron interno (node-cron, BullMQ, ou Railway Cron) para manter os 5 jobs rodando.

3. **Logs persistentes** — Implementar envio de logs para serviço externo (Logtail, Axiom, Datadog) antes que os logs voláteis do Railway causem perda de diagnóstico em produção.

4. **Rate limit persistente** — Migrar de Map in-memory para Redis (Railway oferece Redis nativo) para que o bloqueio de brute-force sobreviva a deploys.

5. **Apps Script** — Configurar o Google Apps Script para o Google Calendar; atualmente `APPS_SCRIPT_URL=pendente` e os agendamentos não criam eventos.

### Média Prioridade

6. **Unificar `safewebProtocolo` e `numeroCompra`** — São o mesmo dado em dois campos. Manter ambos por compatibilidade mas documentar que `safewebProtocolo` é o campo oficial.

7. **Catches silenciosos** — Substituir `catch { /* não bloqueia */ }` por log estruturado (pelo menos `console.error`).

8. **Observabilidade do webhook Safeweb** — Implementar um endpoint `/api/safeweb/status` que mostre os últimos N eventos recebidos (com timestamp) sem depender dos logs do servidor.

9. **Domínio `vazcertflow.com.br`** — Configurar no Railway após ativação pelo Hostgator (1-3 dias). Atualizar: NEXTAUTH_URL, AUTH_URL, Google OAuth redirect URIs, e notificar a Safeweb sobre nova URL do webhook.

10. **Revogar token Vercel antigo** — Token Vercel Personal ainda ativo. Revogar em vercel.com/account/tokens.

---

## 13. Roadmap Recomendado

### Curto prazo (até 7 dias)

- [ ] Fazer upgrade do Railway de Trial para plano pago
- [ ] Configurar domínio `vazcertflow.com.br` no Railway (quando ativar)
- [ ] Atualizar NEXTAUTH_URL, AUTH_URL e Google OAuth para o domínio definitivo
- [ ] Configurar crons no Railway (5 jobs do vercel.json)
- [ ] Ativar Apps Script para Google Calendar
- [ ] Revogar token Vercel antigo

### Médio prazo (até 30 dias)

- [ ] Tabela `safeweb_eventos` — histórico completo de webhooks
- [ ] Rate limit em Redis
- [ ] Logs persistentes (Logtail ou similar)
- [ ] Unificar `safewebProtocolo` / `numeroCompra`
- [ ] Substituir catches silenciosos por logs estruturados
- [ ] Implementar Fase 1 do Agente IA WhatsApp (FAQ + consulta de status)

### Longo prazo (próximo trimestre)

- [ ] Histórico inteligente de certificados (estrutura já criada no schema)
- [ ] Agente IA WhatsApp Fase 2 (agendamento) e Fase 3 (cobrança com aprovação)
- [ ] Painel de aprovação de cobranças no módulo Financeiro
- [ ] NFS-e via WhatsApp (projeto VAZ NFS-e, piloto em Piracaia)
- [ ] Integração completa com Centro de Inteligência V&G (PROJETO 001)

---

## 14. Resumo Executivo (para gestores)

### O que está funcionando

- **Sistema online e estável** no Railway (servidor dedicado, sem interrupções por tráfego)
- **Emissão de certificados presenciais** funciona 100% automaticamente: da venda à emissão sem intervenção manual
- **Videoconferências** funcionam: o sistema recebe o evento da Safeweb e atualiza o status automaticamente quando a reunião é concluída
- **Financeiro**: lançamento "a receber" é criado automaticamente no momento da emissão
- **WhatsApp e Telegram** operacionais para notificações internas
- **Portal de parceiros** com login separado e assistente Zoe

### O que não está funcionando

- **Envio automático de e-mails** (lembretes de vencimento de certificado) — o job está parado porque os crons do Vercel não foram migrados para o Railway
- **Agendamento no Google Calendar** — Apps Script não configurado
- **Geração automática de conteúdo para redes sociais** — mesmo motivo (cron parado)
- **Relatório diário** não está sendo enviado automaticamente

### Riscos principais

1. **Conta Railway em Trial** — o sistema ficará fora do ar quando o trial esgotar (até 30 dias ou $5). **Fazer upgrade imediatamente.**
2. **Histórico de webhooks inexistente** — se a Safeweb enviar um evento e houver erro no processamento, não há registro para diagnóstico posterior.
3. **Domínio `vazcertflow.com.br` pendente** — enquanto não configurado, o sistema usa a URL provisória do Railway.

### Próximos passos imediatos

1. Upgrade Railway (pagamento)
2. Configurar crons (restaurar emails, WhatsApp e relatórios automáticos)
3. Aguardar domínio `vazcertflow.com.br` ativar e configurar no Railway

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|------------|
| `DATABASE_URL` | Neon PostgreSQL (pooler) | Sim |
| `DIRECT_URL` | Neon PostgreSQL (direto, para migrations) | Sim |
| `AUTH_SECRET` | Chave JWT do NextAuth | Sim |
| `NEXTAUTH_URL` | URL base do sistema | Sim |
| `AUTH_URL` | URL base + `/api/auth` | Sim |
| `SAFEWEB_IDENTIFICADOR` | Credencial Safeweb produção | Sim |
| `SAFEWEB_SEGREDO` | Chave Safeweb produção | Sim |
| `SAFEWEB_CODIGO_AR` | UUID da AR na Safeweb | Sim |
| `SAFEWEB_CNPJ_AR` | CNPJ da AR | Sim |
| `SAFEWEB_ATTENDANCE_PLACE_ID` | ID do local de atendimento no Hope | Sim |
| `SAFEWEB_HOMOLOGACAO` | `false` em produção | Sim |
| `ANTHROPIC_API_KEY` | Chave Claude (assistente IA) | Sim |
| `DIGISAC_URL` | URL da API Digisac | Sim |
| `DIGISAC_TOKEN` | Token da API Digisac | Sim |
| `DIGISAC_CHANNEL_ID` | ID do canal WhatsApp | Sim |
| `BOT_ADMIN_NUMERO` | Número WhatsApp do admin | Sim |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram | Sim |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat ID do admin no Telegram | Sim |
| `SMTP_HOST` | Host SMTP (Brevo) | Sim |
| `SMTP_PORT` | Porta SMTP (587) | Sim |
| `SMTP_USER` | Usuário SMTP Brevo | Sim |
| `SMTP_PASS` | Senha SMTP Brevo | Sim |
| `SMTP_FROM` | Remetente dos emails | Sim |
| `GOOGLE_CLIENT_ID` | Client ID OAuth Google | Sim |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth Google | Sim |
| `APPS_SCRIPT_URL` | URL do Google Apps Script (agenda) | Pendente |
| `APPS_SCRIPT_TOKEN` | Token do Apps Script | Pendente |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (upload de arquivos) | Sim |
| `NODE_ENV` | `production` | Sim |
| `NEXT_PUBLIC_APP_NAME` | Nome do app (`CertFlow`) | Sim |
| `WEBMAIL_PASSWORD` | Senha do webmail Locaweb | Sim |

---

*Documento gerado automaticamente pela análise do código-fonte em 16/06/2026.*  
*Manter atualizado a cada mudança arquitetural relevante conforme GOVERNANCA.md — Regra 1.*
