# Agente IA WhatsApp — V&G (CertFlow)

> Status: **Documento de arquitetura — pré-implementação**.
> Nenhum código deste projeto foi alterado para esta funcionalidade ainda.
> Este documento é a fonte oficial da verdade (Regra 8) para o que será
> construído nas próximas etapas.

## 1. Objetivo e princípios

**Objetivo**: ter um agente de IA conversando diretamente com clientes da
V&G via WhatsApp (Digisac), 24/7, agregando valor — triagem inicial, tirar
dúvidas rápidas, consultar status de pedidos/certificados e, em fases
futuras, agendamento e cobrança.

O cliente é o ativo mais importante da V&G. O agente existe para **somar**,
nunca para arriscar o relacionamento. Por isso, princípios inegociáveis:

1. **Transparência**: o agente sempre se identifica como atendimento
   virtual da V&G — nunca finge ser uma pessoa.
2. **Na dúvida, escala**: o agente nunca "chuta". Se não tem certeza,
   passa para um humano (alinhado à Regra 7 — proibição de suposições).
3. **Nada inventado**: prazos, valores, status e políticas vêm sempre do
   banco de dados real (`Cliente`, `Certificado`, `Lancamento`, `Pedido`),
   nunca da "memória" do modelo.
4. **Safeweb é sagrado**: qualquer assunto envolvendo protocolo Safeweb
   (emissão travada, erro técnico, acesso ao certificado) é escalado
   automaticamente — o agente não opina nem promete prazos.
5. **Tudo registrado**: toda mensagem trocada (entrada e saída) é gravada
   para auditoria (Regra 5/9 e LGPD).

## 2. Decisão de implementação: webhook próprio, sem IA paga do Digisac

A V&G já paga pelo Digisac e ele já está integrado ao CertFlow (webhook +
API de envio). O Digisac oferece um módulo de IA pago, mas a decisão é
**não usá-lo**: o webhook que já existe será estendido para processar as
mensagens de clientes com Claude, acessando diretamente os dados do
CertFlow — algo que a IA nativa do Digisac não consegue fazer.

## 3. Arquitetura técnica (visão geral)

```
Cliente (WhatsApp)
   │
   ▼
Digisac
   │  (webhook de mensagem recebida)
   ▼
POST /api/digisac/webhook   [já existe, em produção]
   │
   ├── Se número = BOT_ADMIN_NUMERO → fluxo ATUAL (bot de métricas para
   │     o Vinicius). NÃO MUDA.
   │
   └── Se número = cliente (novo branch, apenas adição) →
         src/lib/agenteCliente.ts
            │
            ├─ 1. Identifica o Cliente pelo telefone (mesmo padrão de
            │     buscarOuCriarContato: normaliza dígitos, match exato)
            │
            ├─ 2. Monta contexto: dados do cliente, certificados, pedidos,
            │     situação financeira resumida (sem detalhar valores na
            │     Fase 1) + histórico recente da conversa
            │     (agente_ia_conversas)
            │
            ├─ 3. Chama Claude com prompt estruturado → resposta JSON:
            │     { resposta, categoria, escalar, motivoEscalonamento }
            │
            ├─ 4. Grava a interação em agente_ia_conversas (entrada e
            │     saída, categoria, escalado, motivo)
            │
            └─ 5a. Se NÃO escalar → enviarWhatsApp(resposta) [já existe
                    em src/lib/digisac.ts]
               5b. Se ESCALAR → enviarWhatsApp(mensagem de transição) +
                    notifica a equipe (reaproveita o número admin /
                    fluxo já existente) para assumir a conversa no
                    Digisac normalmente.
```

**Pontos-chave de reuso** (não reinventar):
- `src/lib/digisac.ts` → `enviarWhatsApp()`, `buscarOuCriarContato()`
  (padrão de normalização/match de telefone), `gerarMensagemWhatsApp()`
  (referência de tom de voz já validado).
- `src/app/api/digisac/webhook/route.ts` → ponto único de entrada; recebe
  apenas **um novo branch aditivo**, o branch admin existente permanece
  literalmente igual (Regra 2 — funcionalidade congelada).

