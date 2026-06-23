# Limpeza de dados de teste — Execução (10/06/2026)

Execução realizada em 10/06/2026, com base no levantamento de
[`docs/LIMPEZA_TESTES_HOJE.md`](./LIMPEZA_TESTES_HOJE.md).

**Critério**: todos os registros com `createdAt >= 2026-06-10T03:00:00.000Z`
(00:00 em America/Sao_Paulo) nas tabelas `lancamentos`, `certificados`,
`itens_pedido`, `pedidos` e `clientes`.

## Backup

Antes da exclusão, foi feito um dump completo dos registros afetados em
`backups/limpeza-2026-06-10-backup.json` (arquivo local, **não versionado no
git** por conter CPF/CNPJ — adicionado ao `.gitignore`). Os números do backup
batem exatamente com o relatório de levantamento.

## Registros removidos por tabela

| Tabela | Quantidade removida |
|---|---|
| `lancamentos` | 18 |
| `certificados` | 1 |
| `itens_pedido` | 18 (cascade automático ao excluir os pedidos) |
| `pedidos` | 18 |
| `clientes` | 7 |

**Não removidos (mantidos de propósito):**
- `audit_logs` de hoje (34 registros) — mantidos como histórico, não têm
  vínculo (FK) com as tabelas acima, então não bloqueiam nem são afetados.
- Usuários (Ana Karolina, Arlen Junior, Laryssa, Vinicius Petri) — contas
  reais de produção.
- Clientes pré-existentes referenciados por pedidos de teste (VASP Serviços
  e Negócios, Vinicius Antonio Silveira Petri, Laryssa Schiave Bueno de
  Oliveira) — só os pedidos/lançamentos de hoje vinculados a eles foram
  removidos; os cadastros desses clientes continuam intactos.

## Verificação pós-exclusão

Nova consulta ao mesmo critério (`createdAt >= 2026-06-10T03:00:00.000Z`)
retornou `0` para clientes, pedidos, itens de pedido, certificados e
lançamentos — confirmando que a limpeza foi completa.

## ⚠️ Pendência: protocolos Safeweb

4 protocolos gerados durante os testes de hoje **continuavam existindo no
lado da Safeweb**, pois excluir o registro local não cancela nada lá:

- `1010781571` (era do pedido PED-202606-15449) — ✅ **cancelado em
  11/06/2026**, ver seção "Validação do cancelamento" abaixo.
- `1010781647` (era do pedido PED-202606-28769) — ✅ **cancelado em
  11/06/2026**, ver seção "Cancelamento dos 3 protocolos restantes"
  abaixo.
- `1010782402` (era do pedido PED-202606-69746) — ✅ **cancelado em
  11/06/2026**, ver seção "Cancelamento dos 3 protocolos restantes"
  abaixo.
- `1010782465` (era do pedido PED-202606-68833) — ✅ **cancelado em
  11/06/2026**, ver seção "Cancelamento dos 3 protocolos restantes"
  abaixo.

**Status**: pendência encerrada — os 4 protocolos de teste gerados em
10/06/2026 foram cancelados na Safeweb.

## Validação do cancelamento — protocolo 1010781571 (11/06/2026)

Teste controlado realizado via endpoint administrativo temporário
`/api/admin/diagnostico-cancelamento-temp` (restrito a ADMIN autenticado,
removido logo após esta validação — ver `docs/changelog.md`).

**Requisição enviada** (sem segredos): `POST
/Shared/Partner/api/CancelarSolicitacao` com `Protocolo: 1010781571`,
`CnpjAR: <SAFEWEB_CNPJ_AR>`, `idJustificativa: 4`.

**Resposta da Safeweb**:
```json
{"protocolo":"1010781571","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}}
```

- **Cancelamento**: aceito pela Safeweb (`ok: true`).
- **Consulta posterior** (`GET /api/solicitacao/1010781571`): retornou
  "Protocolo não encontrado" — coerente com um protocolo cancelado, que
  deixa de existir para consulta normal.
- **Status final**: protocolo `1010781571` cancelado e não mais
  consultável na Safeweb.
- **Reversibilidade**: não foi possível confirmar com certeza se a
  operação é reversível do lado da Safeweb (não há documentação local
  sobre isso, e o protocolo deixou de ser consultável, o que dificulta
  qualquer verificação posterior). Para fins práticos, deve ser tratada
  como **irreversível** — se a Safeweb mantiver algum registro interno
  de protocolos cancelados, a reativação dependeria do suporte deles.
