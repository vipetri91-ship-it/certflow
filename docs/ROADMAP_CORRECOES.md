# Roadmap de Correções — CertFlow

> Organiza os itens **restantes** de
> [docs/AUDITORIA_GERAL_DO_SISTEMA.md](./AUDITORIA_GERAL_DO_SISTEMA.md) por
> prioridade, conforme Regra 9 (Auditoria Contínua) da
> [Governança do ERP V&G](./GOVERNANCA.md). Os 3 itens críticos de
> segurança da ONDA 1 já foram corrigidos, testados e publicados — ver
> seção "ONDA 1" no topo da auditoria e `docs/changelog.md`. Nenhum item
> abaixo deve ser implementado sem análise de impacto + aprovação prévia
> (Regra 2 e 3).

---

## ONDA 1 — CONCLUÍDA

**Data de conclusão**: 10/06/2026

**Commits realizados**:

| Commit | Descrição |
|---|---|
| `de70c47` | Remoção do endpoint `/api/test-db` (vazava `DATABASE_URL` em erro) |
| `e713645` | Autenticação obrigatória (`auth()`) em `/api/cnpj/[cnpj]` |
| `6790572` | Remoção do bypass por chave hardcoded em `/api/admin/diagnostico-protocolo` |
| `a2d999c` | Documentação: encerramento da ONDA 1 e criação deste roadmap |

**Problemas corrigidos**:

1. **`/api/test-db`** — em caso de erro, retornava `process.env.DATABASE_URL`
   completo (usuário/senha/host do Postgres) sem exigir autenticação.
   Endpoint removido e documentado em
   [docs/endpoints-removidos.md](./endpoints-removidos.md).
2. **`/api/cnpj/[cnpj]`** — acessível sem login, retornava sem máscara CPF,
   data de nascimento, e-mail, celular, endereço completo, PIS/NIS e
   responsável de clientes já cadastrados. Corrigido com a mesma checagem
   `auth()` usada em `/api/cpf/[cpf]`.
3. **`/api/admin/diagnostico-protocolo`** — aceitava o cabeçalho
   `x-diag-key: cf-diag-2026-vp-temp` como bypass total de autenticação e
   de verificação de perfil ADMIN. Bypass removido; mantida apenas
   `auth()` + `role === 'ADMIN'`.

**Evidências de validação**:

- `npm test` — 1 arquivo, 2 testes, todos passando (em cada um dos 3
  commits).
- `npm run build` (com `.next` limpo) — build de produção concluído sem
  erros de TypeScript (em cada um dos 3 commits).
- `GET /api/test-db` em produção → `404`.
- `GET /api/cnpj/[cnpj]` sem autenticação em produção → `401`.
- `GET /api/admin/diagnostico-protocolo` sem autenticação em produção →
  `403`.
- Busca em todo o código-fonte (`*.ts`, `*.tsx`) confirma **zero**
  referências residuais a `x-diag-key` e `cf-diag-2026-vp-temp` (as
  únicas ocorrências restantes são em `docs/changelog.md` e
  `docs/AUDITORIA_GERAL_DO_SISTEMA.md`, como registro histórico).
- As 5 telas dependentes de `/api/cnpj/[cnpj]` (`clientes/novo`,
  `clientes/[id]/editar`, `parceiros/novo`, `sst`, wizard de
  `pedidos/nova-venda`) continuam funcionando normalmente para usuários
  logados (fetch relativo envia o cookie de sessão automaticamente).
- Para administradores autenticados, `/api/admin/diagnostico-protocolo`
  mantém exatamente o mesmo comportamento anterior (apenas a checagem
  `auth()` + `role === 'ADMIN'` que já existia, sem alteração de query,
  payload ou regra de negócio).

**Deploys realizados** (Vercel, produção — `https://certflow-nine.vercel.app`):

| Deploy | Commit | Status |
|---|---|---|
| 1 | `de70c47` | ✅ Ready |
| 2 | `e713645` | ✅ Ready |
| 3 | `6790572` | ✅ Ready |

---

## ONDA 2 — CONCLUÍDA

**Data de conclusão**: 12/06/2026