## 4. Escopo de dados acessados pelo agente

- **Identificação**: telefone/celular normalizado (mesmos dígitos finais
  usados em `buscarOuCriarContato`), com verificação exata. O agente nunca
  mistura dados de clientes diferentes.
- **Leitura permitida (Fase 1)**:
  - `Cliente`: dados cadastrais básicos (nome, situação ativa/inativa).
  - `Certificado`: status (ATIVO/VENCIDO/CANCELADO/RENOVADO), data de
    vencimento, modelo.
  - `Pedido`: status (GERADO/VERIFICADO/EMITIDO/CANCELADO).
  - `Lancamento`: apenas para responder de forma genérica se "está tudo em
    dia" — **sem detalhar valores, datas ou cobrança** na Fase 1 (isso é
    escopo da Fase 3).
- **Escrita**: nenhuma na Fase 1, exceto o próprio log de conversa
  (`agente_ia_conversas`).
- **Números não cadastrados** (leads/prospects): fora do escopo da Fase 1.
  A interação é registrada e escalada para humano — o agente não tenta
  atender quem não está na base de clientes.

## 5. Categorias de conversa e regras de escalonamento (Fase 1)

### Autônomo — o agente responde sozinho
- Saudação / triagem inicial ("oi, em que posso ajudar?").
- FAQ geral: prazos de validade de certificado, documentos necessários,
  como funciona o processo de emissão/renovação, formas de pagamento
  aceitas (informação genérica, não específica do cliente).
- Consulta de status: "meu certificado está pronto?", "meu pedido já foi
  emitido?".

### Escalonamento obrigatório — o agente para e chama humano
- Qualquer menção a **valores, descontos, negociação, cobrança, boletos**.
- Reclamações, insatisfação, tom agressivo ou de frustração.
- Cancelamento de pedido/certificado, reembolso.
- Qualquer assunto envolvendo **Safeweb** (processo travado, erro técnico,
  problema de acesso ao certificado).
- Cliente pedir explicitamente para falar com atendente humano.
- Agente com baixa confiança na resposta (categoria `escalar: true` quando
  o modelo não souber responder com segurança).
- Qualquer sinal de desconforto do cliente em falar com a IA.

### Mecanismo de escalonamento
1. Agente envia uma mensagem curta de transição ao cliente, ex.:
   *"Vou te conectar com nossa equipe, só um momento! 🙂"*.
2. Agente notifica a equipe internamente, reaproveitando o canal/admin já
   existente (mesmo número que recebe o bot de métricas hoje).
3. A equipe assume a conversa **dentro do Digisac**, normalmente — não é
   necessário nenhum recurso novo de "transferência de fila" no Digisac
   para a Fase 1.
4. A interação fica marcada como `escalado = true` em
   `agente_ia_conversas`, com o motivo, para revisão posterior.

## 6. Tom de voz da V&G

- Português, cordial, direto, sem formalidade excessiva.
- Referência já validada: `gerarMensagemWhatsApp()` em `src/lib/digisac.ts`
  (uso de itálico para a assinatura "_V&G Certificação Digital_", emojis
  pontuais, frases curtas).
- **Pendente antes do piloto**: refinar o tom com exemplos reais de
  conversas do Vinicius/equipe (Regra 7 — não assumir, confirmar com
  exemplos reais antes de codificar o prompt final).

## 7. Banco de dados — novas estruturas

A criar via `scripts/migrate.js`, seguindo o padrão `IF NOT EXISTS` já
usado no projeto (aditivo, sem alterar tabelas existentes).

### `agente_ia_conversas` (Fase 1)
Log de toda interação do agente com clientes — base de auditoria e de
contexto multi-mensagem.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid/pk | |
| `clienteId` | FK `Cliente`, nullable | nulo se número não identificado |
| `telefone` | string | normalizado |
| `direcao` | enum (`IN`/`OUT`) | mensagem do cliente ou do agente |
| `mensagem` | text | |
| `categoria` | string | ex.: FAQ, STATUS, TRIAGEM |
| `escalado` | boolean | |
| `motivoEscalonamento` | text, nullable | |
| `createdAt` | timestamp | |