- **Observação sobre `idJustificativa = 4`**: usado conforme o valor
  padrão já hardcoded em `cancelarSolicitacao` (sem documentação
  encontrada sobre o significado exato — ver análise em conversa de
  11/06/2026). O cancelamento foi aceito mesmo assim.

## Cancelamento dos 3 protocolos restantes (11/06/2026)

Procedimento idêntico ao validado para o protocolo `1010781571`,
executado via endpoint administrativo temporário
`/api/admin/diagnostico-cancelamento-temp` (restrito a ADMIN autenticado,
lista fixa dos 3 protocolos, removido logo após — ver
`docs/changelog.md`).

**Resposta da Safeweb**:
```json
{"resultados":[
  {"protocolo":"1010781647","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}},
  {"protocolo":"1010782402","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}},
  {"protocolo":"1010782465","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}}
]}
```

| Protocolo | Cancelamento | Consulta posterior | Status final |
|---|---|---|---|
| `1010781647` | ✅ aceito (`ok: true`) | "Protocolo não encontrado" | Cancelado, não mais consultável |
| `1010782402` | ✅ aceito (`ok: true`) | "Protocolo não encontrado" | Cancelado, não mais consultável |
| `1010782465` | ✅ aceito (`ok: true`) | "Protocolo não encontrado" | Cancelado, não mais consultável |

