# Especificação — Lançamento financeiro nasce na Emissão do Certificado

> **Status**: `IMPLEMENTADO E DEPLOYADO` (commit `a791e20`, 11/06/2026).
> Aguardando **validação operacional** (confirmação durante o fluxo normal
> da empresa de que o próximo pedido emitido gera exatamente 1
> `Lancamento` vinculado).
>
> **Decisão oficial (11/06/2026, Vinicius)**: o evento financeiro correto
> passa a ser **CERTIFICADO EMITIDO**, e não mais **PROTOCOLO GERADO**. O
> `Lancamento` (`tipo: 'RECEBER'`) só é criado quando o `Pedido` muda de
> status para `EMITIDO`.
>
> Esta mudança tem impacto direto na
> [especificação de Cancelamento Integrado](./ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md)
> (seção 8) — ver referência cruzada lá.

---

## 1. Objetivo / motivação

**Problema atual**: ao gerar o protocolo Safeweb (pedido `GERADO`), o
sistema já cria um `Lancamento` `RECEBER`/`PENDENTE`. Isso diverge da
operação real: a empresa concilia diariamente "certificados emitidos na
agenda" com "lançamentos do contas a receber", e protocolos gerados
antecipadamente (ex.: 50 protocolos gerados hoje para atendimento amanhã)
não representam receita realizada — geram divergência na conciliação.

**Nova regra**: o lançamento financeiro só nasce quando o certificado é
efetivamente emitido (`status: 'EMITIDO'`).

---

## 2. Situação atual (mapeada em código)

Dois pontos automáticos criam `Lancamento` no momento da **criação do
pedido** (`status: 'GERADO'`), antes de qualquer verificação/emissão:

- `src/app/api/pedidos/nova-venda/route.ts` (linhas ~417-433) — fluxo
  principal "Nova Venda" (com integração Safeweb).
- `src/app/api/pedidos/route.ts` (linhas ~105-114) — endpoint
  alternativo/genérico de criação de pedido.

`PATCH /api/pedidos/[id]` (`src/app/api/pedidos/[id]/route.ts`,
linhas 68-97), ao mudar `status` para `EMITIDO`, hoje **só cria o
`Certificado`** — não toca em `Lancamento`.

---

## 3. Nova regra proposta

- `nova-venda/route.ts` e `pedidos/route.ts` **deixam de criar**
  `Lancamento` no momento da criação do pedido.
- `PATCH /api/pedidos/[id]`, no bloco já existente que trata
  `status === 'EMITIDO' && antigo.status !== 'EMITIDO'` (mesmo bloco que
  cria o `Certificado`), passa a **também criar** o `Lancamento`
  `RECEBER`/`PENDENTE`, com os mesmos campos que hoje são preenchidos em
  `nova-venda/route.ts` (descrição, valor, `dataVencimento`,
  `tipoConta`, `referencia`, `formaPagamento`, `parceiroId`).
- Criação **idempotente**: antes de criar, verificar se já existe
  `Lancamento` com aquele `pedidoId` (proteção contra duplicidade e
  contra pedidos "em transição" — ver seção 8).

---

## 4. Arquivos que serão alterados

| Arquivo | Mudança |
|---|---|
| `src/app/api/pedidos/nova-venda/route.ts` | Remover bloco de criação de `Lancamento` (linhas ~417-433) |
| `src/app/api/pedidos/route.ts` | Remover bloco de criação de `Lancamento` (linhas ~105-114) |
| `src/app/api/pedidos/[id]/route.ts` | No bloco de `EMITIDO` (linhas 68-97), adicionar criação do `Lancamento` `RECEBER`/`PENDENTE` (idempotente) |
| `docs/changelog.md` | Registro da mudança (Regra 5 da governança) |
| `docs/ROADMAP_CORRECOES.md` | Registro do status da mudança |

Nenhuma alteração em `src/lib/safeweb.ts`.

---

## 5. Componentes / telas impactadas

- Nenhuma tela muda diretamente. O efeito é observado em:
  - Tela **Financeiro** (`/financeiro`) — "Contas a Receber" passa a
    listar apenas pedidos já emitidos.
  - Dashboard — cards "A Receber", "A Receber Vencidos", "Recebido no
    Mês" (`financeiro-tab.tsx` e widget `pedidos-abertos.tsx`) refletem
    valores menores (apenas pedidos `EMITIDO`).
  - "Vendas Hoje/Mês/Ano" e "Emissões" no dashboard principal **não
    mudam** — já são calculados a partir de `Pedido`, não de
    `Lancamento`.

---

## 6. APIs impactadas

- `POST /api/pedidos/nova-venda` — não cria mais `Lancamento`.
- `POST /api/pedidos` — não cria mais `Lancamento`.
- `PATCH /api/pedidos/[id]` — passa a criar `Lancamento` ao transicionar
  para `EMITIDO` (mesmo bloco que cria `Certificado`).
- `GET /api/financeiro/lancamentos` — sem alteração de código, mas o
  conjunto de dados retornado muda (menos lançamentos `PENDENTE` de
  pedidos não emitidos).

---

## 7. Tabelas impactadas

- `lancamentos` — sem alteração de schema. Apenas muda **quando** o
  registro é criado.
- `pedidos` — sem alteração de schema.

**Migration necessária**: **NÃO**. Esta mudança é puramente de lógica
(mover a criação de um lugar para outro), sem novos campos nem alteração
de enums.

---

## 8. Estratégia de migração da regra atual → nova regra

