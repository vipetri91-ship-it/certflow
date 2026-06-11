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
- **Status**: pendente — nenhuma análise iniciada.
- **Dependências**: nenhuma. Pode ser feito de forma independente, item a
  item, seguindo o mesmo ciclo (documentar → remover → testar → build →
  changelog → commit → aprovação → push → verificação pós-deploy).
- **Onda**: ONDA 2.

---

## P1 — Alto

### P1.1 — Replicar isolamento de formulário (`mergeDados*`) nos demais pontos de vazamento
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
- **Impacto**: alto esforço — 9-10 pontos, cada um precisa de análise de
  impacto e teste individual (Regra 3 e 6), priorizando `wizard.tsx` por
  ser o fluxo de vendas.
- **Status**: pendente — nenhum dos 9-10 pontos corrigido ainda.
- **Dependências**: nenhuma técnica, mas recomenda-se primeiro investigar
  os 2 itens "não verificados" (`parceiros/[id]/editar`, `sst/page.tsx`)
  para confirmar se o padrão se aplica antes de definir o tamanho total
  do trabalho.
- **Onda**: ONDA 3 (item a item, com aprovação individual).

### P1.2 — Debounce/cancelamento na busca de CPF do wizard (race condition)
- **Descrição**: `wizard.tsx:371-403` (`buscarClientePorCPF`) dispara a
  consulta no `onBlur` sem debounce/cancelamento. Se o usuário digitar um
  CPF, sair do campo, voltar e digitar outro CPF rapidamente, a resposta
  da primeira consulta pode chegar depois da segunda e sobrescrever a
  tela com dados do CPF errado.
- **Risco**: médio — vetor adicional para o mesmo tipo de vazamento de
  dados entre clientes corrigido na ONDA 0, mas requer ação rápida e
  específica do usuário para ocorrer.
- **Impacto**: baixo a médio — adicionar debounce/`AbortController` em
  uma função isolada do wizard; não altera regra de negócio, apenas
  timing da consulta.
- **Status**: pendente.
- **Dependências**: idealmente feito **depois** de P1.1 (mesma área de
  código), para evitar dois rounds de teste sobre `wizard.tsx`.
- **Onda**: ONDA 3.

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
- **Status**: pendente.
- **Dependências**: idealmente feito **junto** com P1.1/P1.2, já que
  ambos tocam as mesmas funções — escrever testes antes ou durante essas
  correções reduz risco de regressão.
- **Onda**: ONDA 3 ou 5 (recomendado: junto com P1.1).

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
| ONDA 1 | ✅ Concluída | 3 itens críticos de segurança (test-db, cnpj sem auth, chave diagnóstico hardcoded) |
| ONDA 2 | P0.1 | Endpoints de teste restantes (`test-auth`, `test-email`, `test-whatsapp`) |
| ONDA 3 | P1.1, P1.2, P1.3, (P3.1) | Isolamento de formulário no wizard, race condition CPF, revisão LGPD do diagnóstico/audit_logs |
| ONDA 4 | P2.1 a P2.5 | Duplicação de código, log com PII, feedback de erros, documentação, revisão widget RFB |
| ONDA 5 | P3.2 | Consolidação da lista de AGRs |

Cada item segue o ciclo padrão já validado na ONDA 1: análise de
impacto → aprovação do Vinicius → implementação mínima → testes + build
→ atualização de `docs/changelog.md` e `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
→ commit → aprovação → push → verificação pós-deploy.