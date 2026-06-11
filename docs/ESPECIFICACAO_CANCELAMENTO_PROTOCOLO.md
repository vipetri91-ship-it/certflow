# Especificação — Cancelamento Integrado CertFlow + Safeweb

> **Status**: documento de especificação. Nenhum código, migration, banco
> de dados ou deploy foi alterado para produzir este documento — apenas
> leitura do código existente (`src/lib/safeweb.ts`,
> `src/app/(dashboard)/pedidos/[id]/acoes.tsx`,
> `src/app/api/pedidos/[id]/route.ts`, `prisma/schema.prisma`,
> `src/lib/permissoes-estrutura.ts`) e da validação real feita em
> 11/06/2026 com o protocolo `1010781571` (ver
> `docs/LIMPEZA_EXECUTADA.md`).
>
> Esta é a "Frente B" mencionada em `docs/LIMPEZA_EXECUTADA.md`, ainda
> **não autorizada para implementação**.

---

## 1. Objetivo da funcionalidade

**Problema atual**: quando um pedido é cancelado no CertFlow, isso afeta
apenas o registro local. Se o pedido já tinha um protocolo gerado na
Safeweb, esse protocolo **continua ativo** do lado da Safeweb — gerando
inconsistência entre os dois sistemas.

Exemplo real (que motivou esta especificação):
1. AGR cria o pedido e gera o protocolo na Safeweb.
2. Cliente desiste antes da emissão do certificado.
3. Hoje: o operador clica em "Cancelar" no CertFlow → o pedido vira
   `CANCELADO` localmente, **mas o protocolo segue ativo na Safeweb**,
   ocupando uma solicitação em aberto que nunca será concluída.
4. Foi necessário um processo manual e excepcional (validado em
   11/06/2026) para limpar protocolos de teste — ver
   `docs/LIMPEZA_EXECUTADA.md`.

**Benefício da integração**: ao cancelar um pedido com protocolo gerado,
o sistema cancela automaticamente (ou de forma assistida) o protocolo
correspondente na Safeweb, mantendo os dois sistemas sincronizados,
evitando "lixo" de solicitações abertas e dando rastreabilidade completa
do cancelamento (quem, quando, por quê, com qual resultado da Safeweb).

---

## 2. Fluxo atual