1. **Pedidos já existentes em `GERADO`/`VERIFICADO`** (criados sob a
   regra antiga) **já possuem** `Lancamento` `PENDENTE` criado no
   momento da criação. Esses lançamentos **não são removidos
   retroativamente** — continuam existindo e seguem seu ciclo normal
   (serão pagos ou cancelados conforme o pedido evolui).
2. Quando esses pedidos "de transição" forem marcados como `EMITIDO`, a
   checagem de idempotência (seção 3) **evita criar um segundo
   lançamento duplicado** — o lançamento já existente (criado sob a
   regra antiga) é mantido como está.
3. **Pedidos novos** (criados após a mudança) só terão `Lancamento` a
   partir do momento `EMITIDO`.
4. **Ponto em aberto — pagamento antecipado — RESOLVIDO em 22/06/2026
   (commit `c0abe1b`)**: se a empresa cobrar o cliente antes da emissão
   (ex.: para gerar boleto/Pix do Banco Inter no momento da venda), não
   havia `Lancamento` automático até a emissão, e a API já aceitava
   `pedidoId` opcional mas a **tela não tinha campo para isso** (só um
   texto livre "Referência", sem vínculo real). Adicionado campo
   "Vincular a um Pedido (opcional)" em
   `src/app/(dashboard)/financeiro/contas-a-receber/novo/page.tsx` —
   busca o pedido por número/cliente (`GET /api/pedidos?q=...`), preenche
   valor/descrição automaticamente e sugere vencimento de 3 dias. Quando
   o pedido for emitido depois, a checagem de idempotência (item 2)
   detecta o lançamento já existente e não cria um segundo. Esta foi a
   motivação real do caso de uso: ativar a cobrança via Banco Inter
   (ver `docs/changelog.md`, 22/06/2026) exigia que o Lançamento
   existisse antes da emissão.
5. **Conciliação**: recomenda-se um período de acompanhamento (1-2
   semanas) comparando "certificados emitidos" x "novos lançamentos
   `RECEBER` criados" para validar que a conciliação diária bate.

---

## 9. Estratégia de rollback

- Mudança concentrada em 3 arquivos, sem migration. `git revert` do(s)
  commit(s) restaura o comportamento anterior (lançamento criado na
  criação do pedido) sem qualquer efeito colateral em dados — nenhum
  dado é apagado, apenas o **momento de criação** muda.
- Lançamentos já criados (sob qualquer uma das regras) não são afetados
  por um rollback de código.

---

## 10. Estratégia de testes

**Automatizados (vitest)**:
- Teste de que `nova-venda` e `POST /api/pedidos` **não** criam
  `Lancamento`.
- Teste de que `PATCH /api/pedidos/[id]` com `status: 'EMITIDO'` cria
  `Lancamento` `RECEBER`/`PENDENTE` com os campos corretos.
- Teste de idempotência: chamar `EMITIDO` duas vezes (ou pedido que já
  tinha lançamento manual antecipado) não duplica o lançamento.

**Manuais (após deploy)**:
1. Criar pedido novo → confirmar que **nenhum** lançamento é criado.
2. Marcar pedido como `EMITIDO` → confirmar criação do `Lancamento`
   `RECEBER`/`PENDENTE` com valor/descrição corretos.
3. Marcar novamente como `EMITIDO` (ou reprocessar) → confirmar que
   **não** duplica o lançamento.
4. Pedido com lançamento manual antecipado (criado via Financeiro) →
   emitir → confirmar que não duplica.
5. Conferir dashboard/Financeiro: "A Receber" reflete apenas pedidos
   emitidos.

---

## 11. Riscos identificados

- **Pagamento antecipado sem lançamento automático** (seção 8.4) —
  mitigado pela criação manual já disponível para `ADMIN`/`GERENTE`, mas
  depende de processo operacional (a equipe precisa lembrar de criar o
  lançamento manual nesses casos). Recomendação: comunicar a mudança à
  equipe financeira/comercial antes do deploy.
- **Divergência entre "Vendas" e "A Receber"** nos indicadores — passa a
  ser maior e mais visível (esperado/correto sob a nova regra), mas pode
  gerar dúvidas se não for comunicado.
- **Pedidos "de transição"** (já `GERADO`/`VERIFICADO` no momento do
  deploy) mantêm o lançamento criado sob a regra antiga — comportamento
  misto temporário até esses pedidos serem emitidos/cancelados,
  considerado aceitável e transitório.
- **Impacto na Frente B (cancelamento)** — já registrado e refletido em
  `ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md` (seção 8): a etapa de
  "cancelar lançamentos pendentes" passa a ser, na maioria dos casos,
  não aplicável.

---

## Resumo executivo

- **Escopo**: mover a criação do `Lancamento` `RECEBER` de "pedido
  criado/protocolo gerado" para "pedido marcado como `EMITIDO`".
- **Complexidade**: baixa — 3 arquivos, sem migration, lógica já existe
  parcialmente (bloco de `EMITIDO` em `pedidos/[id]/route.ts` só precisa
  de mais um `prisma.lancamento.create`, com checagem de duplicidade).
- **Riscos principais**: pagamento antecipado sem lançamento automático
  (mitigado via lançamento manual já existente); comunicação à equipe
  sobre a nova divergência "Vendas" x "A Receber".
- **Recomendação**: aprovar e implementar **antes ou junto** da Frente B
  (cancelamento), já que simplifica a parte financeira do cancelamento.
