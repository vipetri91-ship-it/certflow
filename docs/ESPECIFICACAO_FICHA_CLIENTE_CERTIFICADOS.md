# Especificação Funcional — Ficha do Cliente Centrada em Certificados (Frente D / Fase 8)

> **Status**: `EM REVISÃO — documento funcional, sem alteração de schema/código`
> (15/06/2026, Vinicius). Este documento é a especificação detalhada da
> **Fase 8** descrita em
> [ESPECIFICACAO_HISTORICO_CERTIFICADOS_RENOVACOES.md](./ESPECIFICACAO_HISTORICO_CERTIFICADOS_RENOVACOES.md)
> ("Nova UI da ficha do cliente"), incorporando os ajustes conceituais
> solicitados após a primeira proposta funcional.
>
> Nenhuma alteração de schema, banco ou código foi realizada nesta etapa.
> O schema da Fase 2 (já aplicado em produção) é suficiente para os itens
> 1, 2, 4 e 5 deste documento. O item 3 (bonificação — valor comercial vs.
> valor cobrado) identifica uma **lacuna de schema** a ser tratada em fase
> futura (Fase 9), documentada na seção 5.
>
> **Revisão de premissa (15/06/2026)**: identificado que um cliente pode
> ter múltiplos certificados simultâneos e válidos (mesmo modelo ou
> diferentes), e que a existência de um certificado novo **não implica**
> que outro foi substituído. Toda a estratégia de vínculo de renovação foi
> revisada para **decisão explícita do operador** — nenhum vínculo
> `certificadoAnteriorId` é criado automaticamente. A Fase 8 foi dividida
> em **Fase 8A** (vínculo manual — escopo desta revisão, seção 10) e
> **Fase 8B** (motor de sugestões automáticas, futuro). Seções 3 e 8 deste
> documento permanecem válidas; a seção 10 detalha o mecanismo de vínculo
> manual referenciado nelas.

---

## 1. Objetivo

Redesenhar a ficha do cliente (`/clientes/[id]`) para que ela seja a
**fonte principal de consulta operacional** sobre a relação do cliente com
a V&G, centrada em `Certificado` — não em `Pedido`.

Este documento resolve 6 ajustes conceituais sobre a proposta anterior:

1. Regra de exclusividade mútua entre os estados finais de um certificado.
2. Hierarquia visual dos campos no card de certificado.
3. Distinção entre Valor Comercial e Valor Cobrado em bonificações.
4. Hierarquia formal da fonte da verdade (Certificado → Controle de
   Vencimentos → Renovação).
5. Integração das Renovações Manuais ao histórico cronológico único do
   cliente.
6. Caso real validado — Vinicius Antonio Silveira Petri.

---

## 2. Princípio arquitetural — fonte da verdade (ajuste 4)

Formalizando a hierarquia de dependência entre os três conceitos:

```
   CERTIFICADO
       │
       │  (1 registro por certificado emitido/importado/decidido)
       ▼
CONTROLE DE VENCIMENTOS
       │
       │  (recorte/filtro de Certificado + RenovacaoManual por data
       │   de vencimento e status)
       ▼
   RENOVAÇÃO
       │
       │  (consequência: vínculo certificadoAnteriorId entre dois
       │   registros de Certificado, criado a partir de uma decisão
       │   tomada na ficha do cliente ou no Controle de Vencimentos)
```

### Regras formais

1. **`Certificado` é a única fonte de verdade sobre "o que existe e qual o
   estado atual"**. Nenhuma tela (`/renovacoes`, ficha do cliente,
   relatórios) mantém um estado próprio e paralelo.
2. **`/renovacoes` (Controle de Vencimentos) é estritamente uma visão
   derivada** — uma query/filtro sobre `Certificado` + `RenovacaoManual`.
   Qualquer ação feita a partir dessa tela (ex.: "Marcar Não Renovou",
   "Vincular renovação") **escreve em `Certificado`/`RenovacaoManual`**,
   nunca em uma estrutura própria do Controle de Vencimentos.