### O que acontece no CertFlow hoje
- Tela `pedidos/[id]`, componente `PedidoAcoes`
  (`src/app/(dashboard)/pedidos/[id]/acoes.tsx`):
  - Botão "Cancelar" aparece para qualquer pedido cujo `status` **não**
    seja `CANCELADO` nem `EMITIDO` (linha 60).
  - Ao clicar, mostra um `confirm()` simples do navegador ("Confirmar
    cancelamento do pedido?").
  - Se confirmado, faz `PATCH /api/pedidos/{id}` com `{ status:
    'CANCELADO' }` e dá `router.refresh()`.
- `PATCH /api/pedidos/[id]` (`src/app/api/pedidos/[id]/route.ts`):
  - Exige apenas `auth()` (qualquer usuário logado — **não** valida
    `role` nem permissão `monitor.cancelar`).
  - Atualiza `status = 'CANCELADO'` no banco.
  - Registra um log em `audit_logs` via `registrarAuditoria()`, com diff
    dos campos alterados (`status (antes)` / `status (depois)`).
  - **Não** mexe em `Lancamento`, `Certificado`, nem em nada relacionado
    à Safeweb.

### O que acontece na Safeweb hoje
- **Nada.** O protocolo gerado (`pedido.safewebProtocolo` /
  `numeroCompra`) permanece exatamente como estava — segue como
  "Solicitação" em aberto na Safeweb, mesmo que o pedido esteja
  `CANCELADO` no CertFlow.

### Limitações existentes
1. `monitor.cancelar` é uma permissão **definida** em
   `permissoes-estrutura.ts`, mas **não é verificada** em nenhum lugar do
   código — qualquer usuário autenticado pode cancelar qualquer pedido
   (exceto os já `CANCELADO`/`EMITIDO`).
2. Não há campo para registrar **motivo do cancelamento**.
3. Não há nenhuma trava contra **cancelamento duplo** (o botão some após
   `router.refresh()`, mas nada impede uma segunda chamada `PATCH` direta
   à API com o mesmo efeito — ela só seria idempotente porque já estaria
   `CANCELADO`).
4. Já existe a função `cancelarSolicitacao(protocolo, idJustificativa)`
   em `src/lib/safeweb.ts` (criada em 27/05/2026), mas **nunca foi
   conectada** a nenhum fluxo de tela. Foi testada manualmente pela
   primeira vez em 11/06/2026 (ver seção 6).
5. Não há nenhum registro financeiro automático associado ao
   cancelamento (estornos, reversão de comissão etc.).

---

## 3. Fluxo proposto

```
Usuário clica em "Cancelar Pedido"
        │
        ▼
Sistema valida permissões
   (auth() + role com `monitor.cancelar` = true)
        │
   ├─ Sem permissão ──────────────► Bloqueia, exibe erro 403
        │
        ▼ Com permissão
Sistema verifica status atual do pedido
        │
   ├─ Status não permite cancelamento (CANCELADO/EMITIDO) ─► Bloqueia
        │
        ▼ Status permite
Sistema solicita motivo do cancelamento
   (campo obrigatório, texto livre + opcionalmente categoria)
        │
   ├─ Motivo não informado ───────► Bloqueia, exibe erro de validação
        │
        ▼ Motivo informado
Sistema verifica se o pedido tem protocolo Safeweb (safewebProtocolo)
        │
   ├─ SEM protocolo ──────────────► Pula direto para "Atualiza CertFlow"
        │
        ▼ COM protocolo
Sistema chama cancelarSolicitacao(protocolo, idJustificativa)
        │
   ├─ Safeweb recusa / erro ───────► Ver seção 7 (tratamento de erros)
        │                              (decide se interrompe ou segue)
        ▼ Safeweb aceita (ok: true)
Sistema atualiza CertFlow:
   - status = CANCELADO
   - motivoCancelamento = <texto>
   - canceladoEm = now()
   - canceladoPorId = usuário atual
   - safewebStatus = "Cancelado" (ou equivalente)
        │
        ▼
Sistema registra auditoria (audit_logs)
   - ação CANCELAR_PEDIDO, dados: motivo, protocolo, resposta Safeweb
        │
        ▼
Sistema atualiza financeiro (se aplicável — ver seção 8)
   - cancela/estorna lançamentos PENDENTES vinculados ao pedido
        │
        ▼
Sistema informa sucesso ao usuário
   (toast/modal: "Pedido cancelado. Protocolo XXXX cancelado na Safeweb.")
```

---

## 4. Permissões

### Quem pode cancelar?

O CertFlow não tem papéis nomeados "AGR" / "SUPERVISOR" no `Role` enum —
os papéis existentes são: `ADMIN`, `GERENTE`, `OPERADOR`, `FINANCEIRO`,
`VISUALIZADOR`. "AGR" é apenas um valor de string no campo `agr` do
pedido (ex.: `ana.karolina`, `arlen`, `vinicius`, `laryssa`), não um
`Role` de autenticação.

Já existe a permissão granular `monitor.cancelar` em
`permissoes-estrutura.ts`, hoje **não enforced**.

**Definição (decisão do Vinicius, 11/06/2026)**: o cancelamento de
protocolo na Safeweb é restrito a **`ADMIN` e `GERENTE`**. AGR e
`OPERADOR` **não têm permissão** de cancelamento — mesmo para pedidos
próprios.

| Role | Pode cancelar? | Observação |
|---|---|---|
| `ADMIN` | ✅ Sempre | Acesso total, inclusive a pedidos de outros usuários |
| `GERENTE` | ✅ Se `monitor.cancelar = true` no perfil | Permissão deve ser habilitada para o perfil de gerência |
| `OPERADOR` (AGR) | ❌ Não | Mesmo para pedidos próprios — qualquer cancelamento (inclusive de pedido recém-criado por ele) deve ser solicitado a um `ADMIN`/`GERENTE` |
| `FINANCEIRO` | ❌ Não | Cancelamento não é uma ação financeira direta — financeiro apenas visualiza o impacto |
| `VISUALIZADOR` | ❌ Não | Perfil somente leitura |

**Recomendação final**: usar `monitor.cancelar` como gate principal
(hoje definido mas não usado), habilitado **apenas** para os perfis
`ADMIN` e `GERENTE`. Para `OPERADOR`, `FINANCEIRO` e `VISUALIZADOR`, a
permissão deve permanecer `false` e o backend deve rejeitar (403)
qualquer chamada de cancelamento desses perfis, independentemente do
valor configurado no perfil — ou seja, a checagem de role
(`ADMIN`/`GERENTE`) é uma trava adicional **fixa no código**, não apenas
uma configuração de permissão.

---

## 5. Regras de negócio

### Em quais status o cancelamento será permitido?
- `GERADO` ✅ — caso mais comum (protocolo gerado, nada emitido ainda).
- `VERIFICADO` ✅ — com aviso adicional ("este pedido já foi verificado,
  confirma o cancelamento?").
- `EMITIDO` ❌ — bloqueado. Um certificado já emitido não pode ser
  "desfeito" por este fluxo; isso seria um processo de **revogação de
  certificado** (`certs.cancelar`, já existe como permissão separada),
  fora do escopo desta especificação.
- `CANCELADO` ❌ — bloqueado (já está cancelado; evita duplo
  cancelamento — ver abaixo).

### Em quais status será bloqueado
`EMITIDO` e `CANCELADO`, conforme acima. A própria UI já esconde o botão
"Cancelar" nesses dois casos (`acoes.tsx` linha 60) — a regra deve ser
**replicada no backend** (`PATCH /api/pedidos/[id]` ou em um novo
endpoint dedicado), pois hoje a API não valida isso e aceita a
transição via chamada direta.

### Como evitar cancelamento duplo
1. **Validação de status no backend**: antes de processar, recarregar o
   pedido do banco e verificar `status !== 'CANCELADO'`. Se já estiver
   cancelado, retornar erro 409 (Conflict) sem chamar a Safeweb de novo.
2. **Idempotência por protocolo**: se o pedido já tiver
   `safewebStatus` indicando cancelamento prévio (campo novo, ver seção
   12), não chamar `cancelarSolicitacao` novamente — apenas retornar o
   estado já registrado.
3. Opcional (reforço de UX): desabilitar o botão "Cancelar" no frontend
   imediatamente ao clicar (`disabled` já existe via `cancelando` state),
   evitando duplo clique.

### Como evitar inconsistências
- A atualização do `Pedido` (status, motivo, datas) e o registro em
  `AuditLog` devem ocorrer dentro da **mesma transação Prisma**
  (`prisma.$transaction`), para garantir que ou tudo é gravado, ou nada.
- A chamada à Safeweb (`cancelarSolicitacao`) é uma chamada de rede
  externa e **não pode** fazer parte de uma transação de banco. A ordem
  recomendada é:
  1. Chamar a Safeweb primeiro (`cancelarSolicitacao`).
  2. Só then gravar o resultado no banco (sucesso ou falha) dentro de
     uma transação.
  - Isso evita o cenário "CertFlow diz cancelado, mas Safeweb não sabe" —
    o pior caso possível seria o oposto (Safeweb cancelado, CertFlow
    ainda não registrou), que é recuperável reexecutando a gravação local
    sem chamar a Safeweb de novo (idempotente, pois ela já retornaria
    "Protocolo não encontrado" / já cancelado).

### O pedido local pode ser cancelado sem cancelar na Safeweb?

**Sim, em dois cenários**:
1. **Pedido sem protocolo** (`safewebProtocolo === null`): nunca houve
   nada a cancelar na Safeweb — cancelamento local é direto.
2. **Safeweb indisponível ou erro** (ver seção 7): a especificação
   recomenda permitir que o ADMIN force o cancelamento local mesmo sem
   confirmação da Safeweb, **mas marcando explicitamente** o pedido com
   um status auxiliar (`safewebCancelamentoPendente = true` ou
   `safewebStatus = "Cancelamento pendente"`), para que isso apareça em
   um relatório de pendências e possa ser reprocessado depois (manual ou
   automaticamente).

---

## 6. Integração Safeweb

### Endpoint utilizado
`POST /Shared/Partner/api/CancelarSolicitacao` (via `cancelarSolicitacao`
em `src/lib/safeweb.ts`, linhas 397-413).

### Payload utilizado
```json
{
  "Protocolo": <número do protocolo>,
  "CnpjAR": "<SAFEWEB_CNPJ_AR>",
  "idJustificativa": 4
}
```

### `idJustificativa` utilizado
`4` — valor padrão já hardcoded na função desde sua criação (27/05/2026).
**Não há documentação local ou pública confirmando o significado exato
desse código** (pesquisa exaustiva feita em 11/06/2026, sem resultado).
O risco residual de usar `idJustificativa = 4` para todos os
cancelamentos foi aceito para o caso de teste, mas para a funcionalidade
em produção recomenda-se:
- Investigar com o suporte da Safeweb a tabela completa de
  `idJustificativa` antes de expor essa escolha ao usuário final.
- Enquanto não houver essa confirmação, manter `4` como padrão único
  (não permitir o usuário escolher), exatamente como já está
  implementado.

### Resultado esperado
`cancelarSolicitacao` retorna `{ ok: boolean, erro?: string }`. Em caso
de sucesso, `consultarProtocolo(protocolo)` deixa de encontrar o
protocolo (`{ ok: false, erro: "Protocolo não encontrado" }`).

### Comportamento já validado (protocolo 1010781571, 11/06/2026)
```json
{"protocolo":"1010781571","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}}
```
- `cancelamento.ok: true` → Safeweb aceitou o cancelamento.
- `consulta` após cancelamento → "Protocolo não encontrado", consistente
  com cancelamento efetivado.
- **Reversibilidade**: do lado do CertFlow, não existe função de
  "reverter cancelamento" — deve ser tratado como **irreversível** na
  prática (ver `docs/LIMPEZA_EXECUTADA.md`).

---

## 7. Tratamento de erros / Casos de erro

| Cenário | Detecção | Comportamento proposto |
|---|---|---|
| **Safeweb fora do ar** | `req()` lança exceção de rede (`fetch` falha) → `cancelarSolicitacao` retorna `{ ok: false, erro: String(err) }` | Não cancela localmente. Exibe erro ao usuário ("Não foi possível contatar a Safeweb, tente novamente"). Opcional: ADMIN pode forçar cancelamento local marcando `safewebCancelamentoPendente = true` (ver seção 5). |
| **Timeout** | Mesmo tratamento de exceção de `req()` (sem timeout explícito configurado hoje — recomenda-se adicionar `AbortSignal.timeout(...)` na implementação) | Igual ao item acima. |
| **Token inválido / expirado** | `getToken()` deveria renovar automaticamente (cache de ~9min); se `req()` retornar `401`, `ok: false` com `data.mensagem` | Tratar como erro genérico de Safeweb — não cancelar localmente, exibir mensagem genérica (não expor detalhes de autenticação ao usuário final). Logar detalhes apenas em log de servidor (sem credenciais). |
| **Protocolo inexistente** (já cancelado/concluído antes) | `cancelamento.ok === false` com mensagem da Safeweb, ou `consultarProtocolo` já retorna "Protocolo não encontrado" antes mesmo de tentar cancelar | Tratar como **sucesso operacional**: se o protocolo já não existe na Safeweb, o objetivo (não ter mais um protocolo ativo) já está atingido — prosseguir com o cancelamento local, registrando a observação "protocolo já não encontrado na Safeweb". |
| **Cancelamento recusado** (`ok: false` com motivo de negócio, ex.: "não pode cancelar protocolo já em produção/emitido") | `cancelamento.ok === false`, `erro` com mensagem da Safeweb | **Não** cancela localmente o vínculo com a Safeweb — exibe a mensagem de erro da Safeweb ao usuário, pedido permanece no status atual. ADMIN pode decidir cancelar apenas localmente como exceção (ação manual e documentada, fora do fluxo padrão). |
| **Erro inesperado** (exceção não tratada, resposta malformada) | `catch` genérico em `cancelarSolicitacao` → `{ ok: false, erro: String(err) }` | Não cancela nada. Loga erro completo no servidor (sem dados sensíveis). Exibe mensagem genérica ao usuário e orienta contatar o suporte interno. |

**Princípio geral**: nunca marcar o pedido como `CANCELADO` no CertFlow
se a Safeweb recusou ativamente o cancelamento (resposta `ok: false` com
motivo de negócio) — isso criaria a mesma inconsistência que a
funcionalidade pretende resolver, só que invertida.

---

## 8. Impacto financeiro

> **Atualização (11/06/2026)**: foi definida como regra oficial que o
> `Lancamento` financeiro (`tipo: 'RECEBER'`) **nasce no momento em que o
> pedido é marcado como `EMITIDO`** (certificado emitido), e não mais no
> momento em que o pedido é criado/protocolo gerado (`GERADO`). Ver
> [docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md](./ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md)
> para a especificação completa dessa mudança (separada desta, mas com
> impacto direto aqui).

### Contas a receber
- Como o cancelamento só é permitido em `GERADO`/`VERIFICADO` (nunca em
  `EMITIDO`) e, sob a nova regra, o `Lancamento` só passa a existir **a
  partir de `EMITIDO`**, **na imensa maioria dos cancelamentos não
  existirá nenhum `Lancamento` vinculado ao pedido** — a etapa "atualizar
  lançamentos pendentes" deixa de ser o caso comum.
- Mesmo assim, o endpoint de cancelamento deve manter (de forma
  defensiva, idempotente) a regra: **se** existir algum `Lancamento` do
  tipo `RECEBER` com `status = PENDENTE` vinculado ao pedido (ex.: caso
  excepcional de lançamento criado manualmente pela tela Financeiro para
  registrar um pagamento antecipado — ver seção 8.3 de
  `ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md`), ele deve ser movido para
  `status = CANCELADO`.
- Lançamentos já `PAGO` **não** devem ser alterados automaticamente —
  isso indicaria que o cliente já pagou, e qualquer estorno é uma decisão
  financeira manual (fora do escopo automático). O sistema deve apenas
  **sinalizar** ("⚠️ este pedido tem pagamento já registrado — avalie
  estorno manualmente").

### Comissão de AGR / Comissões futuras
- O modelo `Comissao` está vinculado a `Parceiro` + `ModeloCertificado`
  (percentuais/valores fixos), não diretamente a um `Pedido` individual
  como lançamento gerado automaticamente — não há, hoje, uma tabela de
  "comissão gerada por pedido" identificada no schema. Se existir
  cálculo de comissão derivado de pedidos `EMITIDO` em relatórios, um
  pedido cancelado **antes** de `EMITIDO` simplesmente nunca entra nesse
  cálculo (nenhuma ação adicional necessária).
- Recomendação: confirmar com o financeiro se há algum lançamento de
  comissão criado no momento do `GERADO`/`VERIFICADO` (não identificado
  no código lido) antes de assumir que nenhuma reversão é necessária.

### Indicadores financeiros
- Pedidos `CANCELADO` devem continuar existindo no banco (não são
  excluídos), mas devem ser **excluídos** dos indicadores de
  faturamento/realizado nos relatórios (`/relatorios`,
  `/orcamento`) — verificar se os relatórios já filtram por `status !=
  CANCELADO`; se não, isso é um ajuste necessário e relacionado.

---

## 9. Impacto no histórico do pedido

Após o cancelamento, devem ficar registrados (no próprio `Pedido` e/ou em
`AuditLog`):

- **Data e hora** do cancelamento (`canceladoEm: DateTime`).
- **Usuário** que cancelou (`canceladoPorId: String`, FK para
  `Usuario`).
- **Motivo** informado (`motivoCancelamento: String`).
- **Protocolo Safeweb** envolvido (já existe em
  `pedido.safewebProtocolo`).
- **Resultado da chamada à Safeweb**: sucesso, recusado, protocolo já
  inexistente, ou "não aplicável" (pedido sem protocolo) —
  (`safewebCancelamentoResultado: String`, ou armazenado como `Json` com
  a resposta completa).

A tela `pedidos/[id]` deve exibir esse histórico de forma visível (ex.:
um bloco "Cancelamento" mostrando data, usuário, motivo e resultado da
Safeweb), análogo ao que já existe para `verificadoEm` / `emitidoEm`.

---

## 10. Auditoria

Reaproveitar `registrarAuditoria()` (`src/lib/audit.ts`), já usado em
`PATCH /api/pedidos/[id]`. Para o cancelamento, registrar uma entrada
específica:

```ts
await registrarAuditoria({
  usuarioId: session.user.id,
  acao: 'CANCELAR_PEDIDO',
  entidade: 'Pedido',
  entidadeId: pedido.id,
  dados: {
    numero: pedido.numero,
    motivo: motivoCancelamento,
    protocoloSafeweb: pedido.safewebProtocolo,
    resultadoSafeweb: { ok: ..., erro: ... },  // sem segredos
    statusAnterior: pedido.status,
  },
  ip: req.headers.get('x-forwarded-for') ?? undefined,
})
```

**Logs obrigatórios** (cobertos pelo `AuditLog` acima, sem necessidade de
um sistema de log separado):
- Quem cancelou (`usuarioId`).
- Quando (`createdAt` do `AuditLog`, mais `canceladoEm` no `Pedido`).
- Qual protocolo (`protocoloSafeweb` no campo `dados`).
- Qual pedido (`entidadeId`).
- Resposta da Safeweb (`resultadoSafeweb` no campo `dados`, **sem**
  tokens/segredos — apenas `{ ok, erro }`).

---

## 11. Dashboard gerencial — indicadores propostos

Sugestões para uma futura tela/seção de relatórios (não faz parte da
implementação inicial, mas deve ser viabilizada pelos novos campos da
seção 12):

- **Quantidade de cancelamentos** por período (dia/semana/mês).
- **Cancelamentos por AGR** (`pedido.agr` ou `usuarioId` de quem criou o
  pedido vs. quem cancelou).
- **Cancelamentos por motivo** (requer categorizar `motivoCancelamento`
  — ver observação abaixo).
- **Cancelamentos por produto** (via `ItemPedido.modeloId` →
  `ModeloCertificado`).
- **Taxa de desistência**: `cancelados / total de pedidos criados` no
  período, possivelmente segmentado por AGR ou produto.

**Observação sobre motivo**: para viabilizar "cancelamentos por motivo"
de forma analisável, recomenda-se que o campo de motivo combine:
- Uma **categoria fixa** (select): ex. `DESISTENCIA_CLIENTE`,
  `ERRO_CADASTRO`, `DUPLICIDADE`, `PROBLEMA_PAGAMENTO`, `OUTRO`.
- Um campo de **texto livre opcional** para detalhamento.

Isso evita que "Cancelamentos por motivo" vire um amontoado de textos
livres impossíveis de agrupar.

---

## 12. Estrutura técnica (sem implementar)

### Arquivos afetados
- `src/app/(dashboard)/pedidos/[id]/acoes.tsx` — adicionar modal de
  confirmação com campo de motivo (categoria + texto livre), substituir
  `confirm()` simples.
- `src/app/api/pedidos/[id]/route.ts` (ou um novo endpoint dedicado, ex.
  `src/app/api/pedidos/[id]/cancelar/route.ts`) — implementar a lógica
  completa: validação de permissão/status, chamada à Safeweb, transação
  de gravação, auditoria, e (de forma defensiva/idempotente, ver seção 8)
  atualização de eventuais lançamentos `PENDENTE` vinculados.
- `src/lib/safeweb.ts` — **nenhuma alteração necessária**;
  `cancelarSolicitacao` e `consultarProtocolo` já existem e foram
  validadas. Arquivo permanece IMUTÁVEL/sagrado conforme já estabelecido.
- `src/lib/permissoes-estrutura.ts` — nenhuma alteração estrutural
  necessária (`monitor.cancelar` já existe); apenas passar a **usar**
  essa permissão nos pontos de verificação.
- `prisma/schema.prisma` — novos campos no modelo `Pedido` (ver abaixo).

### Componentes afetados
- `PedidoAcoes` (botão "Cancelar" + novo modal de confirmação/motivo).
- Tela `pedidos/[id]/page.tsx` — exibir bloco de histórico de
  cancelamento (seção 9).
- Possivelmente `pedidos/monitoramento` — refletir status cancelado e
  resultado Safeweb na listagem.

### APIs afetadas
- `PATCH /api/pedidos/[id]` — passa a rejeitar `status: 'CANCELADO'`
  diretamente (ou mantém compatibilidade, mas delega para a nova lógica).
- Novo endpoint dedicado (recomendado): `POST
  /api/pedidos/[id]/cancelar`, recebendo `{ motivoCategoria, motivoTexto
  }`, fazendo todo o fluxo da seção 3. Separar do `PATCH` genérico deixa
  a auditoria, validações e chamada à Safeweb mais explícitas e testáveis
  isoladamente.

### Tabelas / campos possivelmente impactados

Novos campos em `Pedido` (modelo `prisma/schema.prisma`):

```prisma
model Pedido {
  // ... campos existentes ...
  motivoCancelamentoCategoria String?   // enum sugerido: DESISTENCIA_CLIENTE | ERRO_CADASTRO | DUPLICIDADE | PROBLEMA_PAGAMENTO | OUTRO
  motivoCancelamentoTexto     String?
  canceladoEm                 DateTime?
  canceladoPorId              String?
  safewebCancelamentoResultado Json?    // { ok, erro? } da resposta da Safeweb
  safewebCancelamentoPendente  Boolean  @default(false) // true se cancelamento local ocorreu sem confirmação da Safeweb

  canceladoPor Usuario? @relation("PedidosCancelados", fields: [canceladoPorId], references: [id])
}
```

- `Lancamento` — sem novos campos; apenas atualização de `status` para
  `CANCELADO` em registros `PENDENTE` vinculados ao pedido (regra da
  seção 8).
- `AuditLog` — sem alteração de schema; novo valor de `acao =
  'CANCELAR_PEDIDO'`.

---

## 13. Estratégia de testes

### Testes automatizados (vitest, seguindo o padrão já usado em
`merge-dados-pf.test.ts`)
- Função pura de **validação de regras**: dado `(status atual, role,
  usuarioId do pedido, usuarioId da sessão)`, retorna se o cancelamento é
  permitido. Cobrir:
  - `GERADO` + `ADMIN` → permitido.
  - `GERADO` + `OPERADOR` dono do pedido → permitido.
  - `GERADO` + `OPERADOR` não-dono → bloqueado.
  - `VERIFICADO` + `OPERADOR` → bloqueado (ou permitido conforme decisão
    final da seção 4 — testar a regra escolhida).
  - `EMITIDO` / `CANCELADO` → sempre bloqueado.
- Função de **mapeamento do resultado da Safeweb** para o resultado
  local (ex.: `ok:true` → cancela; `ok:false, erro:"Protocolo não
  encontrado"` → trata como sucesso operacional; `ok:false` com outro
  erro → bloqueia).

### Testes manuais (antes de qualquer deploy em produção)
1. Cancelar pedido **sem** protocolo Safeweb (`safewebProtocolo: null`)
   → deve cancelar localmente sem chamar a Safeweb.
2. Cancelar pedido **com** protocolo válido em homologação Safeweb
   (`SAFEWEB_HOMOLOGACAO=true`) → validar payload, resposta, e gravação
   local.
3. Tentar cancelar o **mesmo pedido duas vezes** → segunda tentativa deve
   ser bloqueada (409) sem nova chamada à Safeweb.
4. Tentar cancelar pedido `EMITIDO` → bloqueado na UI e na API.
5. Simular Safeweb indisponível (ex.: apontar `SAFEWEB_BASE_URL` para
   endereço inválido em ambiente de teste) → validar mensagem de erro e
   que o pedido **não** é marcado como `CANCELADO`.
6. Validar permissões: usuário com role `OPERADOR`, `FINANCEIRO` ou
   `VISUALIZADOR` não vê o botão "Cancelar" e recebe 403 se chamar a API
   diretamente — inclusive para pedidos criados pelo próprio usuário
   (`OPERADOR` não pode cancelar nem o próprio pedido). Apenas `ADMIN` e
   `GERENTE` (com `monitor.cancelar = true`) conseguem cancelar.
7. Validar que lançamento `PENDENTE` vinculado é marcado `CANCELADO`, e
   que lançamento `PAGO` **não** é alterado automaticamente.

### Casos de sucesso
- Pedido `GERADO` com protocolo, Safeweb aceita → pedido `CANCELADO`,
  protocolo cancelado, lançamento pendente cancelado, auditoria completa.
- Pedido `GERADO` sem protocolo → pedido `CANCELADO` direto, sem chamada
  externa.

### Casos de erro
- Safeweb recusa (`ok:false`, motivo de negócio) → pedido permanece no
  status anterior, erro exibido.
- Safeweb fora do ar → pedido permanece no status anterior (ou marcado
  `safewebCancelamentoPendente`, se essa opção for adotada), erro
  exibido, log registrado.
- Protocolo já não existe na Safeweb → tratado como sucesso operacional
  (cancelamento local prossegue).

---

## 14. Avaliação final

### Complexidade
**Média.** Os blocos de maior risco já existem e foram validados
isoladamente (`cancelarSolicitacao`/`consultarProtocolo` testados em
produção em 11/06/2026; `registrarAuditoria` e o padrão de transação
Prisma já são usados em outros fluxos). O trabalho novo é,
essencialmente:
- 1 migration (novos campos em `Pedido`).
- 1 endpoint novo (ou refatoração do `PATCH` existente).
- 1 modal de confirmação com motivo na UI.
- Lógica de regras de status/permissão + atualização de lançamentos.

### Riscos
- **Chamada real e possivelmente irreversível à Safeweb** — qualquer bug
  que cancele o protocolo errado (ou cancele quando não deveria) não tem
  "desfazer" conhecido. Mitigação: testes extensivos em homologação
  (`SAFEWEB_HOMOLOGACAO=true`) antes de produção, e uma fase de rollout
  controlado (ex.: começar liberando apenas para `ADMIN`).
- **`idJustificativa = 4` sem documentação confirmada** — risco aceito
  para uso pontual (já validado), mas para uso recorrente em produção
  vale insistir com o suporte Safeweb por uma tabela oficial.
- **`monitor.cancelar` nunca foi enforced** — habilitar a verificação
  pode "quebrar" o fluxo de cancelamento para usuários que hoje cancelam
  pedidos sem ter essa permissão marcada explicitamente. Levantamento
  prévio dos perfis de usuário existentes é necessário antes do rollout.
- **Impacto financeiro automático** (cancelar lançamentos `PENDENTE`) —
  com a regra "lançamento nasce na emissão" (ver
  `ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md`), esse caso passa a ser raro
  (só ocorre se houver lançamento manual antecipado). Mantido como
  tratamento defensivo/idempotente, sem impacto relevante esperado nos
  relatórios sob a nova regra.

### Benefícios
- Elimina a necessidade de processos manuais excepcionais (como o
  realizado em 11/06/2026) para limpar protocolos órfãos na Safeweb.
- Histórico completo e auditável de cancelamentos.
- Indicadores gerenciais de desistência (seção 11).
- Consistência financeira (lançamentos pendentes não ficam "esquecidos"
  em pedidos cancelados).

### Ordem recomendada de execução
1. **Migration**: novos campos em `Pedido` (sem lógica ainda) — baixo
   risco, reversível.
2. **Endpoint dedicado** `POST /api/pedidos/[id]/cancelar` com toda a
   lógica de regras + Safeweb + auditoria + financeiro, testado
   exaustivamente em **homologação Safeweb**.
3. **Enforcement de `monitor.cancelar`** no novo endpoint (e
   levantamento/ajuste dos perfis existentes antes de ativar em
   produção).
4. **UI**: modal de motivo + bloco de histórico de cancelamento na tela
   do pedido.
5. **Dashboard gerencial** (seção 11) — última etapa, depende de volume
   de dados acumulado com os novos campos.

### Estimativa de esforço (ordem de grandeza, não compromisso)
- Etapas 1–3 (backend + regras + Safeweb + financeiro + testes): maior
  parte do esforço.
- Etapa 4 (UI): esforço menor, mas depende de definição de UX para o
  modal de motivo.
- Etapa 5 (dashboard): esforço variável, tratar como item separado /
  futuro.

---

## Resumo executivo

- **Escopo**: cancelamento de pedido no CertFlow passa a cancelar também
  o protocolo correspondente na Safeweb (quando existir), com motivo
  obrigatório, controle de permissão (`monitor.cancelar`, hoje definido
  mas não usado), histórico completo, auditoria e atualização automática
  de lançamentos financeiros pendentes.
- **Complexidade**: média — peças críticas (`cancelarSolicitacao`,
  `consultarProtocolo`, `registrarAuditoria`) já existem e foram
  validadas; trabalho novo é majoritariamente integração e regras.
- **Riscos**: ação na Safeweb é real e praticamente irreversível;
  `idJustificativa=4` sem documentação oficial; ativar
  `monitor.cancelar` pode mudar quem consegue cancelar hoje; mudanças
  financeiras automáticas exigem validação do time financeiro.
- **Recomendação final**: aprovar como próxima "onda" de trabalho, mas
  **faseada** — começar pela migration (campos novos, sem lógica),
  depois o endpoint com testes em homologação Safeweb, só então habilitar
  `monitor.cancelar` e a UI.
- **Estimativa de esforço**: médio porte — maior parte concentrada no
  endpoint/regras de negócio e nos testes contra a Safeweb; UI e
  dashboard são incrementos menores e podem ser entregues
  separadamente.
