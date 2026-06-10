# Changelog

Registro de alterações no CertFlow, conforme Regra 5 da
[Governança do ERP V&G](./GOVERNANCA.md).

---

## 10/06/2026

### dc06582 — fix: remover DDD duplicado do telefone enviado a Safeweb
- **Arquivos**: `src/lib/safeweb.ts` (e arquivos relacionados ao envio de
  telefone do titular)
- **Motivo**: Safeweb rejeitava pedidos com erro "Telefone do titular não é
  válido" porque o DDD estava sendo enviado em duplicidade dentro do número.
- **Impacto**: corrige a geração de protocolo para CPFs cujo telefone tinha
  DDD duplicado. Sem efeito em pedidos já gerados.
- **Risco**: baixo — alteração isolada na formatação do telefone antes do
  envio à Safeweb.
- **Autor**: Vinicius Petri (via Claude Code)

### c0e4ed5 / c3e9803 — fix: vazamento de dados entre consultas de CPF (step Responsável)
- **Arquivos**: `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx`,
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-pf.ts` (novo),
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-pf.test.ts` (novo),
  `package.json` (adiciona vitest)
- **Motivo**: ao consultar um segundo CPF sem cadastro local após consultar
  um CPF com cadastro, os dados do primeiro cliente (e-mail, telefone,
  endereço, PIS/NIS, clienteId) permaneciam preenchidos na tela —
  vazamento de dados entre formulários.
- **Causa raiz**: documentada em
  `docs/auditoria/vazamento-de-dados-entre-formularios.md` e
  `docs/regras-negocio/consulta-cpf.md` /
  `docs/regras-negocio/isolamento-de-formularios.md`.
- **Impacto**: ao consultar um CPF sem cadastro, todos os campos do
  responsável anterior são limpos corretamente; ao consultar um CPF com
  cadastro, os dados dele são preenchidos normalmente.
- **Risco**: médio (fluxo de cadastro/venda) — mitigado com suíte de testes
  automatizados (vitest) cobrindo os dois cenários (com e sem cadastro).
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando.
- **Autor**: Vinicius Petri (via Claude Code)

### 07d67bc — feat: agendamento automático na agenda ao gerar protocolo
- **Arquivos**: `src/app/api/pedidos/nova-venda/route.ts`
- **Motivo**: ao gerar um protocolo com agendamento, o evento não estava
  sendo criado na agenda (Google Calendar) porque o AGR `ana.karolina` (e
  `laryssa`) não existiam no enum aceito por `/api/agenda`.
- **Impacto**: pedidos com AGR `ana.karolina` agora criam evento mapeado
  para a agenda da Ana; pedidos com AGR `laryssa` criam evento do tipo
  "pessoal" (vermelho), já que ela ainda não é AGR oficial. A descrição do
  evento agora inclui o número do protocolo Safeweb. Erros ao criar o
  evento passam a ser logados (antes eram silenciosamente ignorados).
- **Risco**: baixo — bloco isolado, dentro de `try/catch`, não bloqueia a
  criação do pedido em caso de falha na agenda.
- **Autor**: Vinicius Petri (via Claude Code)

### 3c1b22e / 1a2be32 / be6de8b — limpeza dos dados de teste de 10/06
- **Arquivos**: `src/app/api/admin/diagnostico-limpeza/route.ts` (criado e
  depois removido), `docs/LIMPEZA_TESTES_HOJE.md`,
  `docs/LIMPEZA_EXECUTADA.md`, `.gitignore`
- **Motivo**: durante os testes das correções acima, foram criados 7
  clientes, 18 pedidos, 1 certificado e 18 lançamentos de teste em
  produção, incluindo 7 protocolos reais na Safeweb.
- **Impacto**: levantamento completo documentado antes da exclusão; após
  aprovação, removidos 18 lançamentos, 1 certificado, 18 itens de pedido,
  18 pedidos e 7 clientes. Backup salvo localmente (não versionado) em
  `backups/limpeza-2026-06-10-backup.json`. Audit logs mantidos como
  histórico.
- **Pendência**: 4 protocolos Safeweb (`1010781571`, `1010781647`,
  `1010782402`, `1010782465`) gerados nos testes continuam ativos no lado
  da Safeweb — cancelamento via API ainda não implementado (ver
  `docs/LIMPEZA_EXECUTADA.md`).
- **Risco**: médio (exclusão de dados em produção) — mitigado com backup
  prévio e levantamento detalhado aprovado pelo Vinicius antes da execução.
- **Autor**: Vinicius Petri (via Claude Code)

### Correção crítica — remoção do endpoint /api/test-db (10/06/2026)
- **Arquivos**: `src/app/api/test-db/route.ts` (removido),
  `docs/endpoints-removidos.md` (novo),
  `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
- **Motivo**: o endpoint, em caso de erro na consulta ao banco, retornava
  `process.env.DATABASE_URL` completo (usuário/senha/host do Postgres) sem
  exigir autenticação — vazamento crítico de credenciais identificado na
  `AUDITORIA_GERAL_DO_SISTEMA.md` (item 1 das recomendações prioritárias).
  Não havia nenhuma referência a esse endpoint em telas, regras de negócio
  ou integrações.
- **Impacto**: nenhum funcional — endpoint de diagnóstico não usado por
  nenhum fluxo do sistema. Documentado em
  `docs/endpoints-removidos.md` antes da remoção.
- **Risco**: baixo — remoção isolada de arquivo não referenciado.
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso,
  sem erros de TypeScript, sem referências residuais a `test-db`.
- **Autor**: Vinicius Petri (via Claude Code)

### Auditoria Geral do Sistema (10/06/2026)
- **Arquivos**: `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (novo)
- **Motivo**: Regra 9 (auditoria contínua) — mapear funcionalidades,
  documentação faltante, bugs potenciais, código duplicado, riscos de
  regressão e de LGPD, pontos de vazamento de dados entre clientes,
  integrações e arquivos críticos do sistema.
- **Impacto**: nenhum no código (somente leitura/documentação). Identifica
  10 recomendações priorizadas para trabalhos futuros, incluindo 2 itens
  críticos de segurança (endpoint `/api/test-db` vazando `DATABASE_URL` em
  erro e endpoint `/api/cnpj/[cnpj]` sem autenticação expondo CPF de
  sócios).
- **Risco**: nenhum — nenhuma alteração de código realizada.
- **Pendência**: nenhuma das recomendações foi implementada; aguardando
  autorização do Vinicius para priorizar (Regra 2).
- **Autor**: Vinicius Petri (via Claude Code)

### baa268b / 75d5614 — evento de lembrete na agenda
- **Arquivos**: `src/app/api/admin/criar-evento-temp/route.ts` (criado e
  removido após o uso)
- **Motivo**: criar lembrete na agenda do Vinicius (11/06 09:00) para
  retomar o cancelamento de protocolo na Safeweb e a integração com a API
  do Banco Inter.
- **Impacto**: nenhum no sistema — apenas 1 evento criado no Google
  Calendar via Apps Script já existente.
- **Risco**: nenhum.
- **Autor**: Vinicius Petri (via Claude Code)
