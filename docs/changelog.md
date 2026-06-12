# Changelog

Registro de alterações no CertFlow, conforme Regra 5 da
[Governança do ERP V&G](./GOVERNANCA.md).

---

## 12/06/2026

### fix: vazamento de dados na busca de CNPJ (Novo Cliente, ONDA 2 — item #6)
- **Arquivos**: `src/app/(dashboard)/clientes/novo/page.tsx`,
  `src/app/(dashboard)/clientes/novo/lib/merge-dados-cnpj.ts` (novo),
  `src/app/(dashboard)/clientes/novo/lib/merge-dados-cnpj.test.ts` (novo).
- **Motivo**: conforme `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) e
  `docs/ROADMAP_CORRECOES.md` (P1.1), `buscarCnpj()` mantinha os dados de
  uma empresa pesquisada anteriormente (Razão Social, Nome Fantasia,
  e-mail, telefone e endereço) quando a busca do novo CNPJ falhava (CNPJ
  não encontrado na Receita ou erro de rede/API).
- **Alteração**: novo módulo `lib/merge-dados-cnpj.ts` (com testes), com
  `mergeDadosEmpresaPorCnpj` (mesmo padrão de `mergeDadosEmpresaPorCNPJ`):
  replica exatamente a lógica atual quando o CNPJ é encontrado na Receita
  (mesmos fallbacks `?? f.campo`), e zera os 10 campos de empresa
  (`razaoSocial`, `nomeFantasia`, `email`, `telefone`, `cep`,
  `logradouro`, `numero`, `bairro`, `cidade`, `estado`) quando não é
  encontrado ou ocorre erro.
- **Impacto**: nenhuma mudança de layout ou no caminho de sucesso da
  busca. Único efeito visível: ao falhar a busca de um novo CNPJ, os 10
  campos de empresa voltam a ficar vazios em vez de manter dados da
  empresa pesquisada antes. Item #5 (`buscarCep` em `wizard.tsx`)
  analisado e classificado como sem ação necessária — não há vazamento de
  PII de terceiros, apenas endereço do próprio cliente em edição.
- **Testes**: `npx vitest run` — 28/28 passando (5 novos casos em
  `merge-dados-cnpj.test.ts`). `npx next build` — build limpo.
- **Autor**: Vinicius (via Claude Code).

### fix: vazamento de dados na validação e autopreenchimento de CNPJ (Nova Venda, ONDA 2 — itens #3 e #4)
- **Arquivos**: `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx`,
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-pj.ts` (novo),
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-pj.test.ts` (novo).
- **Motivo**: conforme `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) e
  `docs/ROADMAP_CORRECOES.md` (P1.1), `validarCNPJ()` e
  `autoPreencherPorCNPJ()` mantinham os dados de uma empresa pesquisada
  anteriormente quando a validação/busca do novo CNPJ falhava (CNPJ não
  encontrado, erro da Receita, sócio não corresponde ao CPF informado,
  Safeweb não libera emissão, CNPJ não encontrado na base local ou erro de
  rede).
- **Alteração**: novo módulo `lib/merge-dados-pj.ts` (com testes), com
  `limparDadosValidacaoPJ()` (zera os 18 campos de
  empresa/responsável + `validado` em todo retorno antecipado de erro de
  `validarCNPJ`, junto com `setHistorico([])`) e `mergeDadosEmpresaPorCNPJ`
  (mesmo padrão de `mergeDadosClientePorCPF`: replica exatamente a lógica
  atual quando o CNPJ é encontrado na base local, e zera os 20 campos de
  empresa/responsável quando não é encontrado ou ocorre erro).
- **Impacto**: nenhuma mudança de layout, regra de negócio Safeweb/Receita
  ou no caminho de sucesso de ambas as funções. Único efeito visível: ao
  falhar a validação/busca de um novo CNPJ, os campos de
  empresa/responsável (incluindo Razão Social, Nome Fantasia, endereço,
  responsável, CPF do responsável, data de nascimento, e-mail e telefone)
  voltam a ficar vazios em vez de manter dados da empresa pesquisada antes.
- **Testes**: `npx vitest run` — 24/24 passando (8 novos casos em
  `merge-dados-pj.test.ts`). `npx next build` — build limpo.