Replicação do padrão de isolamento de formulário (`mergeDados*`, mesmo
princípio do commit `c3e9803` que corrigiu `mergeDadosResponsavelPF`) para
os 12 pontos mapeados na seção 7 da auditoria (P1.1), item a item, com
análise de impacto e aprovação prévia em cada um (Regra 2 e 3).

**Commits realizados**:

| Commit | Item(s) | Descrição |
|---|---|---|
| `bfa1aab` | #1/#2 | `wizard.tsx` — `mergeDadosResponsavelPF`/`buscarClientePorCPF` |
| `b832b0b` | #3/#4 | `wizard.tsx` — `validarCNPJ`/`autoPreencherPorCNPJ` |
| `4736fc7` | #6 | `clientes/novo` — `buscarCnpj` (`mergeDadosEmpresaPorCnpj`) |
| `dfa2696` | #7 | Documentação: `clientes/[id]/editar` `buscarCnpj` — sem ação necessária |
| `6f48fcb` | #10 | `pedidos/nova-venda/emissao-online.tsx` — `validar()` (`mergeDadosEmissaoOnline`) |
| `8e7fdba` | #9, #8, parceiros/editar, sst | `parceiros/novo` — `buscarCnpj` (`mergeDadosParceiroPorCnpj`) + documentação dos itens #8/parceiros-editar/sst |

