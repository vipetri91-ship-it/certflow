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
- `1010781647` (era do pedido PED-202606-28769) — pendente
- `1010782402` (era do pedido PED-202606-69746) — pendente
- `1010782465` (era do pedido PED-202606-68833) — pendente

**Próxima tarefa**: repetir o mesmo procedimento de cancelamento (via
`cancelarSolicitacao` em `src/lib/safeweb.ts`) para os 3 protocolos
restantes, item a item, com aprovação prévia para cada um.

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

## Infraestrutura temporária removida

O endpoint `/api/admin/diagnostico-limpeza` (GET de diagnóstico + POST de
exclusão), criado especificamente para este levantamento e limpeza, foi
removido do código após a conclusão.

O endpoint `/api/admin/diagnostico-cancelamento-temp`, criado em 11/06/2026
para validar `cancelarSolicitacao` com o protocolo `1010781571`, também foi
removido após a validação (commit `7ef6bf9`). Confirmado em produção: a
URL retorna `404` e não há mais nenhuma referência ao endpoint no código
(`src/`).

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