- **Autor**: Vinicius (via Claude Code).

### fix: vazamento de dados e race condition na busca de CPF (Nova Venda, ONDA 2 — itens #1 e #2)
- **Arquivos**: `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx`,
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-pf.ts`,
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-pf.test.ts`.
- **Motivo**: conforme `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) e
  `docs/ROADMAP_CORRECOES.md` (P1.1/P1.2), `buscarClientePorCPF()` mantinha
  os dados de um cliente pesquisado anteriormente quando o CPF buscado não
  era encontrado/dava erro (`?? d.campo`), e não tinha proteção contra
  respostas fora de ordem (race condition) entre buscas consecutivas.
- **Alteração**: nova função pura `mergeDadosClientePorCPF` (com testes)
  que limpa os 16 campos do responsável/titular (e o histórico de pedidos)
  quando o CPF não corresponde a nenhum cliente ou a busca falha — mesmo
  princípio já validado em `mergeDadosResponsavelPF`. Adicionado
  `AbortController` (cancela buscas obsoletas) e debounce de 300ms no
  `onBlur` do campo CPF.
- **Impacto**: nenhuma mudança de layout, regra de negócio Safeweb ou de
  CNPJ. Único efeito visível: ao buscar um CPF que não existe (ou em caso
  de erro), os campos do responsável/endereço voltam a ficar vazios em vez
  de manter dados do cliente pesquisado antes.
- **Testes**: `npx vitest run` — 20/20 passando (7 novos casos para
  `mergeDadosClientePorCPF`). `npx next build` — build limpo.
- **Autor**: Vinicius (via Claude Code).

## 11/06/2026

### 1b1d268 — feat: cancelamento integrado de pedidos com Safeweb (Frente B)
- **Arquivos**: `prisma/schema.prisma`, `scripts/migrate.js`,
  `src/app/(dashboard)/pedidos/[id]/acoes.tsx`,
  `src/app/(dashboard)/pedidos/[id]/page.tsx`,
  `src/app/api/pedidos/[id]/route.ts`,
  `src/app/api/pedidos/[id]/cancelar/route.ts` (novo),
  `src/app/api/pedidos/[id]/cancelar/lib.ts` (novo),
  `src/app/api/pedidos/[id]/cancelar/lib.test.ts` (novo),
  `src/components/modal-cancelar-pedido.tsx` (novo),
  `src/lib/audit.ts`, `src/lib/permissoes-estrutura.ts`,
  `docs/ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md`.
- **Motivo**: implementação da "Frente B" especificada em
  `docs/ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md` — o cancelamento de um
  pedido no CertFlow não sincronizava com a Safeweb, deixando protocolos
  abertos sem rastreabilidade (ver caso real documentado em
  `docs/LIMPEZA_EXECUTADA.md`).
- **Impacto**:
  - Novo endpoint `POST /api/pedidos/[id]/cancelar` é o único caminho
    suportado para cancelar um pedido. `PATCH /api/pedidos/[id]` agora
    rejeita `status: 'CANCELADO'` com erro 400.
  - Cancelamento exige motivo obrigatório (categoria fixa + observação
    opcional), bloqueia pedidos `EMITIDO` (400) e cancelamento duplo
    (409, com registro de auditoria da tentativa).
  - Quando há `safewebProtocolo`, chama `cancelarSolicitacao` (Safeweb);
    se a Safeweb recusar/der timeout, nada é alterado localmente (V1).
    Campo `safewebCancelamentoPendente` foi criado no schema mas ainda
    **não é usado** — reservado para uma futura V2 de reprocessamento
    manual.
  - Histórico completo do cancelamento (data/hora, usuário, motivo,
    protocolo, resultado Safeweb) é gravado em `AuditLog` (`acao:
    'CANCELAR_PEDIDO'`) e exibido na tela do pedido.
  - Botão "Cancelar" só aparece para ADMIN e GERENTE com a permissão
    granular `monitor.cancelar=true`; OPERADOR, FINANCEIRO e
    VISUALIZADOR não veem o botão. A trava real continua sendo o backend
    (403 para quem não tem permissão).
- **Risco**: médio — altera o fluxo de cancelamento de pedidos em
  produção. Mitigado por: validação de segurança operacional cobrindo
  todos os caminhos que alteram `status = CANCELADO` (apenas o novo
  endpoint e o webhook Safeweb pré-existente, este último fora de
  escopo); matriz de permissões revisada perfil a perfil; simulação dos
  4 cenários (GERADO sem protocolo, GERADO com protocolo, CANCELADO,
  EMITIDO).
- **Pendência conhecida**: o webhook `/api/safeweb/webhook` possui um
  caminho pré-existente que pode marcar `Pedido.status = 'CANCELADO'`
  a partir de eventos da Safeweb (Cancelamento/Revogação) sem atualizar
  `canceladoEm`/`AuditLog`/lançamentos — não foi alterado nesta frente
  (fora de escopo); candidato a uma futura "Frente C".
- **Testes**: `npm test` — 2 arquivos, 15 testes, todos passando.
  `rm -rf .next && npx prisma generate && npx next build` — build de
  produção concluído com sucesso.
- **Autor**: Vinicius Petri (via Claude Code)

### feat: lançamento financeiro nasce na emissão do certificado (não mais no protocolo gerado)
- **Arquivos**: `src/app/api/pedidos/nova-venda/route.ts`,
  `src/app/api/pedidos/route.ts`, `src/app/api/pedidos/[id]/route.ts`,
  `docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md` (novo),
  `docs/ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md`,
  `docs/ROADMAP_CORRECOES.md`.
- **Motivo**: nova regra de negócio definida pelo Vinicius — a empresa
  concilia diariamente "certificados emitidos na agenda" com
  "lançamentos do contas a receber". Lançamentos criados no momento do
  protocolo gerado (antes da emissão) geravam divergência nessa
  conciliação.
- **Mudança**: removida a criação automática de `Lancamento`
  `RECEBER`/`PENDENTE` em `nova-venda/route.ts` e `pedidos/route.ts`
  (no momento da criação do pedido). `PATCH /api/pedidos/[id]`, no bloco
  já existente que cria o `Certificado` ao transicionar o pedido para
  `EMITIDO`, passou a também criar o `Lancamento`, com os mesmos campos
  usados anteriormente (descrição, valor, vencimento, forma de
  pagamento, parceiro). Criação **idempotente**: verifica se já existe
  `Lancamento` para o `pedidoId` antes de criar (evita duplicidade para
  pedidos "em transição" criados sob a regra antiga ou com lançamento
  manual antecipado feito pelo Financeiro).
- **Sem migration** — sem alteração de schema, apenas mudança de
  lógica/momento de criação.
- **Impacto**: tela Financeiro ("Contas a Receber") e widgets do
  dashboard ("A Receber", "A Receber Vencidos", "Recebido no Mês")
  passam a refletir apenas pedidos `EMITIDO`. "Vendas"/"Faturamento"/
  "Emissões" do dashboard principal não mudam (já eram baseados em
  `Pedido`, não em `Lancamento`). Pedidos já em `GERADO`/`VERIFICADO`
  antes desta mudança mantêm o lançamento criado sob a regra antiga
  (não duplicado quando forem emitidos, por causa da idempotência).
- **Risco**: pagamento recebido antes da emissão não gera lançamento
  automático — mitigação: `ADMIN`/`GERENTE` podem criar lançamento
  manual vinculado ao pedido pela tela Financeiro
  (`POST /api/financeiro/lancamentos`, `pedidoId` opcional já suportado).
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso.
- **Autor**: Vinicius Petri (via Claude Code)

### docs: deploy do commit a791e20 e atualização de documentação para a nova regra
- **Arquivos**: `docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md`,
  `docs/ROADMAP_CORRECOES.md`, `docs/BANCO_DE_DADOS.md`,
  `docs/MAPA_DO_SISTEMA.md`.
- **Motivo**: commit `a791e20` foi enviado e o deploy em produção
  confirmado (`Ready`). Restavam trechos de documentação descrevendo a
  regra antiga (lançamento criado ao registrar a venda/protocolo
  gerado).
- **Mudança**: status atualizado para `DEPLOYADO — Aguardando Validação
  Operacional` em `ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md` e
  `ROADMAP_CORRECOES.md`; corrigidas as descrições em
  `BANCO_DE_DADOS.md` (origem dos dados da tabela `lancamentos`) e
  `MAPA_DO_SISTEMA.md` (itens "Concluído" que mencionavam lançamento
  automático "ao vender"/"ao registrar venda") para refletir que o
  lançamento nasce em `EMITIDO`.
- **Validação operacional**: pendente — será confirmada durante o fluxo
  normal da empresa (próximo pedido emitido deve gerar exatamente 1
  `Lancamento` `RECEBER`/`PENDENTE` vinculado, sem duplicidade).
- **Sem alteração de código/produção** nesta entrada — apenas
  documentação.
- **Autor**: Vinicius Petri (via Claude Code)


### chore: remoção do endpoint temporário de diagnóstico (cancelamento dos 3 protocolos restantes)
- **Arquivos**: `src/app/api/admin/diagnostico-cancelamento-temp/route.ts`
  (removido), `docs/LIMPEZA_EXECUTADA.md`
- **Motivo**: o endpoint cumpriu seu propósito — cancelar na Safeweb os 3
  protocolos de teste remanescentes (`1010781647`, `1010782402`,
  `1010782465`). Todos os 3 cancelamentos foram aceitos
  (`cancelamento.ok: true`) e a consulta posterior de cada um retornou
  "Protocolo não encontrado", confirmando o cancelamento. Resultado
  individual registrado em `docs/LIMPEZA_EXECUTADA.md` (seção
  "Cancelamento dos 3 protocolos restantes"). Com isso, a pendência de 4
  protocolos órfãos da limpeza de 10/06/2026 está encerrada.
- **Impacto**: nenhum — endpoint isolado, de uso único, removido por
  completo. Nenhuma tela ou fluxo dependia dele.
- **Risco**: nenhum.
- **Testes**: `npm test` — 1 arquivo, 2 testes, todos passando. `npm run
  build` (com `.next` limpo) — build de produção concluído com sucesso.
- **Autor**: Vinicius Petri (via Claude Code)

### feat: endpoint temporário de diagnóstico — cancelamento dos 3 protocolos restantes
- **Arquivos**: `src/app/api/admin/diagnostico-cancelamento-temp/route.ts`
  (novo, temporário)
- **Motivo**: concluir a limpeza pendente de `docs/LIMPEZA_EXECUTADA.md`,
  cancelando na Safeweb os 3 últimos protocolos de teste de 10/06
  (`1010781647`, `1010782402`, `1010782465`), usando o mesmo procedimento
  já validado com sucesso para o protocolo `1010781571`.
- **Escopo**: endpoint `GET`, protegido por `auth()` + `role === 'ADMIN'`,
  lista fixa de 3 protocolos hardcoded no código, sem aceitar nenhum
  parâmetro externo. Não altera nenhum fluxo existente, não é chamado por
  nenhuma tela. Não expõe tokens, segredos ou variáveis `SAFEWEB_*` na
  resposta.
- **Impacto**: nenhum em fluxos existentes — endpoint isolado e de uso
  único. Será removido após a validação (ver entrada de remoção neste
  changelog assim que concluída).
- **Risco**: a chamada real de cancelamento na Safeweb é uma ação em
  sistema de terceiro, possivelmente irreversível — só pode ser acionada
  manualmente pelo Vinicius (ADMIN autenticado) acessando a URL.
- **Autor**: Vinicius Petri (via Claude Code)

### chore: remoção de arquivo residual diag3.json
- **Arquivos**: `diag3.json` (removido), `docs/LIMPEZA_EXECUTADA.md`
- **Motivo**: arquivo órfão na raiz do projeto, gerado em 10/06/2026
  durante o levantamento que antecedeu a limpeza de testes (provável
  saída de consulta ao endpoint `/api/admin/diagnostico-limpeza`, já
  removido). Continha dados pessoais (CPF, CNPJ, nome, telefone, data de
  nascimento, endereço) dos clientes de teste, fora do diretório
  protegido `/backups/`.
- **Impacto**: nenhum — arquivo nunca foi versionado pelo git e não tinha
  nenhuma dependência de código, scripts ou documentação. Dados já
  cobertos pelo backup oficial em
  `backups/limpeza-2026-06-10-backup.json`.
- **Risco**: nenhum.
- **Autor**: Vinicius Petri (via Claude Code)

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