**Resultado final**: 5 itens corrigidos com função pura + testes
automatizados (`mergeDados*`), 1 item já estava protegido (`clientes/novo`
`buscarCep`), 4 itens reclassificados como "sem ação necessária" (#5, #7,
#8 e a verificação de `parceiros/[id]/editar`, que resultou em "não
aplicável"), e 1 item (`sst/page.tsx`) registrado como risco residual
aceito de baixa prioridade. Detalhamento completo em `docs/changelog.md`
(entradas de 12/06/2026) e seção 7 de `docs/AUDITORIA_GERAL_DO_SISTEMA.md`.

**Evidências de validação**: `npx vitest run` (37/37 passando, incluindo os
novos testes de cada `mergeDados*`) e `npx next build` (build limpo) em
cada commit; todos os deploys de produção confirmados `● Ready` na Vercel.

---

## PRÓXIMA ETAPA

Nenhuma nova onda iniciada. Próximos candidatos (não iniciados): ONDA 3
(P0.1 — endpoints de teste restantes; P1.3 — revisão LGPD do
diagnóstico/audit_logs) e P1.2 (debounce na busca de CPF do wizard,
remanescente de P1.1/ONDA 2). Aguardando decisão do Vinicius sobre qual
onda iniciar a seguir.

---

## Funcionalidade Cancelamento Integrado CertFlow + Safeweb

**Status**: `ESPECIFICADO` / `AGUARDANDO IMPLEMENTAÇÃO`

- **Especificação completa**:
  [docs/ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md](./ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md)
- **Origem**: ao cancelar um pedido no CertFlow, o protocolo
  correspondente na Safeweb continua ativo (não há sincronização). Esse
  problema motivou a limpeza manual de 4 protocolos órfãos em
  11/06/2026, documentada em
  [docs/LIMPEZA_EXECUTADA.md](./LIMPEZA_EXECUTADA.md), durante a qual
  `cancelarSolicitacao` (`src/lib/safeweb.ts`) foi validada com sucesso
  em produção pela primeira vez.
- **Resumo da proposta**: ao cancelar um pedido com protocolo gerado,
  cancelar automaticamente o protocolo na Safeweb, exigindo motivo,
  restrito a `ADMIN`/`GERENTE`, com auditoria completa, e indicadores
  gerenciais de desistência.
- **Riscos principais**: ação na Safeweb é praticamente irreversível;
  `idJustificativa = 4` sem documentação oficial confirmada; ativar a
  permissão `monitor.cancelar` (hoje definida mas não usada) pode mudar
  quem consegue cancelar pedidos hoje.
- **Próximo passo**: aguardando aprovação do Vinicius para iniciar a
  implementação faseada (migration de novos campos → endpoint dedicado
  testado em homologação Safeweb → enforcement de `monitor.cancelar` →
  UI → dashboard gerencial), conforme ordem recomendada na seção 14 da
  especificação.

---

## Funcionalidade Lançamento financeiro nasce na Emissão

**Status**: `DEPLOYADO` em 11/06/2026 (commit `a791e20`, em produção) —
**Aguardando Validação Operacional** (será confirmado durante o fluxo
normal da empresa: próximo pedido emitido deve gerar exatamente 1
`Lancamento` vinculado).

- **Especificação completa**:
  [docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md](./ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md)
- **Origem**: o lançamento `RECEBER` era criado já na geração do pedido
  (protocolo gerado), divergindo da conciliação diária da empresa
  (certificados emitidos x contas a receber).
- **Mudança aplicada**: `src/app/api/pedidos/nova-venda/route.ts` e
  `src/app/api/pedidos/route.ts` deixaram de criar `Lancamento`;
  `src/app/api/pedidos/[id]/route.ts` passou a criar o `Lancamento`
  `RECEBER`/`PENDENTE` no mesmo bloco em que cria o `Certificado`, ao
  transicionar o pedido para `EMITIDO`, com checagem de idempotência
  (não duplica se já existir lançamento para o pedido).
- **Sem migration** — apenas mudança de lógica.
- **Impacto na Frente B (cancelamento)**: já refletido na seção 8 de
  `ESPECIFICACAO_CANCELAMENTO_PROTOCOLO.md` — a etapa de "cancelar
  lançamentos pendentes" passa a ser, na maioria dos casos, não
  aplicável.

---

## P0 — Crítico

### P0.1 — Remover/proteger endpoints de teste restantes em produção
- **Descrição**: `/api/test-auth` testa a senha `certflow@2024` contra
  `admin@certflow.com.br` sem autenticação (permite força bruta de senha
  de admin); `/api/test-email` e `/api/test-whatsapp` também respondem
  sem autenticação. `/api/test-db` (o mais grave, vazava `DATABASE_URL`)
  já foi removido na ONDA 1.
- **Risco**: alto — `/api/test-auth` permite tentar a senha do
  administrador repetidamente sem login; os demais podem expor
  configuração de e-mail/WhatsApp ou permitir envio indevido de
  mensagens.
- **Impacto da correção**: nenhum esperado — mesmo padrão da ONDA 1
  (endpoints de diagnóstico não usados por telas/integrações). Precisa de
  verificação prévia (grep por referências) igual à feita para
  `/api/test-db`.
- **Status**: ✅ concluído em 15/06/2026 — `/api/test-auth`,
  `/api/test-email` e `/api/test-whatsapp` removidos. Sem referências
  encontradas no código (`src/`), `npx vitest run` (37/37) e
  `npx next build` passaram após a remoção. Ver `docs/changelog.md`
  (15/06/2026).
- **Dependências**: nenhuma. Pode ser feito de forma independente, item a
  item, seguindo o mesmo ciclo (documentar → remover → testar → build →
  changelog → commit → aprovação → push → verificação pós-deploy).
- **Onda**: ONDA 3.

---

## P1 — Alto

> **Nota**: P1.1 foi concluído na **ONDA 2** (12/06/2026, ver seção acima).
> P1.2 permanece pendente (remanescente da ONDA 2). P1.3 permanece na
> ONDA 3, junto com P0.1.

### P1.1 — Replicar isolamento de formulário (`mergeDados*`) nos demais pontos de vazamento ✅ CONCLUÍDO
- **Descrição**: a correção da ONDA 0 (`mergeDadosResponsavelPF`,
  commit `c3e9803`) resolveu 1 de pelo menos 10 pontos do
  `wizard.tsx` e telas de cadastro onde uma consulta (CPF/CNPJ/CEP) sem
  resultado pode deixar dados do cliente/empresa anterior preenchidos na
  tela. Pontos mapeados na seção 7 da auditoria: `wizard.tsx`
  (`buscarClientePorCPF`, `validarCNPJ`, `autoPreencherPorCNPJ`,
  `buscarCep`), `clientes/novo` e `clientes/[id]/editar`
  (`buscarCnpj`, `buscarCep`), `pedidos/nova-venda/emissao-online.tsx`
  (`validar`), `parceiros/novo` (`buscarCnpj`), e os 2 itens "não
  verificados" (`parceiros/[id]/editar`, `sst/page.tsx`).
- **Risco**: médio-alto — vazamento de dados entre clientes/empresas no
  fluxo de maior volume do sistema (nova venda), mesmo tipo de problema
  do bug já corrigido (LGPD).
- **Status**: ✅ concluído na ONDA 2 (12/06/2026). Resultado item a item em
  `docs/changelog.md` e seção 7 de `docs/AUDITORIA_GERAL_DO_SISTEMA.md`.
- **Onda**: ONDA 2 — concluída.

### P1.2 — Cancelamento de buscas assíncronas por CNPJ/CPF (race conditions)
- **Descrição**: escopo original do roadmap (debounce/`AbortController` na
  busca de CPF do `wizard.tsx`) **já havia sido resolvido na ONDA 2**
  (commit `bfa1aab`, 12/06/2026 — `buscarClientePorCPF` com debounce de
  300ms + `cpfAbortRef`). Durante o mapeamento da ONDA 3 foi identificado
  que o mesmo tipo de race condition (resposta tardia de uma busca por
  CNPJ sobrescrevendo dados de uma busca mais recente) existia em **outros
  5 pontos** do sistema, sem debounce/cancelamento:
  1. `pedidos/nova-venda/wizard.tsx` — `autoPreencherPorCNPJ`
  2. `clientes/[id]/editar/page.tsx` — `buscarCnpj`
  3. `sst/page.tsx` — `buscarCnpj` (modal de lead)
  4. `clientes/novo/page.tsx` — `buscarCnpj`
  5. `parceiros/novo/page.tsx` — `buscarCnpj`
- **Risco**: médio — mesmo vetor de vazamento/sobrescrita de dados entre
  consultas corrigido para CPF na ONDA 2, agora estendido a todas as
  buscas por CNPJ do sistema.
- **Impacto**: baixo a médio — correção sistêmica via nova abstração
  compartilhada `src/lib/busca-cancelavel.ts` (`BuscaCancelavel`), que
  cancela a busca anterior e descarta sua resposta caso uma nova busca já
  tenha sido iniciada. Em `clientes/[id]/editar` e `sst` foram criados
  novos módulos `mergeDados*PorCnpj` (mesmo padrão da ONDA 2) para também
  limpar os campos preenchidos por uma consulta anterior quando o novo
  CNPJ não é encontrado ou dá erro.
- **Status**: ✅ concluído na ONDA 3 (15/06/2026). Inclui testes
  automatizados que validam explicitamente o descarte de respostas
  tardias (`src/lib/busca-cancelavel.test.ts`) e os novos módulos de merge
  (`merge-dados-cnpj.test.ts` em `clientes/[id]/editar/lib` e `sst/lib`).
  Resultado item a item em `docs/changelog.md`.
- **Dependências**: P1.1 (ONDA 2, mesma área de código) já estava
  concluído — sem impedimento.
- **Onda**: ONDA 3 — concluída.

### P1.3 — Revisar exposição de PII em `/api/admin/diagnostico-protocolo` e política de retenção de `audit_logs`
- **Descrição**: mesmo após a ONDA 1 (que exigiu `auth()` + `role ===
  'ADMIN'` em 100% dos acessos), o endpoint continua retornando CPF,
  CNPJ, DDD, celular, data de nascimento e endereço completo de até 30
  clientes para qualquer administrador autenticado. Falta também definir
  uma política de retenção/exposição para `audit_logs` (LGPD).
- **Risco**: médio — exposição de PII em massa para administradores,
  sem necessidade clara de todos esses campos para o diagnóstico
  original (comparar pedidos com/sem protocolo gerado).
- **Impacto**: a definir — pode envolver reduzir os campos retornados
  (`select`) ou mascarar CPF/data de nascimento, sem alterar a finalidade
  de diagnóstico. Requer confirmação do Vinicius sobre o uso real do
  endpoint antes de qualquer mudança.
- **Status**: pendente — nenhuma análise iniciada.
- **Dependências**: nenhuma técnica, mas depende de decisão de negócio
  (manter, restringir campos ou aposentar o endpoint).
- **Onda**: ONDA 3.

---

## P2 — Médio

### P2.1 — Centralizar formatação de CPF/CNPJ/telefone/CEP
- **Descrição**: `formatarCPF`/`formatarCNPJ` (definidas em
  `src/lib/utils.ts:35-40`) são reimplementadas em 10+ arquivos
  (`clientes/novo`, `clientes/[id]/editar`, `parceiros/novo`,
  `parceiros/[id]/editar`, `wizard.tsx`, `emissao-online.tsx`,
  `widget-rfb.tsx`); formatação de telefone e lógica de mesclagem
  DDD+celular também duplicadas (seções 4.2-4.4), assim como a consulta
  ViaCEP.
- **Risco**: baixo isoladamente, mas cada cópia é um ponto de
  inconsistência futura — uma correção de formatação feita em um lugar
  não se propaga para os outros.
- **Impacto**: médio esforço — consolidar em `src/lib/utils.ts` e
  substituir as chamadas, sem alterar o resultado visual/funcional (são
  reimplementações do mesmo algoritmo).
- **Status**: pendente.
- **Dependências**: nenhuma, mas se sobrepõe a arquivos tocados em P1.1 —
  recomenda-se fazer **depois** de P1.1 para não conflitar.
- **Onda**: ONDA 4.

### P2.2 — Remover `console.log` com dados pessoais em produção
- **Descrição**: `src/app/api/pedidos/nova-venda/route.ts:39-40` —
  `console.log('[Safeweb][diag] usuário logado', { id, nome, email,
  role })` grava nome/e-mail do usuário interno (não do cliente) em logs
  de servidor.
- **Risco**: baixo — dados de usuário interno (não de cliente final), mas
  ainda é PII em log persistente.
- **Impacto**: trivial — remover ou substituir por log sem PII (ex.:
  apenas `id` e `role`).
- **Status**: pendente.
- **Dependências**: nenhuma.
- **Onda**: ONDA 4.

### P2.3 — Tratar `catch {}` silenciosos em buscas de CEP/CNPJ
- **Descrição**: `clientes/novo/page.tsx:109,125,137,368` e
  `clientes/[id]/editar/page.tsx:138,158` engolem erros de
  `buscarCep()`/`buscarCnpj()` sem mensagem nem log — usuário não percebe
  que o preenchimento automático falhou.
- **Risco**: baixo (UX) — usuário pode preencher manualmente um campo que
  deveria ter sido preenchido automaticamente, sem saber que houve falha.
- **Impacto**: baixo — adicionar feedback (toast/mensagem) ou log,
  sem alterar fluxo de submissão.
- **Status**: pendente.
- **Dependências**: nenhuma; pode ser combinado com P1.1 (mesmas
  funções), mas não é obrigatório.
- **Onda**: ONDA 4.

### P2.4 — Documentar áreas mapeadas na seção 2 da auditoria
- **Descrição**: 14 áreas/rotas existem no código sem documentação
  dedicada em `/docs` (Regra 1) — certificados, perfil, sessão/heartbeat,
  sistema/horário, calculadora de deslocamento, `pedidos/novo`, busca de
  série A3, liberar emissão online, configurações de permissões,
  auditoria, categorias financeiras, rate limiting, admin/diagnóstico,
  notificações.
- **Risco**: baixo direto, mas aumenta risco de decisões erradas em
  mudanças futuras por falta de contexto documentado (Regra 1).
- **Impacto**: nenhum no código — apenas documentação. Recomenda-se
  começar pelas integrações financeiras e jobs (mais críticas e menos
  visíveis).
- **Status**: pendente.
- **Dependências**: nenhuma — pode ser feito em paralelo com qualquer
  outra onda.
- **Onda**: ONDA 4 (pode começar antes, é apenas leitura/documentação).

### P2.5 — Revisar dados sensíveis trafegando no widget RFB
- **Descrição**: `dashboard/widget-rfb.tsx:82-87` envia CPF/CNPJ e data de
  nascimento via fetch para validação na Receita. Tráfego é HTTPS, mas
  vale revisar se há retenção desnecessária em log/estado do componente.
- **Risco**: baixo — tráfego já é criptografado; o ponto é apenas tempo
  de retenção em memória/log do client.
- **Impacto**: nenhum esperado — revisão pode concluir que está adequado.
- **Status**: pendente — nenhuma análise iniciada.
- **Dependências**: nenhuma.
- **Onda**: ONDA 4.

---

## P3 — Baixo

### P3.1 — Adicionar testes automatizados ao wizard de nova venda
- **Descrição**: `wizard.tsx` é o maior arquivo de risco do sistema
  (seção 5.1 da auditoria) e ainda não tem cobertura de testes
  automatizados, especialmente nas funções que tocam dados pessoais
  (seção 7).
- **Risco**: baixo no curto prazo, mas aumenta o custo/risco de qualquer
  mudança futura no wizard (incluindo P1.1 e P1.2 acima).
- **Impacto**: nenhum no comportamento — apenas testes (vitest, mesmo
  padrão já usado em `merge-dados-pf.test.ts`).
- **Status**: ✅ parcialmente concluído na ONDA 3 (15/06/2026) — a
  correção do P1.2 incluiu testes automatizados para a nova abstração
  `BuscaCancelavel` (`src/lib/busca-cancelavel.test.ts`) e para os novos
  módulos `mergeDados*PorCnpj` usados por `autoPreencherPorCNPJ` e pelas
  telas de cadastro/edição. Cobertura mais ampla do restante do
  `wizard.tsx` (fora das funções tocadas pelo P1.2) permanece pendente
  para uma onda futura.
- **Observação**: P1.1 (ONDA 2) já adicionou testes automatizados para as
  funções `mergeDados*` extraídas (`buscarClientePorCPF`, `validarCNPJ`,
  `autoPreencherPorCNPJ` etc.). Este item trata da cobertura mais ampla do
  restante do `wizard.tsx`.
- **Dependências**: feito **junto** com P1.2 (ONDA 3), conforme
  recomendado.
- **Onda**: ONDA 3 — parcialmente concluída (escopo restante adiado).

### P3.2 — Consolidar lista de AGRs (Ana/Arlen/Vinicius/Laryssa) mantida em 3 lugares
- **Descrição**: a lista de AGRs aparece duplicada em 3 pontos do código
  (seção 5.4 da auditoria), risco de inconsistência se um novo AGR for
  adicionado e algum lugar for esquecido.
- **Risco**: baixo — já se manifestou uma vez (caso `ana.karolina`/
  `laryssa` corrigido no commit `07d67bc`), mas é raro (mudança de
  equipe).
- **Impacto**: baixo esforço — centralizar em uma constante única
  compartilhada.
- **Status**: pendente.
- **Dependências**: nenhuma.
- **Onda**: ONDA 5.

---

## Resumo por onda

| Onda | Itens | Foco |
|---|---|---|
| ONDA 1 | ✅ Concluída (10/06/2026) | 3 itens críticos de segurança (test-db, cnpj sem auth, chave diagnóstico hardcoded) |
| ONDA 2 | ✅ Concluída (12/06/2026) | P1.1 — vazamento de dados entre formulários (isolamento `mergeDados*` no wizard e telas de cadastro), 12 itens analisados/corrigidos |
| ONDA 3 | P0.1 ✅, P1.2 ✅, P3.1 ✅ (parcial), P1.3 (pendente) | P0.1: endpoints de teste restantes removidos. P1.2: correção sistêmica de race conditions em buscas de CNPJ/CPF (5 pontos) + testes. P1.3 (revisão LGPD do diagnóstico/audit_logs) aguarda decisão de negócio do Vinicius — não bloqueia o encerramento dos demais itens da onda |
| ONDA 4 | P2.1 a P2.5 | Duplicação de código, log com PII, feedback de erros, documentação, revisão widget RFB |
| ONDA 5 | P3.2 | Consolidação da lista de AGRs |

Cada item segue o ciclo padrão já validado na ONDA 1: análise de
impacto → aprovação do Vinicius → implementação mínima → testes + build
→ atualização de `docs/changelog.md` e `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
→ commit → aprovação → push → verificação pós-deploy.