Reversibilidade e observações sobre `idJustificativa = 4`: idênticas ao
registrado para o protocolo `1010781571` (ver seção "Validação do
cancelamento" acima) — tratar como irreversível na prática.

## Infraestrutura temporária removida

O endpoint `/api/admin/diagnostico-limpeza` (GET de diagnóstico + POST de
exclusão), criado especificamente para este levantamento e limpeza, foi
removido do código após a conclusão.

O endpoint `/api/admin/diagnostico-cancelamento-temp`, criado em 11/06/2026
para validar `cancelarSolicitacao` com o protocolo `1010781571`, também foi
removido após a validação (commit `7ef6bf9`). Confirmado em produção: a
URL retorna `404` e não há mais nenhuma referência ao endpoint no código
(`src/`).

O endpoint foi recriado em seguida (commit `88a44be`), restrito aos 3
protocolos restantes (`1010781647`, `1010782402`, `1010782465`), usado
uma única vez para cancelá-los, e removido novamente após a confirmação
dos resultados (ver seção "Cancelamento dos 3 protocolos restantes").

## Arquivo residual removido — diag3.json (11/06/2026)

- **Nome do arquivo**: `diag3.json` (raiz do projeto, 12.188 bytes,
  criado em 10/06/2026 às 16:42).
- **Motivo da remoção**: arquivo órfão, gerado durante o levantamento que
  antecedeu a limpeza de 10/06/2026 (provável saída salva de uma consulta
  ao endpoint `/api/admin/diagnostico-limpeza`, já removido). Não estava
  protegido em `/backups/` (que é gitignored), ficando solto na raiz do
  repositório.
- **Dados pessoais**: **sim** — continha CPF, CNPJ, nome, telefone, data
  de nascimento e endereço completo dos clientes dos 18 pedidos de teste
  de 10/06/2026. Esses dados já estavam cobertos pelo backup oficial em
  `backups/limpeza-2026-06-10-backup.json` (protegido, não versionado).
- **Dependências**: nenhuma. Não havia referência a `diag3.json` em
  código, scripts ou documentação. Arquivo nunca foi versionado pelo git
  (`??` no `git status`).
- **Ação**: arquivo removido do disco.

## Status final — protocolo 1010781571

✅ **Encerrado em 11/06/2026**: cancelado na Safeweb com sucesso
(`cancelamento.ok: true`), não mais consultável (`"Protocolo não
encontrado"`), e o endpoint temporário usado na validação foi removido e
confirmado fora do ar (404 em produção).

## Status final — pendência de protocolos Safeweb

✅ **Pendência encerrada em 11/06/2026**: os 4 protocolos de teste
gerados em 10/06/2026 (`1010781571`, `1010781647`, `1010782402`,
`1010782465`) foram cancelados com sucesso na Safeweb
(`cancelamento.ok: true` em todos), nenhum é mais consultável
(`"Protocolo não encontrado"`), e o endpoint administrativo temporário
usado nas validações foi removido em definitivo (sem nenhuma rota
residual em `src/`).

## Cancelamento de 3 protocolos antigos remanescentes (15/06/2026)

Em 15/06/2026, Vinicius reportou e-mails diários da Safeweb cobrando
envio de documentos para 3 protocolos de teste **mais antigos** (anteriores
à limpeza de 10/06, sem pedido correspondente no CertFlow):
`1010749376`, `1010766479`, `1010749841`. O protocolo `1010766479` era
usado como exemplo em `docs/INTEGRACOES.md`/`docs/protocolo.md`.

Procedimento idêntico ao validado em 11/06/2026, executado via endpoint
administrativo temporário `/api/admin/diagnostico-cancelamento-temp`
(restrito a ADMIN autenticado, lista fixa dos 3 protocolos, removido logo
após — ver `docs/changelog.md`).

**Resposta da Safeweb**:
```json
{"resultados":[
  {"protocolo":"1010749376","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}},
  {"protocolo":"1010766479","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}},
  {"protocolo":"1010749841","cancelamento":{"ok":true},"consulta":{"ok":false,"erro":"Protocolo não encontrado"}}
]}
```

| Protocolo | Cancelamento | Consulta posterior | Status final |
|---|---|---|---|
| `1010749376` | ✅ aceito (`ok: true`) | "Protocolo não encontrado" | Cancelado, não mais consultável |
| `1010766479` | ✅ aceito (`ok: true`) | "Protocolo não encontrado" | Cancelado, não mais consultável |
| `1010749841` | ✅ aceito (`ok: true`) | "Protocolo não encontrado" | Cancelado, não mais consultável |

✅ **Pendência encerrada em 15/06/2026**: os 3 protocolos foram cancelados
com sucesso na Safeweb (`cancelamento.ok: true` em todos), nenhum é mais
consultável (`"Protocolo não encontrado"`). Os e-mails diários de cobrança
de documentos para esses protocolos devem parar. O endpoint administrativo
temporário usado nesta validação será removido (ver `docs/changelog.md`).

## Limpeza de lançamentos financeiros — 23/06/2026 (diferente das anteriores)

**Diferença importante em relação às limpezas acima**: desta vez NÃO
eram pedidos de teste "fictícios" sem consequência real — eram 7
lançamentos no Financeiro referentes a pedidos cujo **certificado já foi
emitido e finalizado de fato na Safeweb** (protocolos reais, status
"Finalizado" no painel). A cobrança desses 7 clientes foi feita pelo
**sistema antigo da empresa** (fora do CertFlow), então os lançamentos
apareciam indevidamente como "em aberto" no Contas a Receber.

**Escopo desta limpeza (confirmado explicitamente com o Vinicius antes de
agir)**:
- ❌ **NÃO** cancelar nada na Safeweb — protocolos reais e finalizados,
  intocáveis.
- ❌ **NÃO** apagar `Pedido` nem `Certificado` — são certificados reais
  já emitidos para clientes reais.
- ✅ Apagar **somente** os 7 `Lancamento` (Contas a Receber).

**Pedidos afetados**: `PED-202606-16055`, `PED-202606-34852`,
`PED-202606-99390`, `PED-202606-30377`, `PED-202606-32684`,
`PED-202606-63016`, `PED-202606-60669`.

**Risco identificado e resolvido antes de apagar**: a rotina
`reconciliarEmitidos()` (`src/lib/reconciliar-emitidos.ts`) roda
automaticamente a cada reinício do servidor (todo deploy) e recria um
`Lancamento` para qualquer `Pedido` `EMITIDO` sem lançamento. Sem uma
marca explícita, os 7 lançamentos teriam voltado sozinhos no próximo
deploy. Resolvido adicionando o campo `Pedido.ignorarReconciliacaoFinanceira`
(commit `aa0c3be`) e marcando os 7 pedidos com esse flag `true` antes de
excluir os lançamentos — ver `docs/changelog.md` (23/06/2026).

**Backup**: `backups/limpeza-financeiro-2026-06-23-backup.json` (7
pedidos com seus lançamentos, não versionado — contém CPF/CNPJ).

**Execução**:
1. Backup completo dos 7 pedidos + lançamentos.
2. `UPDATE pedidos SET ignorarReconciliacaoFinanceira = true` nos 7
   pedidos (confirmado: 7 registros afetados).
3. `DELETE` dos 7 `Lancamento` vinculados a esses pedidos.
4. Verificação: `0` lançamentos restantes vinculados a esses números de
   pedido; os 7 pedidos confirmados com o flag `true`.

**Status final**: ✅ concluído. Contas a Receber não mostra mais esses
7 lançamentos, e a reconciliação automática não vai recriá-los. Pedidos,
Certificados e protocolos Safeweb permanecem intactos, como devem ser
(certificados reais emitidos para clientes reais).
