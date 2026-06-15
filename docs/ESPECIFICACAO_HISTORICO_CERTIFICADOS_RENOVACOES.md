# Especificação — Histórico Inteligente de Certificados e Controle de Renovações (Frente D)

> **Status**: `FASE 2 APROVADA — schema aditivo em implementação`
> (15/06/2026, Vinicius). Esta especificação consolida a análise técnica da
> Frente D + o requisito adicional de "Cadastro Manual de Vencimentos"
> (renovações que não nascem de um certificado emitido pela V&G), incluindo
> os campos `origem`, `responsavelId` e `encerradoEm` em `RenovacaoManual`.
>
> Fase 2 = apenas schema aditivo (novos campos/tabelas/enums), sem backfill
> de dados históricos. A migração de dados existentes (seção 6) é a Fase 2b,
> que permanece fora do escopo desta etapa e não foi executada.

---

## 1. Objetivo

Corrigir a modelagem de renovação de certificados para que:

1. A renovação de um certificado seja detectada **automaticamente**, sem
   depender de uma ação manual desconectada da venda real.
2. Os status de `Certificado` representem **decisões operacionais reais**
   (renovado / não renovou / revogado), e não fiquem sobrepostos como hoje
   (`VENCIDO` usado tanto como "passou da data" quanto como "cliente não
   renovou").
3. A ficha do cliente exiba o **histórico encadeado** de certificados
   (cadeia de renovações), em vez de uma lista plana de certificados/pedidos
   desconectados.
4. O **Controle de Vencimentos** passe a acompanhar também vencimentos que
   **não nascem de um certificado emitido pela V&G** — ex.: cliente informa
   que seu certificado (emitido em outro lugar) vence em data X e que
   pretende renovar com a V&G.
5. Quando esse cliente efetivamente comprar, o sistema **converta
   automaticamente** a oportunidade manual em um vínculo com o certificado
   recém-emitido, preservando o histórico comercial.
6. Lançamentos financeiros de **bonificação/cortesia** continuem visíveis
   em relatórios e no histórico do cliente, mas **sem somar na receita**.

---

## 2. Casos que motivaram a revisão

### Caso 1 — "Não Renovou" não aparece corretamente na ficha do cliente

Hoje, marcar um certificado como "Não Renovou" (`PATCH /api/certificados/[id]`
→ `status: 'VENCIDO'`, ver
[certificados/[id]/route.ts](../src/app/api/certificados/[id]/route.ts))
faz o certificado **sair do radar de `/renovacoes`** (que passa a listá-lo
em "Não Renovados"), mas na ficha do cliente
([clientes/[id]/page.tsx](../src/app/(dashboard)/clientes/[id]/page.tsx))
ele continua aparecendo só com o badge **"VENCIDO"** — sem indicar que essa
é uma decisão registrada (com motivo, data, responsável). O status
`VENCIDO` está sobrecarregado: é usado tanto para "passou da data, radar
ainda aberto" quanto para "decisão de que o cliente não vai renovar".

### Caso 2 — Renovação antecipada não aparece na timeline do certificado

Quando um certificado é renovado **antes do vencimento** (cliente antecipa
a compra), gera-se um novo `Pedido` → `Certificado`, mas **não existe
nenhum vínculo** entre o certificado antigo e o novo. Na ficha do cliente
eles aparecem como duas linhas independentes, sem relação de "este
substitui aquele".

### Caso 3 — Vencimento sem venda, sem pedido, sem certificado V&G (novo requisito)

Cliente informa: *"Meu certificado vence em 05/01/2027, emitido em outro
lugar. Ano que vem quero fazer com vocês — me lembre quando estiver
próximo."*

Não existe `Pedido`, `Certificado`, protocolo Safeweb ou `Lancamento` para
esse caso — mas a equipe comercial precisa que esse vencimento apareça no
Controle de Vencimentos para acompanhamento futuro, e que, se o cliente
comprar, a oportunidade seja convertida automaticamente.

---

## 3. Separação conceitual

| Conceito | Representa | Origem | Alimenta |
|---|---|---|---|
| **Certificado** | Certificado efetivamente emitido pela V&G | Pedido emitido (protocolo Safeweb / atendimento) | Histórico do cliente, Controle de Vencimentos, renovações futuras, financeiro, relatórios |
| **RenovacaoManual** *(novo)* | Oportunidade comercial de renovação — vencimento informado pelo cliente, sem venda/pedido/certificado V&G associado (ainda) | Cadastro manual pelo time comercial | Apenas Controle de Vencimentos + histórico comercial do cliente |

O **Controle de Vencimentos** (`/renovacoes`) passa a ser a **união** dessas
duas fontes, normalizadas em uma única visão:

| Cliente | Origem | Vencimento | Status |
|---|---|---|---|
| João | Emitido pela V&G | 15/06/2028 | Ativo |
| Empresa XPTO | Manual | 05/01/2027 | Prospect |
| Maria | Emitido pela V&G | 10/08/2026 | A vencer |

---

## 4. Modelo de dados proposto

### 4.1 `StatusCertificado` (enum)

Status atual: `ATIVO`, `VENCIDO`, `CANCELADO`, `RENOVADO`.

Nova semântica:

| Status | Natureza | Significado |
|---|---|---|
| `ATIVO` | estado aberto | Certificado vigente, sem decisão operacional ainda |
| `VENCIDO` | **derivado / não gravado em novos registros** | `ATIVO` + `dataVencimento < hoje`. Continua existindo como *label* calculado para UI/radar — não é mais uma decisão gravável |
| `RENOVADO` | terminal positivo | Existe um certificado sucessor (`certificadoAnteriorId` de outro registro aponta para este) |
| `NAO_RENOVADO` *(novo)* | terminal negativo | Decisão operacional explícita: cliente não vai renovar. Substitui o uso atual de `VENCIDO` para essa finalidade |
| `REVOGADO` *(novo, substitui `CANCELADO`)* | terminal, independente do vencimento | Certificado revogado/cancelado (erro de emissão, revogação ICP-Brasil etc.) |

`VENCIDO` e `CANCELADO` **permanecem no enum** (compatibilidade com
registros históricos), mas deixam de ser gravados por código novo.

### 4.2 `Certificado` — novos campos

```prisma
model Certificado {
  // ...campos existentes...

  certificadoAnteriorId String?      @unique
  certificadoAnterior   Certificado? @relation("RenovacaoCertificado", fields: [certificadoAnteriorId], references: [id])
  certificadoRenovacao  Certificado? @relation("RenovacaoCertificado")

  motivoNaoRenovacao String?
  naoRenovadoEm      DateTime?
  naoRenovadoPorId   String?
  naoRenovadoPor     Usuario? @relation("CertificadoNaoRenovadoPor", fields: [naoRenovadoPorId], references: [id])

  motivoRevogacao    String?
  revogadoEm         DateTime?
  revogadoPorId      String?
  revogadoPor        Usuario? @relation("CertificadoRevogadoPor", fields: [revogadoPorId], references: [id])

  renovacaoManual    RenovacaoManual? // back-relation da conversão (1:1)
}
```

### 4.3 `RenovacaoManual` (novo model)

```prisma
enum StatusRenovacaoManual {
  PROSPECT    // aberta, aguardando follow-up / aparece no radar
  CONVERTIDA  // cliente comprou — vinculada a um Certificado emitido
  DESCARTADA  // não vai renovar conosco / oportunidade encerrada sem venda
}

enum OrigemRenovacaoManual {
  MANUAL      // cadastrado manualmente pelo time comercial
  IMPORTADO   // criado em lote (ex.: importação de planilha/migração de base externa)
  CERTIFICADO // criado a partir de um Certificado existente (ex.: ao marcar NAO_RENOVADO,
              // o operador opta por manter uma oportunidade de acompanhamento futuro)
}

model RenovacaoManual {
  id              String   @id @default(cuid())

  clienteId       String?           // vínculo opcional — pode não existir Cliente cadastrado ainda
  cliente         Cliente? @relation(fields: [clienteId], references: [id])

  nome            String            // nome do cliente/empresa (cópia, mesmo se não cadastrado)
  cpfCnpj         String?           // chave de matching para conversão automática
  telefone        String?
  email           String?
  tipoPessoa      TipoPessoa?

  modeloDescricao String?           // texto livre, ex. "E-CNPJ A1 (emitido por terceiros)"
  dataVencimento  DateTime
  observacoes     String? @db.Text

  origem          OrigemRenovacaoManual @default(MANUAL)
  status          StatusRenovacaoManual @default(PROSPECT)

  certificadoConvertidoId String?      @unique
  certificadoConvertido   Certificado? @relation(fields: [certificadoConvertidoId], references: [id])
  convertidoEm            DateTime?
  encerradoEm             DateTime?    // data em que a oportunidade saiu de PROSPECT (CONVERTIDA ou DESCARTADA)

  criadoPorId     String?
  criadoPor       Usuario? @relation("RenovacaoManualCriadoPor", fields: [criadoPorId], references: [id])

  responsavelId   String?           // usuário responsável pelo acompanhamento comercial desta oportunidade
  responsavel     Usuario? @relation("RenovacaoManualResponsavel", fields: [responsavelId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([cpfCnpj, status])
  @@index([status])
  @@map("renovacoes_manuais")
}
```

> **Sobre `origem`**: não altera as regras de conversão automática (seção
> 5.2) — independentemente da origem, um registro `PROSPECT` com `cpfCnpj`
> compatível é candidato à conversão. O campo serve para relatórios/filtros
> (ex.: "quantas oportunidades vieram de importação vs. cadastro manual vs.
> geradas a partir de um certificado não renovado").
>
> **Sobre `responsavelId`**: distinto de `criadoPorId` — quem cadastra o
> registro nem sempre é quem fará o acompanhamento comercial. Ambos são
> opcionais; quando `responsavelId` não é informado, a oportunidade fica
> "sem dono" até ser atribuída.
>
> **Sobre `encerradoEm`**: marca o momento em que a oportunidade deixou de
> estar em aberto (`PROSPECT`), seja por conversão (`CONVERTIDA`) ou
> descarte (`DESCARTADA`). Complementa `convertidoEm` (que só existe no caso
> de conversão) com um campo único para "quando essa oportunidade parou de
> valer follow-up", útil para relatórios de tempo médio de
> acompanhamento.
>
> **Sobre os índices**: `@@index([cpfCnpj, status])` é o índice principal —
> cobre a busca de candidatos para conversão automática (seção 5.2), que
> filtra por `cpfCnpj` + `status: 'PROSPECT'`, e também consultas por
> `cpfCnpj` isoladamente (prefixo do índice composto). `@@index([status])`
> cobre a listagem do radar de `/renovacoes`, que filtra apenas por
> `status: 'PROSPECT'` sem `cpfCnpj`.
>
> **Evolução futura — `modeloId`**: nesta fase, `modeloDescricao` é texto
> livre porque a oportunidade pode se referir a um certificado emitido por
> terceiros, sem modelo V&G correspondente. Uma evolução futura poderia
> adicionar um campo opcional `modeloId` (FK para `ModeloCertificado`)
> quando o time comercial já souber qual modelo V&G o cliente pretende
> contratar — permitindo relatórios de previsão de receita por modelo a
> partir do funil de renovações manuais. Fora do escopo desta fase; registrado
> aqui apenas como direção futura.

### 4.4 `Lancamento` — bonificação

```prisma
model Lancamento {
  // ...campos existentes...
  bonificado Boolean @default(false)
}
```

### 4.5 `Usuario` — relações reversas (back-relations)

As relações nomeadas introduzidas em `Certificado` e `RenovacaoManual`
exigem os campos de array correspondentes em `Usuario`:

```prisma
model Usuario {
  // ...campos e relações existentes...

  certificadosNaoRenovadosPor Certificado[]     @relation("CertificadoNaoRenovadoPor")
  certificadosRevogadosPor    Certificado[]     @relation("CertificadoRevogadoPor")
  renovacoesManuaisCriadas    RenovacaoManual[] @relation("RenovacaoManualCriadoPor")
  renovacoesManuaisResponsavel RenovacaoManual[] @relation("RenovacaoManualResponsavel")
}
```

---

## 5. Regras de negócio

### 5.1 Auto-linking de renovação (Certificado → Certificado)

Gatilho: criação automática de `Certificado` ao marcar `Pedido.status =
'EMITIDO'` ([pedidos/[id]/route.ts](../src/app/api/pedidos/[id]/route.ts),
linhas ~78-103) — único ponto hoje onde um certificado nasce
automaticamente.

Critério de match, em transação (`$transaction`):

```
candidatos = Certificado.findMany({
  where: {
    clienteId: <mesmo cliente>,
    modeloId: <mesmo modelo>,
    status: 'ATIVO',
    certificadoRenovacao: null,
  },
  orderBy: { dataVencimento: 'desc' }
})
```

- **0 candidatos** → certificado nasce "raiz" (`certificadoAnteriorId = null`).
- **1 candidato, dentro da janela de tolerância** (ex.: `dataEmissao(novo)`
  entre 60 dias antes e 180 dias depois de `dataVencimento(candidato)`) →
  vínculo automático: `novo.certificadoAnteriorId = candidato.id` +
  `candidato.status = 'RENOVADO'`.
- **1 candidato fora da janela, ou 2+ candidatos** → **não vincula
  automaticamente**. Certificado nasce sem vínculo; UI sinaliza candidatos
  para confirmação manual (reaproveitando o botão "Renovar"/"vincular"
  existente como fallback).

`certificadoAnteriorId` é `@unique` — um certificado antigo só pode ser
sucedido por exatamente um novo, evitando ambiguidade em clientes com
múltiplos certificados do mesmo modelo.

### 5.2 Conversão automática (RenovacaoManual → Certificado)

No mesmo momento do item 5.1 (emissão do certificado), buscar
adicionalmente:

```
RenovacaoManual.findMany({
  where: { status: 'PROSPECT', cpfCnpj: <cpf/cnpj normalizado do cliente> }
})
```

- **1 candidato** → marcar `status: 'CONVERTIDA'`, `certificadoConvertidoId
  = novo.id`, `convertidoEm = now()`.
- **0 ou 2+ candidatos** → não converte automaticamente; fica disponível
  para vínculo manual na tela de Controle de Vencimentos.

A busca por `cpfCnpj` (não por `clienteId`) é proposital: a
`RenovacaoManual` pode ter sido criada antes de o prospect existir como
`Cliente` cadastrado — o CPF/CNPJ é o identificador estável entre os dois
mundos. Reaproveitar a normalização de CPF/CNPJ já existente no projeto
(usada nas correções de race condition do P1.2) para a comparação.

### 5.3 Controle de Vencimentos unificado

`/renovacoes` passa a combinar duas fontes, normalizadas em uma estrutura
comum `{ origem, cliente, dataVencimento, status, ... }`:

- **Origem EMITIDO** (`Certificado`): `ATIVO` / `VENCIDO` (derivado,
  calculado) / `RENOVADO` / `NAO_RENOVADO` / `REVOGADO` — consultas atuais
  praticamente inalteradas, exceto a aba "Não Renovados" que passa a
  filtrar `status: 'NAO_RENOVADO'` em vez de `'VENCIDO'`.
- **Origem MANUAL** (`RenovacaoManual`): apenas registros `status:
  'PROSPECT'` aparecem no radar, com label "Prospect". `CONVERTIDA` e
  `DESCARTADA` saem do radar ativo (mas continuam no histórico do cliente).

### 5.4 Histórico do cliente

Ficha do cliente passa a exibir:

- **Cadeias de certificados**: reconstrução via `certificadoAnteriorId` /
  `certificadoRenovacao`, do mais antigo ao mais recente, com o estado
  final da cadeia em destaque (`ATIVO`, `NAO_RENOVADO` ou `REVOGADO`).
- **Renovações manuais** vinculadas ao cliente (`clienteId` ou `cpfCnpj`
  coincidente): aparecem na timeline como "Cliente informou vencimento
  externo em DD/MM — pretende renovar"; quando `CONVERTIDA`, mostra o link
  para o certificado resultante.

### 5.5 Bonificação financeira

`Lancamento.bonificado = true`:

- Lançamento continua sendo criado normalmente (mesmo vínculo com
  `Pedido`/cliente), aparece no extrato/histórico do cliente e em "contas a
  receber" como item informativo.
- Todos os agregados de receita (`_sum.valor` com `tipo: 'RECEBER'` —
  identificados em `financeiro-tab.tsx`, `contas-a-receber/page.tsx`, KPIs
  do dashboard e `jobs/relatorio-diario`) passam a incluir `bonificado:
  false` no `where`.
- UI: checkbox "Bonificação / cortesia — não soma na receita" no formulário
  de lançamento.

---

## 6. Migração de dados existentes

- `Certificado.status = 'VENCIDO'` (marcado manualmente via "Não Renovou")
  → `NAO_RENOVADO`, com `naoRenovadoEm = updatedAt` (aproximação, não há
  data exata do evento hoje) e `motivoNaoRenovacao` preenchido a partir do
  `HistoricoContato` mais recente daquele certificado, quando existir.
- `Certificado.status = 'CANCELADO'` (se houver registros) → `REVOGADO`,
  com `revogadoEm = updatedAt`.
- Nenhuma migração necessária para `RenovacaoManual` (tabela nova, sem
  dados legados).

---

## 7. Riscos

1. **Falso positivo de vínculo automático** (certificado errado em clientes
   com múltiplos certificados do mesmo modelo) — mitigado pela unicidade de
   `certificadoAnteriorId`, janela de tolerância temporal e fallback manual
   em caso de ambiguidade (seção 5.1).
2. **Falso positivo de conversão** (CPF/CNPJ coincidente mas oportunidade
   errada, ex. cliente com duas renovações manuais abertas) — mitigado pela
   regra "1 candidato → automático, 2+ → manual" (seção 5.2).
3. **Migração de dados**: `naoRenovadoEm`/`revogadoEm` serão aproximações
   (`updatedAt`), não a data real do evento — aceitável como fato histórico,
   mas deve ser documentado como tal para não gerar relatórios incorretos
   sobre "quando" a decisão foi tomada.
4. **Pontos de código que leem `Certificado.status === 'VENCIDO'` ou
   `'CANCELADO'`** precisam de levantamento completo antes da migração (a
   aba "Não Renovados" de `/renovacoes` é o principal já identificado).
5. **Concorrência**: busca de candidato + criação do certificado +
   atualização do antigo + conversão da `RenovacaoManual` devem ocorrer em
   uma única transação Prisma.
6. **Normalização de CPF/CNPJ** para o matching da conversão automática
   deve reaproveitar a lógica já existente no projeto (evitar duplicar
   regra de formatação).

---

## 8. Plano de execução (fases)

1. **Documentação** (este documento) — revisão e aprovação.
2. **Schema aditivo**: novos campos em `Certificado`/`Lancamento`, novo
   model `RenovacaoManual`, novos valores de enum (`NAO_RENOVADO`,
   `REVOGADO`, `StatusRenovacaoManual`) — sem remover valores antigos.
3. **Script de migração de dados** (seção 6).
4. **Auto-linking de renovação** (Certificado → Certificado), com testes
   cobrindo 0/1/N candidatos, dentro/fora da janela, certificado já
   vinculado.
5. **Conversão automática** (RenovacaoManual → Certificado), com testes
   cobrindo 0/1/N candidatos por CPF/CNPJ.
6. **Atualizar `/renovacoes`**: união das duas fontes + aba "Não Renovados"
   usando `NAO_RENOVADO`.
7. **CRUD de RenovacaoManual** (cadastro manual de vencimento pelo
   comercial) + tela/permissões.
8. **Nova UI da ficha do cliente** — histórico encadeado de certificados +
   renovações manuais vinculadas.
9. **Bonificação**: campo + UI + ajuste dos agregados de receita.
10. **Testes + build + validação em produção**, seguindo o ciclo de
    governança das frentes anteriores (documentar → implementar → testar →
    build → changelog → commit → aprovação → push → verificação
    pós-deploy).

Cada fase pode ser commitada/aprovada separadamente.