3. **"Renovação" não é uma entidade — é uma relação** entre dois registros
   de `Certificado` (via `certificadoAnteriorId`/`certificadoRenovacao`).
   Ela é sempre uma *consequência* de uma decisão tomada sobre um
   certificado existente (automática na emissão, ou manual a partir da
   ficha/Controle de Vencimentos).
4. Consequência prática: **a ficha do cliente também é uma visão derivada
   de `Certificado` + `RenovacaoManual`** — ela não introduz nenhum
   conceito novo de dado, apenas reorganiza a apresentação desses dois
   modelos em torno do cliente.

Esta hierarquia já é compatível com o schema da Fase 2 — nenhuma alteração
necessária para suportá-la.

---

## 3. Estados finais mutuamente exclusivos (ajuste 1)

### Regra de negócio

Um certificado, ao final de seu ciclo de vida, está em **exatamente um**
dos três estados finais:

```
RENOVADO       — existe um certificado sucessor (certificadoRenovacao != null)
NAO_RENOVADO   — decisão explícita: cliente não renovou
REVOGADO       — certificado revogado/cancelado
```

Esses três estados **nunca coexistem para o mesmo certificado**. Enquanto
nenhum deles se aplica, o certificado está em estado aberto (`ATIVO`,
podendo ser exibido como "Vencido" de forma derivada).

### Regra de transição — vínculo de renovação sempre prevalece

> **Se `certificadoAnteriorId` de um certificado B passa a apontar para um
> certificado A (vínculo criado de forma automática — Fase 4 — ou manual),
> o certificado A DEVE ter `status = RENOVADO`, independentemente de
> qualquer estado anterior.**

Exemplo do enunciado (A → B):

```
Antes:   Certificado A = NAO_RENOVADO (motivo: "não usa mais token")
Ação:    Cliente volta e compra. Certificado B é emitido e vinculado
         a A (B.certificadoAnteriorId = A.id)
Depois:  Certificado A = RENOVADO   ← status corrigido automaticamente
         Certificado B = ATIVO
```

#### O que acontece com `motivoNaoRenovacao`/`naoRenovadoEm` de A?