### `agente_ia_cobranca_aprovacao` (estrutura documentada agora, criada na Fase 3)
Suporta o fluxo de aprovação de cobrança definido pelo usuário: **painel no
CertFlow (Financeiro) como fonte de verdade/auditoria + atalho de aprovação
via WhatsApp**.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid/pk | |
| `lancamentoId` | FK `Lancamento` | |
| `clienteId` | FK `Cliente` | |
| `mensagemSugerida` | text | rascunho gerado pela IA, no tom do Vinicius |
| `mensagemFinal` | text, nullable | preenchido se editada antes de aprovar |
| `status` | enum | `PENDENTE` / `APROVADO` / `REJEITADO` / `ENVIADO` |
| `aprovadoPor` | FK `Usuario`, nullable | |
| `aprovadoEm` | timestamp, nullable | |
| `canalAprovacao` | enum | `PAINEL` / `WHATSAPP` |
| `createdAt` | timestamp | |

## 8. Fases do rollout

### Fase 1 — Piloto (FAQ + status)
- Apenas clientes já cadastrados (telefone reconhecido).
- Apenas FAQ geral e consulta de status (seção 5).
- Escalonamento conservador: qualquer dúvida fora do roteiro vira
  escalonamento.
- Log completo de todas as conversas; revisão manual diária no início
  pela equipe/Vinicius.
- Critério para avançar: período de observação sem incidentes de
  relacionamento, com tom de voz validado.

### Fase 2 — Agendamento
- Adiciona marcação/reagendamento de atendimento, usando a integração com
  Google Calendar já existente no CertFlow.

### Fase 3 — Cobrança
- IA identifica clientes inadimplentes (`Lancamento` tipo `RECEBER`,
  `status` vencido).
- Gera rascunho de mensagem de cobrança no tom do Vinicius.
- Rascunho vai para `agente_ia_cobranca_aprovacao` com `status = PENDENTE`,
  visível no **painel do Financeiro** (fonte de verdade) e também via
  **atalho de aprovação por WhatsApp** para o Vinicius.
- Após aprovação, a mensagem é enviada via `enviarWhatsApp()` e o status
  muda para `ENVIADO`.
- A IA pode continuar a conversa sobre esse assunto, dentro das regras de
  escalonamento da Fase 1: ex. "vou pagar amanhã" → IA registra e
  agradece; "quero parcelar" / "quero desconto" → escalar para humano.

Cada fase exige aprovação explícita do Vinicius antes de ir para clientes
reais (Regras 2, 3 e 10 — produção real, cliente é o ativo mais sensível).

## 9. Riscos e mitigações (Regra 9 / LGPD)

| Risco | Mitigação |
|---|---|
| Vazamento de dados entre clientes | Identificação por telefone com verificação exata, mesmo padrão de `buscarOuCriarContato`. Nunca expor dados de outro cliente. |
| IA prometer algo que a V&G não cumpre | Categorias de escalonamento cobrem os temas sensíveis (valores, cancelamento, Safeweb). Respostas de FAQ vêm de uma base revisada por humano, não "de cabeça" do modelo. |
| Custo de chamadas à IA | Log em `agente_ia_conversas` permite monitorar volume. Modelo recomendado: `claude-haiku-4-5` (já em uso no bot admin). |
| Retenção de dados de conversa (LGPD) | **Pendente**: definir política de retenção/expurgo de `agente_ia_conversas` com o Vinicius antes do piloto ir ao ar. |

## 10. Próximos passos (fora do escopo deste documento)

Após revisão deste documento pelo Vinicius:
1. Planejar a implementação técnica da Fase 1 (novo branch no webhook,
   `src/lib/agenteCliente.ts`, migration de `agente_ia_conversas`, prompt
   de FAQ) como uma etapa separada.
2. Essa etapa terá sua própria análise de impacto (Regra 3) e atualização
   de `docs/changelog.md` (Regra 5).
3. Definir com o Vinicius exemplos reais de conversas para calibrar o tom
   de voz (seção 6) e a base de FAQ (seção 5).
4. Definir política de retenção de dados de conversa (seção 9).