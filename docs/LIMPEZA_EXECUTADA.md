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

4 protocolos gerados durante os testes de hoje **continuam existindo no
lado da Safeweb**, pois excluir o registro local não cancela nada lá:

- `1010781571` (era do pedido PED-202606-15449)
- `1010781647` (era do pedido PED-202606-28769)
- `1010782402` (era do pedido PED-202606-69746)
- `1010782465` (era do pedido PED-202606-68833)

Esses protocolos seguem ativos na Safeweb mesmo após a exclusão local.
**Próxima tarefa**: implementar o cancelamento via API na Safeweb (já existe
a função `cancelarSolicitacao` em `src/lib/safeweb.ts`, falta conectá-la ao
fluxo de "Cancelar pedido" do CertFlow) e usá-la para cancelar esses 4
protocolos remanescentes.

## Infraestrutura temporária removida

O endpoint `/api/admin/diagnostico-limpeza` (GET de diagnóstico + POST de
exclusão), criado especificamente para este levantamento e limpeza, foi
removido do código após a conclusão.