Os campos **não são apagados** — passam a representar um registro
histórico ("em algum momento esse certificado foi marcado como não
renovado, mas o cliente retornou"). Esse dado tem valor para relatórios de
**win-back** ("clientes que voltaram depois de marcados como não
renovados"). Porém:

- O **badge de status exibido** mostra sempre `RENOVADO` (o estado final
  vigente vence o histórico).
- O bloco de "motivo" (seção 4) **não é mais exibido como destaque
  principal** do card — passa a aparecer como nota secundária/expansível:
  *"Obs.: este certificado havia sido marcado como Não Renovou em
  09/06/2026, mas o cliente retornou e renovou em 15/06/2026."*

#### Caso `REVOGADO` + vínculo de renovação

`REVOGADO` é o estado mais severo (problema documental/legal com aquele
certificado específico) e é setado apenas por ação manual explícita.
Diferentemente de `NAO_RENOVADO`, **não é automaticamente sobrescrito** por
um vínculo de renovação — um certificado revogado pode ter um sucessor
(reemissão corretiva) sem que isso "desfaça" a revogação, que é um fato
sobre aquele registro específico.

Tratamento proposto:
- `REVOGADO` continua sendo o badge exibido para esse certificado.
- Se houver `certificadoRenovacao != null`, exibir nota adicional: *"Um
  novo certificado foi emitido em substituição em DD/MM/AAAA"* — sem
  alterar o badge.
- Caso real de "revogado + depois renovado" seja identificado em produção,
  tratar como exceção e revisar manualmente (não há regra automática
  adicional nesta fase).

### Diagrama de estados

```
              ┌────────┐
   (criação) →│ ATIVO  │
              └───┬────┘
                  │
   ┌──────────────┼───────────────────┬────────────────┐
   │              │                    │                │
   ▼              ▼                    ▼                ▼
vínculo de    decisão manual      decisão manual    (nenhuma decisão,
renovação     "Não Renovou"       "Revogar"          dataVencimento
(auto/manual)     │                    │              < hoje)
   │              ▼                    ▼                │
   ▼         NAO_RENOVADO  ──vínculo──► RENOVADO         ▼
RENOVADO          │          renovação      ▲      "Vencido" (derivado,
   │              └──────────────────────────┘       badge apenas —
   ▼                                                   não é status)
(estado final)
```

---

## 4. Hierarquia visual do card de certificado (ajuste 2)

### Campos primários (sempre visíveis, em destaque)

| Campo | Fonte |
|---|---|
| Modelo | `certificado.modelo.nome` (+ `tipoCertificado`/`suporte` como subtítulo) |
| Validade | calculado: `modelo.validadeMeses` ou diferença `dataVencimento - dataEmissao` |
| Data de emissão | `certificado.dataEmissao` |
| Data de vencimento | `certificado.dataVencimento` |
| Status | badge (seção 3 do documento anterior — `Válido`/`Vencido`/`Renovado`/`Não Renovou`/`Revogado`) |
| AGR responsável | `certificado.pedido?.agr` |

### Campos secundários (área recolhida/discreta, segunda linha menor ou "detalhes")

| Campo | Fonte |
|---|---|
| Número do pedido | `certificado.pedido?.numero` |
| Protocolo/Nº de série | `certificado.numeroSerie` |
| Tipo de atendimento | `certificado.pedido?.tipoAtendimento` |
| Número da compra (Safeweb) | `certificado.pedido?.numeroCompra` |

### Mockup revisado

```
┌──────────────────────────────────────────────────────────────────┐
│  E-CPF A3 — Sem Mídia                                ✅ Válido      │
│  Validade: 24 meses                                                │
│                                                                     │
│  Emissão: 15/06/2026        Vencimento: 15/06/2028                 │
│  AGR responsável: laryssa                                          │
│                                                          🎁 Bonificado│
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│  Pedido: PED-000231  ·  Protocolo: —  ·  Atendimento: Presencial   │
│  Valor comercial: R$ 450,00     Valor cobrado: R$ 0,00             │
└──────────────────────────────────────────────────────────────────┘
```

A linha pontilhada separa visualmente "o que o cliente tem" (bloco
superior, tipografia maior) de "como isso foi operacionalizado" (bloco
inferior, tipografia menor/cinza — equivalente a um rodapé de card).

---

## 5. Bonificação — Valor Comercial vs. Valor Cobrado (ajuste 3)

### Necessidade

A V&G precisa, no futuro, gerar relatórios de:
- Quanto foi concedido em bonificações (soma de descontos integrais/parciais).
- Quanto deixou de ser faturado por bonificação.
- Quantidade de certificados/lançamentos bonificados no período.

Isso exige **dois valores por lançamento**:
- **Valor Comercial**: o valor de tabela/referência do que foi entregue
  (ex.: R$ 450,00).
- **Valor Cobrado**: o valor efetivamente cobrado do cliente (ex.: R$ 0,00
  em bonificação total, ou um valor intermediário em bonificação parcial).

### O schema atual (Fase 2) suporta isso?

**Parcialmente.** Hoje `Lancamento` tem:
- `valor Decimal` — um único valor.
- `bonificado Boolean @default(false)`.

Isso permite **identificar** que um lançamento é bonificado e **excluí-lo
dos agregados de receita** (`bonificado: false` no `where`), mas **não
permite registrar os dois valores simultaneamente** — hoje `valor`
representaria ou o comercial ou o cobrado, mas não ambos.

### Lacuna identificada e proposta para fase futura (Fase 9)

Proposta (apenas registrada aqui — **não implementar agora**):

```prisma
model Lancamento {
  // ...campos existentes...
  valor          Decimal  @db.Decimal(10, 2)  // valor efetivamente cobrado (já existente)
  valorComercial Decimal? @db.Decimal(10, 2)  // novo: valor de tabela/referência
  bonificado     Boolean  @default(false)     // já existente (Fase 2)
}
```

Regras de preenchimento (a definir na Fase 9):
- Lançamento normal (não bonificado): `valorComercial` pode ficar `null`
  (ou igual a `valor`, para simplificar consultas).
- Lançamento bonificado: `valorComercial` = valor de tabela do
  modelo/serviço; `valor` = valor efetivamente cobrado (`0,00` em
  bonificação total).
- Relatórios futuros: `SUM(valorComercial - valor) WHERE bonificado = true`
  → total concedido em bonificações no período.

Esta alteração é **aditiva** (`ADD COLUMN IF NOT EXISTS`, nullable) e segue
o mesmo padrão idempotente do `migrate.js` — proposta para ser incluída
junto da Fase 9 (UI de bonificação), não nesta fase.

### Exibição na ficha (com o schema atual, sem alteração)

Enquanto `valorComercial` não existe, a ficha do cliente exibe apenas o
que o schema atual permite:
- Lançamento **não bonificado**: `Valor: R$ {valor}`.
- Lançamento **bonificado**: `Valor cobrado: R$ {valor}` (hoje
  provavelmente `R$ 0,00`) + badge `🎁 Bonificado`, **sem** a linha "Valor
  comercial" (ainda não há de onde buscar esse dado).

Quando a Fase 9 adicionar `valorComercial`, a ficha passa a exibir as duas
linhas como no mockup da seção 4, sem necessidade de retrabalho estrutural
do card.

---

## 6. Renovações Manuais no histórico unificado (ajuste 5)

### Análise: seção separada vs. timeline única

| | Seção separada ("Acompanhamento de Renovação") | Timeline única (proposta revisada) |
|---|---|---|
| **Vantagem** | Separação clara entre "o que é certificado real" e "o que é expectativa" | Visão cronológica completa — "toda a história do cliente em um único fluxo", como solicitado |
| **Vantagem** | Mais simples de implementar (duas queries, duas listas) | Permite ver o contexto temporal: ex. "o cliente avisou em março que o certificado externo venceria em janeiro do ano seguinte" relativo aos certificados V&G |
| **Desvantagem** | Fragmenta a narrativa do cliente em duas áreas | Risco de **misturar tipos diferentes de registro** (certificado real vs. expectativa) sem deixar isso visualmente óbvio |
| **Desvantagem** | Usuário pode não notar a segunda seção | Critério de ordenação não é trivial: `RenovacaoManual` não tem `dataEmissao` |
| **Desvantagem** | — | Registro `CONVERTIDA` pode gerar duplicidade (a oportunidade E o certificado resultante aparecendo como dois itens) |

### Decisão proposta: **timeline única, com diferenciação visual por tipo de card**

Concordo com a preferência do usuário — **uma única lista cronológica**,
mas com regras claras para evitar os problemas de duplicidade/ambiguidade:

1. **Critério de data para ordenação**:
   - `Certificado` → ordenado por `dataEmissao`.
   - `RenovacaoManual` → ordenado por `createdAt` (quando a expectativa foi
     registrada) — não por `dataVencimento`, pois `dataVencimento` é no
     futuro e misturaria a ordem cronológica real dos eventos. A
     `dataVencimento` continua sendo exibida *dentro* do card, apenas não
     determina a posição na timeline.

2. **Card de `RenovacaoManual` é visualmente distinto** (mesma timeline,
   estilo diferente — borda pontilhada, ícone 🔔, fundo neutro):

```
┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
┊  🔔 E-CNPJ A1 (fornecedor externo)        🟡 Em acompanhamento         ┊
┊  Vencimento informado: 05/01/2027                                     ┊
┊  Observação: "Cliente disse que vai renovar com a V&G"                ┊
┊  Origem: Manual · Responsável: Ana Karolina · Registrado em 20/05/2026┊
└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
```

   - Borda **pontilhada** = "isso não é um certificado V&G".
   - Badge de status próprio (`🟡 Em acompanhamento` / `⚪ Descartado`),
     **nunca** reaproveita os badges de `Certificado` (Válido/Renovado/etc.)
     — evita confusão sobre "quantos certificados o cliente tem".

3. **Status `CONVERTIDA` não gera card próprio** — quando uma
   `RenovacaoManual` é convertida, ela **deixa de aparecer como item da
   timeline** e passa a ser uma *nota* dentro do card do `Certificado`
   resultante:

```
┌──────────────────────────────────────────────────────────────────┐
│  E-CNPJ A1 — Nuvem                                  ✅ Válido       │
│  ...                                                                │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│  ℹ️ Origem: convertido de oportunidade registrada em 20/05/2026     │
└──────────────────────────────────────────────────────────────────┘
```

4. **Status `DESCARTADA`**: continua aparecendo na timeline (faz parte da
   história real — "o cliente foi abordado e não converteu"), mas com
   estilo "apagado" (texto cinza-claro, badge `⚪ Descartado`), e
   recolhido por padrão se houver muitos itens descartados (ex.: "+ 3
   oportunidades descartadas — expandir").

### Resultado

Uma única lista vertical, ordenada cronologicamente, onde:
- Certificados V&G (Fase 2/4/2b) = cards "sólidos", protagonistas.
- Renovações manuais em aberto/descartadas = cards "pontilhados",
  contextuais.
- Conversões = absorvidas como anotação dentro do certificado resultante.

Isso entrega exatamente o "fluxo único" pedido, sem perder a centralidade
do certificado como entidade principal.

---

## 7. Estrutura final da página

```
┌────────────────────────────────────────────────┐
│ Cabeçalho do Cliente (inalterado)                │
├────────────────────────────────────────────────┤
│ HISTÓRICO DO CLIENTE  (timeline única,           │
│ cronológica, mais antigo → mais recente)         │
│                                                    │
│   [card certificado] ─ 🔄 renovado em DD/MM       │
│   [card certificado]                              │
│   [card renovação manual, pontilhado]             │
│   [card certificado com nota de conversão]        │
│   ...                                             │
├────────────────────────────────────────────────┤
│ ATENDIMENTOS EM ANDAMENTO                         │
│  - Pedidos sem certificado emitido (seção 1 do    │
│    documento anterior, mantida sem alteração)     │
└────────────────────────────────────────────────┘
```

A seção "Atendimentos em Andamento" permanece separada (não é histórico
fechado — é trabalho pendente do time, conforme já justificado no
documento anterior).

---

## 8. CASO REAL VALIDADO — Vinicius Antonio Silveira Petri

### Cenário

| | Certificado 1 | Certificado 2 |
|---|---|---|
| Modelo | E-CPF A3 — Sem Mídia | E-CPF A3 — Sem Mídia |
| Validade | 12 meses | 24 meses |
| Emissão | 09/06/2025 | 15/06/2026 |
| Vencimento | 09/06/2026 | 15/06/2028 |
| Status final | `NAO_RENOVADO` (com motivo) | `ATIVO` (Válido) |
| Financeiro | normal | `bonificado = true` |

> Observação: como `certificadoAnteriorId` ainda não é populado
> automaticamente (Fase 4 não implementada), este caso considera que o
> vínculo entre os dois certificados foi criado **manualmente** no momento
> da emissão do Certificado 2 (ação prevista para a Fase 8, "vincular a um
> certificado anterior" — UI a definir). Sem esse vínculo manual, os dois
> certificados apareceriam como dois itens **não conectados** na timeline,
> cada um com seu próprio badge — o Certificado 1 permaneceria
> `NAO_RENOVADO` (correto, pois nenhuma renovação foi registrada).

### 8.1 Como aparece na ficha do cliente (timeline)

```
┌──────────────────────────────────────────────────────────────────┐
│  E-CPF A3 — Sem Mídia                              ✖ Não Renovou   │
│  Validade: 12 meses                                                │
│                                                                     │
│  Emissão: 09/06/2025        Vencimento: 09/06/2026                 │
│  AGR responsável: laryssa                                          │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│  Pedido: PED-000123  ·  Atendimento: Presencial                    │
│  Valor: R$ 250,00                                                  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ⚠ Motivo da não renovação — registrado em 09/06/2026         │  │
│  │ "Cliente optou por token físico com outro fornecedor"        │  │
│  │ Registrado por: Vinicius Petri                                │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                          │
            🔄 Vinculado manualmente como renovado em 15/06/2026
            (status de Certificado 1 passa a RENOVADO — ver seção 3)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  E-CPF A3 — Sem Mídia                                ✅ Válido      │
│  Validade: 24 meses                                                │
│                                                                     │
│  Emissão: 15/06/2026        Vencimento: 15/06/2028                 │
│  AGR responsável: laryssa                                          │
│                                                          🎁 Bonificado│
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│  Pedido: PED-000231  ·  Atendimento: Presencial                    │
│  Valor cobrado: R$ 0,00  (Valor comercial: R$ 450,00 — quando       │
│  Fase 9 estiver disponível; hoje exibe apenas "Valor cobrado: R$ 0")│
└──────────────────────────────────────────────────────────────────┘
```

> **Nota sobre a regra da seção 3**: caso o vínculo seja criado, o badge do
> Certificado 1 muda de `✖ Não Renovou` para `🔄 Renovado`, e o bloco de
> motivo passa para nota secundária ("havia sido marcado como Não Renovou
> em 09/06/2026, mas o cliente retornou"). O mockup acima mostra o estado
> **antes** do vínculo (`Não Renovou`, motivo em destaque) para refletir
> literalmente o cenário descrito no pedido ("Certificado 1 ... Não
> renovado"). Após o vínculo manual, o card do Certificado 1 muda para o
> estado `Renovado` conforme a regra da seção 3.

### 8.2 Como aparece no financeiro

- O lançamento (`Lancamento`) referente ao Pedido `PED-000231` (Certificado
  2) tem `bonificado = true`.
- **Extrato do cliente / histórico de lançamentos**: aparece normalmente,
  com tag `🎁 Bonificado`, valor `R$ 0,00`.
- **Relatórios de receita** (`contas-a-receber`, dashboards, KPIs — seção
  5.5 da especificação Frente D): este lançamento **não soma** ao total de
  receita, pois o `where` passa a incluir `bonificado: false`.
- **Relatório futuro de bonificações** (Fase 9, dependente de
  `valorComercial`): apareceria como "1 certificado bonificado no período —
  R$ 450,00 não faturados".

### 8.3 Como aparece no Controle de Vencimentos

- **Certificado 1** (`NAO_RENOVADO`): **não aparece** no radar de "a
  vencer"/"vencidos ativos" — está em estado final. Pode aparecer em uma
  aba histórica "Não Renovados" (já prevista na seção 5.3 da especificação
  Frente D) para fins de reabordagem/win-back, filtrando por
  `status: 'NAO_RENOVADO'`.
- **Certificado 2** (`ATIVO`, vencimento 15/06/2028): não aparece no radar
  *hoje* (15/06/2026), pois está muito além da janela de "a vencer". Vai
  aparecer automaticamente quando `dataVencimento` entrar na janela
  configurada (ex.: 60/30/15/7 dias), sem nenhuma ação manual — é a
  consequência natural de `/renovacoes` ser uma visão derivada (seção 2).

### 8.4 Como aparece após a futura importação do histórico legado

Supondo que o **Certificado 1** (12 meses, vencido em 09/06/2026, não
renovado) tivesse sido importado do sistema legado em vez de criado no
CertFlow:

- Ele seria importado como um registro `Certificado` normal, com
  `status = NAO_RENOVADO`, `motivoNaoRenovacao` e `naoRenovadoEm` (se o
  legado tiver esse dado) ou em branco (se não tiver — campos opcionais).
- Na timeline da ficha, apareceria **exatamente como no mockup da seção
  8.1** — sem nenhuma diferenciação visual obrigatória entre "criado no
  CertFlow" e "importado".
- Se o legado também tiver o **Certificado 2** com algum identificador de
  "isso é renovação do certificado X", a importação pode preencher
  `certificadoAnteriorId` diretamente — o conector "🔄 Renovado em DD/MM"
  apareceria automaticamente, sem qualquer ação manual do usuário.
- Caso o legado **não tenha** essa informação de vínculo, cada certificado
  importado aparece como item independente da timeline (cadeia de 1
  elemento) — comportamento idêntico ao de qualquer certificado sem
  vínculo hoje.
- Renovações manuais importadas (`origem = IMPORTADO`) aparecem na mesma
  timeline, com o card pontilhado da seção 6, sem necessidade de nenhuma
  tela adicional.

**Conclusão**: a estrutura proposta já é compatível com a importação —
nenhum campo ou tela adicional é necessário para o cenário de migração do
legado, conforme também já indicado na seção 8 do documento anterior.

---

## 9. Itens pendentes / fora do escopo deste documento

- **`Lancamento.valorComercial`** (seção 5) — alteração de schema proposta
  para a Fase 9, não implementada agora.
- **Backfill (Fase 2b)**, **conversão automática (Fase 5)**, **ajustes de
  receita com `bonificado` (Fase 9)**, **CRUD de `RenovacaoManual` (Fase
  7)** — inalterados, conforme plano de execução já aprovado.
- **Fase 8B** (motor de sugestões automáticas de renovação) — ver seção
  10.5.

---

## 10. Fase 8A — Vínculo manual de renovação (escopo desta etapa)

A Fase 8 original ("Nova UI da ficha do cliente") foi dividida em duas
entregas independentes, na ordem de menor risco operacional:

- **Fase 8A** (esta seção): redesenho da ficha (seções 4, 6, 7, 8 — sem
  alteração) **+** ação manual para o operador declarar "certificado A foi
  renovado pelo certificado B". Substitui o antigo "Fase 4 — Auto-linking".
- **Fase 8B** (futura, sem data definida): motor de sugestões automáticas
  de candidatos a vínculo (heurísticas, busca inteligente) — apenas
  sugere, nunca grava.

### 10.1 Princípio

Nenhum vínculo `certificadoAnteriorId` é criado sem uma ação explícita do
operador. O sistema não tenta inferir nada a partir de cliente, modelo ou
datas — apenas oferece o mecanismo de busca e confirmação.

### 10.2 Onde aparece

Na timeline da ficha do cliente (seção 6/7), todo certificado **que ainda
não foi marcado como renovado por outro** (`certificadoRenovacao == null`)
exibe, na área de "Renovação" do card, a ação:

```
🔗 Marcar como renovado por...
```

### 10.3 Fluxo de seleção

1. Operador clica em "🔗 Marcar como renovado por...".
2. Abre um seletor listando **todos os outros certificados do mesmo
   cliente** — **sem filtro por modelo, tipo ou validade** (cobre os casos
   legítimos citados: A1 → A3, Token → Nuvem, 12 → 24/36 meses).
   - Exclui o próprio certificado.
   - Exclui certificados que já têm `certificadoAnteriorId` preenchido
     (já são "sucessores" de outro — um certificado só pode renovar um
     único anterior).
3. Cada opção do seletor exibe contexto suficiente para a decisão: Modelo,
   validade, data de emissão, status atual. Exemplo:
   ```
   E-CPF A3 — Nuvem · 24 meses · emitido 15/06/2026 · ✅ Válido
   E-CNPJ A1 · 12 meses · emitido 02/03/2026 · ✅ Válido
   ```
4. Modal de confirmação: *"O certificado [A] será marcado como Renovado
   pelo certificado [B]. Confirmar?"*

### 10.4 Efeito da confirmação (transacional)

- `B.certificadoAnteriorId = A.id`
- `A.status = RENOVADO`
  - Se `A` tinha `motivoNaoRenovacao`/`naoRenovadoEm` preenchidos (estava
    `NAO_RENOVADO`), esses campos **são preservados** como nota histórica
    (regra já aprovada na seção 3) — não são apagados.
  - Se `A.status == REVOGADO`: o vínculo é criado, mas o status de `A`
    **permanece** `REVOGADO` (regra já aprovada na seção 3) — exibida nota
    adicional "substituído por [B] em DD/MM".
- Registro em `AuditLog` (quem confirmou, quando, `A` → `B`).
- Timeline passa a exibir o conector "🔄 Renovado em DD/MM" entre os cards
  de `A` e `B` (mockup da seção 8.1).

### 10.5 Validações e erros

| Condição | Resultado |
|---|---|
| `B` já possui `certificadoAnteriorId` apontando para outro certificado | Bloqueado (409) — "Este certificado já está vinculado como renovação de outro" |
| `A` já possui `certificadoRenovacao` (já foi marcado como renovado por outro) | Bloqueado (409) — "Este certificado já foi marcado como renovado" |
| `A === B` | Bloqueado (400) |
| `A` e `B` de clientes diferentes | Bloqueado no backend (a busca do seletor já filtra por cliente, mas a API revalida) |

### 10.6 Desfazer vínculo

Incluído na Fase 8A por ser de baixo custo e relevante para erros de
clique:

- Ação "Desfazer vínculo de renovação", visível para o mesmo perfil que
  pode criar o vínculo (seção 10.7).
- Efeito: `B.certificadoAnteriorId = null`; status de `A` é recalculado:
  - se `A` tinha `motivoNaoRenovacao` preenchido → volta para
    `NAO_RENOVADO`;
  - senão → volta para `ATIVO` (ou `VENCIDO`, conforme `dataVencimento`,
    se essa derivação já existir na tela de certificados);
  - se `A.status == REVOGADO`, nada muda (o vínculo não havia alterado o
    status).
- Registrado em `AuditLog` como ação separada.

### 10.7 Permissões

Mesmo conjunto de perfis que hoje acessa a ação "Renovar" em
`src/app/(dashboard)/clientes/[id]/renovar-button.tsx` e o endpoint
`src/app/api/certificados/[id]/renovar/route.ts` — a confirmar/documentar
durante a análise de impacto da implementação (próxima etapa), já que
esses dois arquivos provavelmente serão substituídos ou absorvidos pelo
novo fluxo de vínculo.

### 10.8 Fora do escopo da Fase 8A (= Fase 8B)

- Motor de sugestões automáticas (heurísticas cliente+modelo+janela de
  datas), conforme análise da etapa anterior.
- Estrutura `SugestaoRenovacaoIgnorada` (schema futuro).
- Exibição de sugestões no Controle de Vencimentos.
- Reaproveitamento da ação de vínculo manual dentro de `/renovacoes` —
  pode ser feito como extensão natural da 8A (mesmo componente/endpoint),
  mas não é bloqueante; a avaliar na análise de impacto.

### 10.9 Por que essa divisão reduz risco

- Superfície de mudança pequena: 1 endpoint (criar/desfazer vínculo) + 1
  componente de seleção + a regra de status já aprovada (seção 3) — sem
  jobs em background, sem novas tabelas.
- Resolve imediatamente o caso real da seção 8 (que hoje depende de um
  "vínculo manual" ainda não implementado).
- Fase 8B pode ser adicionada depois, de forma aditiva, sem retrabalho —
  o motor de sugestões apenas alimentaria o mesmo seletor/ação já existente
  com uma opção pré-selecionada.

---

Nenhum código, schema ou dado foi alterado nesta etapa. Após aprovação
deste desenho, o próximo passo é a análise de impacto específica da
implementação da **Fase 8A** (arquivos afetados, migração se necessária,
plano de testes), antes de qualquer alteração de código.
