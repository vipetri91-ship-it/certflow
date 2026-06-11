# Changelog

Registro de alterações no CertFlow, conforme Regra 5 da
[Governança do ERP V&G](./GOVERNANCA.md).

---

## 11/06/2026

### chore: remoção do endpoint temporário de diagnóstico de cancelamento
- **Arquivos**: `src/app/api/admin/diagnostico-cancelamento-temp/route.ts`
  (removido), `docs/LIMPEZA_EXECUTADA.md`
- **Motivo**: o endpoint cumpriu seu propósito — validar
  `cancelarSolicitacao()` com o protocolo de teste `1010781571`. O
  cancelamento foi aceito pela Safeweb (`cancelamento.ok: true`) e a
  consulta posterior retornou "Protocolo não encontrado", confirmando que
  o protocolo foi cancelado. Resultado registrado em
  `docs/LIMPEZA_EXECUTADA.md` (seção "Validação do cancelamento —
  protocolo 1010781571").
- **Impacto**: nenhum — endpoint isolado, de uso único, removido por
  completo. Nenhuma tela ou fluxo dependia dele.
- **Risco**: nenhum.
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso.
- **Autor**: Vinicius Petri (via Claude Code)

### feat: endpoint temporário de diagnóstico — validação de cancelarSolicitacao
- **Arquivos**: `src/app/api/admin/diagnostico-cancelamento-temp/route.ts` (novo,
  temporário)
- **Motivo**: validar, em produção, a função `cancelarSolicitacao()` de
  `src/lib/safeweb.ts` (escrita em 27/05/2026, nunca testada), para resolver
  a pendência registrada em `docs/LIMPEZA_EXECUTADA.md` (4 protocolos de
  teste que continuam ativos na Safeweb após a limpeza de 10/06).
- **Escopo**: endpoint `GET`, protegido por `auth()` + `role === 'ADMIN'`,
  aceita **apenas** o protocolo `1010781571` (fixo no código, sem parâmetro).
  Não altera nenhum fluxo existente, não é chamado por nenhuma tela. Não
  expõe tokens, segredos ou variáveis `SAFEWEB_*` na resposta.
- **Impacto**: nenhum em fluxos existentes — endpoint isolado e de uso
  único. Será removido após a validação (ver entrada de remoção neste
  changelog assim que concluída).
- **Risco**: a chamada real de cancelamento na Safeweb é uma ação em
  sistema de terceiro, possivelmente irreversível — só pode ser acionada
  manualmente pelo Vinicius (ADMIN autenticado) acessando a URL.
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso.
- **Autor**: Vinicius Petri (via Claude Code)

## 10/06/2026

### ONDA 1 — verificação pós-deploy e encerramento (commit 6790572)
- **Arquivos**: `docs/AUDITORIA_GERAL_DO_SISTEMA.md`,
  `docs/ROADMAP_CORRECOES.md` (novo)
- **Motivo**: encerrar formalmente a ONDA 1 (3 itens críticos de
  segurança) com verificação pós-deploy do commit `6790572`.
- **Verificações realizadas**:
  - `npx vercel ls certflow` — deploy do commit `6790572` em `Ready`.
  - `GET /api/admin/diagnostico-protocolo` sem autenticação →
    `403` (curl em produção).
  - Busca em todo o código-fonte (`*.ts`, `*.tsx`) confirma **zero**
    referências residuais a `x-diag-key` e `cf-diag-2026-vp-temp` (as
    únicas ocorrências restantes são nos próprios `changelog.md` e
    `AUDITORIA_GERAL_DO_SISTEMA.md`, como registro histórico do que foi
    removido).
- **Impacto**: nenhum no código — apenas documentação/verificação.
  Adicionado bloco "ONDA 1 — Concluída" no topo da auditoria e criado
  `docs/ROADMAP_CORRECOES.md` priorizando os itens restantes (P0-P3).
- **Risco**: nenhum.
- **Autor**: Vinicius Petri (via Claude Code)

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

### Correção crítica — remoção do bypass por chave fixa em /api/admin/diagnostico-protocolo (10/06/2026)
- **Arquivos**: `src/app/api/admin/diagnostico-protocolo/route.ts`,
  `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
- **Motivo**: o endpoint aceitava o cabeçalho `x-diag-key:
  cf-diag-2026-vp-temp` para pular completamente a verificação de login e
  de perfil ADMIN. Quem descobrisse essa chave (hardcoded no
  código-fonte) conseguia ler, sem autenticação, dados de até 30 pedidos
  recentes — incluindo CPF, CNPJ, DDD, celular, data de nascimento e
  endereço completo dos clientes. Item crítico de LGPD identificado na
  `AUDITORIA_GERAL_DO_SISTEMA.md` (seção 3.3 e recomendação 3 da seção
  10). Confirmado que nenhuma tela, script ou job utilizava esse
  endpoint, com ou sem a chave.
- **Solução (alternativa conservadora aprovada)**: removidas as
  referências a `x-diag-key` e `cf-diag-2026-vp-temp`, mantendo apenas a
  checagem `auth()` + `session.user.role === 'ADMIN'` que já existia.
  Endpoint preservado para uso futuro de diagnóstico, agora acessível
  apenas por administradores autenticados.
- **Impacto**: nenhum — não havia chamadas a esse endpoint em nenhum
  ponto do sistema (com ou sem a chave). Para administradores
  autenticados, o comportamento permanece idêntico.
- **Risco**: baixo — remoção de um bypass não utilizado, mantendo a
  validação de autenticação/role já existente.
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso,
  sem erros de TypeScript.
- **Autor**: Vinicius Petri (via Claude Code)

### Correção crítica — autenticação no endpoint /api/cnpj/[cnpj] (10/06/2026)
- **Arquivos**: `src/app/api/cnpj/[cnpj]/route.ts`,
  `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
- **Motivo**: o endpoint estava acessível sem login (todas as rotas
  `/api/*` são isentas da checagem de autenticação em `src/proxy.ts`) e,
  além de dados públicos da Receita Federal, também consultava o banco do
  CertFlow e retornava — sem máscara — CPF, data de nascimento, e-mail,
  celular, endereço completo, PIS/NIS e responsável de clientes já
  cadastrados, caso o CNPJ consultado já existisse na base. Item crítico
  de LGPD identificado na `AUDITORIA_GERAL_DO_SISTEMA.md` (seções 3.1, 6.2
  e recomendação 2 da seção 10).
- **Solução**: adicionada a mesma checagem `auth()` já usada em
  `src/app/api/cpf/[cpf]/route.ts` (2 linhas no início do handler),
  retornando `401 Não autorizado` para requisições sem sessão válida.
  Nenhum payload, tela, regra de negócio ou integração foi alterada.
- **Impacto**: nenhum para usuários logados — as 5 telas que usam o
  endpoint (`clientes/novo`, `clientes/[id]/editar`, `parceiros/novo`,
  `sst`, wizard de `pedidos/nova-venda`) fazem `fetch` relativo no
  navegador, que envia o cookie de sessão automaticamente. Acesso direto
  ao endpoint sem login agora retorna `401` em vez dos dados.
- **Risco**: baixo — mesmo padrão já validado em `/api/cpf/[cpf]`.
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso,
  sem erros de TypeScript.
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
