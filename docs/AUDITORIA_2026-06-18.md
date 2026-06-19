# Auditoria Completa — 18/06/2026

> Documento gerado a pedido explícito de Vinicius, em modo **somente
> documentação e auditoria**. Nenhuma alteração de código, banco, deploy,
> commit, migration, variável de ambiente, rota, integração Safeweb,
> payload, regra de negócio, webhook, monitoramento ou tela foi realizada
> durante a geração deste relatório. Toda a informação abaixo foi extraída
> via comandos de leitura (`git log`, `git show --stat`) e do histórico
> desta sessão.

---

## 1. Arquivos alterados hoje (18/06/2026)

Lista completa, na ordem em que foram alterados. Para cada um: motivo,
antes/depois resumido, impacto.

### `src/lib/email/transporte.ts`
- **Motivo**: Railway bloqueia portas SMTP de saída (587/465/2525) —
  confirmado por teste de conectividade TCP. E-mail é canal crítico para
  avisos de vencimento/emissão, não podia depender de porta bloqueada.
- **Antes**: usava `nodemailer` via SMTP (host/porta/usuário/senha Brevo).
- **Depois**: usa a API HTTP do Brevo (`api.brevo.com/v3/smtp/email`,
  porta 443/HTTPS), mantendo a mesma assinatura `sendMail()`.
- **Impacto**: nenhum ponto de chamada precisou mudar (5 lugares que já
  usavam `transporte.sendMail`). E-mail automático voltou a funcionar.

### `src/app/api/admin/testar-alerta/route.ts`
- **Motivo**: ferramenta de diagnóstico para confirmar que os 3 canais de
  alerta (WhatsApp, e-mail, Telegram) funcionam em produção.
- **Antes/Depois**: passou por várias iterações de debug (testes de DNS,
  porta TCP, resposta bruta do Digisac) e foi simplificado no final do
  dia para só testar os 3 canais e retornar `{whatsapp, email, telegram}`.
- **Impacto**: endpoint de diagnóstico apenas — não afeta fluxo real.

### `src/lib/email/tipos.ts` (novo arquivo)
- **Motivo**: centralizar os labels/descrições dos 8 tipos de e-mail
  automático (antes duplicado em `configuracoes/emails/page.tsx`).
- **Impacto**: nenhum — apenas extração de constante.

### `src/lib/email/enviar.ts`
- **Motivo**: religar o evento do webhook do Brevo (entregue/aberto) ao
  `EmailLog` de origem.
- **Antes**: `transporte.sendMail({from, to, subject, html})`.
- **Depois**: idem + `tag: log.id`, e grava `motivoFalha` em caso de erro.
- **Impacto**: nenhuma mudança de comportamento de envio, só rastreio.

### `src/components/sidebar.tsx`
- **Motivo**: mover a Calculadora de Deslocamento do dashboard para o
  menu, em "Certificado Digital".
- **Antes**: sem item de calculadora no menu.
- **Depois**: novo item "Calculadora de Deslocamento" → `/pedidos/calculadora-deslocamento`.
- **Impacto**: nenhum em fluxo de negócio — só navegação.

### `src/app/api/brevo/webhook/route.ts` (novo arquivo, depois corrigido 3x)
- **Motivo**: receber eventos do Brevo (entregue/aberto/clicado/bounce) e
  atualizar `EmailLog`.
- **Bug encontrado e corrigido no mesmo dia**: o Brevo manda `tags`
  (array correto) e `tag` (string com array serializado, ex.
  `'["abc"]'`) — o código inicial priorizava `tag` (sempre truthy mesmo
  malformado). Corrigido para priorizar `tags[0]`.
- **Impacto**: endpoint novo, isolado — não interfere em nenhum outro
  webhook (Safeweb, Digisac, Telegram, Inter são arquivos separados).

### `src/app/(dashboard)/pedidos/calculadora-deslocamento/page.tsx` (novo)
- **Motivo**: nova rota própria para a calculadora, reaproveitando o
  componente `WidgetCalculadora` já existente.
- **Impacto**: nenhum — rota nova, não substitui nada.

### `src/app/(dashboard)/dashboard/widget-monitoramento-notificacoes.tsx` (novo)
- **Motivo**: Vinicius pediu visibilidade de envio/abertura de e-mails e
  WhatsApp automáticos direto no dashboard.
- **Impacto**: novo widget, visível só para ADMIN, substituindo a
  Calculadora de Deslocamento **apenas na tela do ADMIN** (outros perfis
  continuam vendo a calculadora, pois usam no dia a dia).

### `src/app/(dashboard)/dashboard/page.tsx`
- **Antes**: slot 6 da grade sempre mostrava `<WidgetCalculadora />`.
- **Depois**: `session.user.role === 'ADMIN' ? <WidgetMonitoramentoNotificacoes /> : <WidgetCalculadora />`.
- **Impacto**: visual, restrito ao papel ADMIN.

### `src/app/(dashboard)/configuracoes/emails/page.tsx`
- **Motivo**: mostrar estatísticas (enviados/abertura/falhas) por tipo de
  e-mail automático.
- **Impacto**: query adicional (`groupBy`), sem alterar a lógica de envio.

### `scripts/migrate.js` e `prisma/schema.prisma`
- Ver seção 5 (Alterações de banco).

### `src/app/(dashboard)/configuracoes/emails/editor.tsx`
- **Motivo**: correção visual — estatísticas estavam num `<div>` fora do
  card do editor, cortando visualmente. Movidas para dentro do cabeçalho
  do próprio card.
- **Impacto**: só visual.

### `src/app/api/certificados/[id]/route.ts`
- **Motivo 1 (manhã)**: botão "Não Renovou" em `/renovacoes` enviava
  `status: 'VENCIDO'` e a API só aceitava
  `['ATIVO','VENCIDO','CANCELADO','RENOVADO']`, nunca gravava
  `motivoNaoRenovacao`.
  - **Depois**: aceita `NAO_RENOVADO` e grava `motivoNaoRenovacao`,
    `naoRenovadoEm`, `naoRenovadoPorId`.
- **Motivo 2 (tarde, ligado ao incidente Safeweb)**: PATCH aceitava
  `status: 'EMITIDO'` por edição manual de certificado também — mesma
  classe de risco do `pedidos/[id]/route.ts` (ver seção 3).
- **Motivo 3**: suporte a edição completa de certificado manual
  (modelo, datas, protocolo, valor) — ver seção 6.

### `src/app/(dashboard)/renovacoes/page.tsx`
- **Antes**: aba "Não Renovados" consultava `status: 'VENCIDO'`.
- **Depois**: consulta `status: 'NAO_RENOVADO'`.
- **Impacto**: aba volta a mostrar certificados marcados pela UI.

### `src/app/(dashboard)/renovacoes/lista.tsx`
- **Motivo**: mostrar o motivo da não renovação direto na linha da tabela.
- **Impacto**: só visual/leitura.

### `src/app/(dashboard)/renovacoes/detalhe.tsx`
- **Antes**: `marcarNaoRenovar()` enviava `{status: 'VENCIDO', observacao}`.
- **Depois**: envia `{status: 'NAO_RENOVADO', observacao}`.
- **Impacto**: certificados marcados a partir de hoje gravam corretamente.

### `src/app/api/pedidos/nova-venda/route.ts` — **ÁREA SAFEWEB**
Ver seção 3 (mapeamento dedicado).

### `src/app/api/pedidos/[id]/route.ts` — **ÁREA SAFEWEB**
Ver seção 3.

### `src/app/(dashboard)/pedidos/monitoramento/acoes.tsx` — **ÁREA SAFEWEB/MONITORAMENTO**
Ver seção 3.

### `src/app/api/certificados/route.ts`
- **Motivo**: valor digitado no cadastro manual de certificado ia só como
  texto dentro de `observacoes`, nunca virava número — tela sempre
  mostrava R$ 0,00.
- **Depois**: grava em `Certificado.valorManual` (campo novo).
- **Impacto**: isolado ao fluxo de cadastro manual (sem Safeweb, sem
  pedido, sem lançamento financeiro).

### `src/app/(dashboard)/clientes/[id]/page.tsx`
- **Motivo**: exibir `valorManual` como fallback quando não há pedido.
- **Impacto**: só visual.

### `src/app/(dashboard)/clientes/[id]/editar-certificado.tsx` (novo)
- **Motivo**: botão "Editar" para corrigir certificado cadastrado
  manualmente, sem precisar excluir e recriar.
- **Impacto**: novo componente, ação isolada via PATCH já existente.

### `docs/changelog.md`
- Registro formal das alterações de 17 e 18/06 (Regra 5 da governança).

### `src/app/(dashboard)/financeiro/contas-a-receber/page.tsx`
Alterado em 4 commits diferentes ao longo do dia:
1. Mostrar nome do responsável da empresa abaixo do nome do cliente
   (substituindo o link do número do pedido, que Vinicius disse não ser
   relevante nesse contexto).
2. Campo de busca (cliente/razão social/responsável/parceiro) + card
   "Bonificados" clicável (versão inicial).
3. Revertido o card clicável (Vinicius não gostou — sem volta fácil) →
   "Bonificados" virou opção dentro do dropdown de Status.
4. Layout: meses e filtros forçados a ficar na mesma linha.
5. Coluna Valor: edição inline para lançamentos Pendente/Vencido (desconto
   negociado antes de dar baixa).
- **Impacto**: todas as mudanças são de tela financeira, sem nenhuma
  ligação com Safeweb/protocolo/emissão.

### `src/components/filtro-status.tsx`, `src/components/filtro-agr.tsx`, `src/components/filtro-busca.tsx` (busca é novo)
- **Motivo**: preservar todos os filtros entre si ao trocar um (antes
  trocar Status fazia perder o AGR selecionado), e adicionar a opção
  "Bonificados" no dropdown de Status.
- **Impacto**: só tela de Contas a Receber (Contas a Pagar usa os mesmos
  componentes mas não foi testada/alterada hoje — `outrosParams` é
  opcional, mantém compatibilidade).

### `src/components/editar-valor-lancamento.tsx` (novo)
- **Motivo**: editar valor do lançamento direto na lista, antes de dar
  baixa (desconto negociado com cliente).
- **Impacto**: usa PATCH que já existia em
  `/api/financeiro/lancamentos/[id]` (campo `valor` já era aceito, só
  faltava interface).

---

## 2. Commits realizados hoje

| # | Hash | Horário | Descrição | Arquivos |
|---|------|---------|-----------|----------|
| 1 | `d3bd24f` | 09:45:22 | fix: migrar envio de e-mail de SMTP para API HTTP do Brevo | `transporte.ts` |
| 2 | `6d31e04` | 09:50:01 | chore: simplificar endpoint de diagnóstico de alerta | `testar-alerta/route.ts` |
| 3 | `ac21e7f` | 10:09:44 | feat: monitoramento de notificações automáticas | 11 arquivos (schema, migrate, e-mail, sidebar, dashboard) |
| 4 | `b54783f` | 10:16:39 | debug: logar payload do webhook Brevo | `brevo/webhook/route.ts` |
| 5 | `b5367f2` | 10:22:52 | fix: corrigir extração da tag no webhook do Brevo | `brevo/webhook/route.ts` |
| 6 | `ad2ac67` | 10:26:52 | chore: remover log de debug do webhook Brevo | `brevo/webhook/route.ts` |
| 7 | `8df0fa3` | 10:32:11 | fix: mover estatísticas de e-mail para dentro do card | `emails/page.tsx`, `editor.tsx` |
| 8 | `6e3cc20` | 11:09:24 | fix: botão "Não Renovou" gravava status errado | `certificados/[id]/route.ts`, `renovacoes/*` |
| 9 | `45743c4` | 16:22:47 | **feat: protocolo Safeweb automático obrigatório na venda** | `pedidos/nova-venda/route.ts` |
| 10 | `9fba70b` | 16:35:23 | **fix: bloquear EMITIDO manual sem protocolo Safeweb real** | `pedidos/[id]/route.ts` |
| 11 | `c500933` | 16:40:03 | **fix: remover botões manuais do monitoramento** | `monitoramento/acoes.tsx` |
| 12 | `e6ef2e0` | 16:53:55 | feat: editar certificado manual + corrigir valor | `certificados/route.ts`, `certificados/[id]/route.ts`, `clientes/[id]/*` |
| 13 | `e15ce94` | 17:04:57 | docs: registrar changelog de 17-18/06 | `changelog.md` |
| 14 | `4ea8347` | 17:54:36 | feat: mostrar responsável em Contas a Receber | `contas-a-receber/page.tsx` |
| 15 | `dd67494` | 18:02:06 | feat: busca + card Bonificados clicável (versão 1) | `filtro-*`, `contas-a-receber/page.tsx` |
| 16 | `d483cad` | 18:13:11 | fix: Bonificados como opção de Status (versão final) | `filtro-status.tsx`, `contas-a-receber/page.tsx` |
| 17 | `633352d` | 18:18:35 | fix: meses e filtros na mesma linha | `filtro-busca.tsx`, `contas-a-receber/page.tsx` |
| 18 | `eb69e37` | 18:23:53 | feat: editar valor do lançamento inline | `editar-valor-lancamento.tsx`, `contas-a-receber/page.tsx` |

Os três commits em **negrito** são os únicos que tocam área Safeweb —
mapeados em detalhe na seção 3.

---

## 3. Alterações na Safeweb — mapeamento dedicado

### 3.1 `src/lib/safeweb.ts`
**Não foi alterado hoje.** Última alteração: 16/06/2026 (commit
`0541d3f`, "aciRemovalCandidate true"). Confirmado via
`git log -- src/lib/safeweb.ts`.

### 3.2 `src/app/api/pedidos/nova-venda/route.ts`
- **Quando**: commit `45743c4`, 18/06/2026 16:22:47.
- **O que foi alterado**: a chamada à Safeweb (`adicionarVideoconferencia`,
  mesma função, mesmo payload, mesma lógica de `src/lib/safeweb.ts`) passou
  a rodar **antes** da criação do `Pedido` no banco, não mais em paralelo
  com um `Promise.race` contra um timeout de 40s que silenciosamente
  deixava o pedido incompleto.
- **Por que**: incidente real (cliente Renato) — pedido foi criado sem
  protocolo, gerando estado intermediário que exigia conclusão manual.
  Autorizado explicitamente por Vinicius, com escopo confirmado por
  pergunta direta (vale para presencial, videoconferência e emissão
  online; nada criado se a Safeweb falhar; manter os 40s de espera).
- **O que NÃO mudou**: payload enviado à Safeweb, lógica de
  `adicionarVideoconferencia`/`buscarProduto`/`integracaoHope`, nenhuma
  linha de `src/lib/safeweb.ts`.

### 3.3 `src/app/api/pedidos/[id]/route.ts`
- **Quando**: commit `9fba70b`, 18/06/2026 16:35:23.
- **O que foi alterado**: transição manual para `EMITIDO` (via PATCH)
  passou a exigir `safewebProtocolo` ou `numeroCompra` já preenchido no
  pedido; sem isso, retorna erro 422 antes de tocar no banco.
- **Por que**: descoberto durante o teste do item 3.2 — clicar
  "Finalizar" num pedido sem protocolo criava um certificado "ativo"
  fictício (reproduzido e depois excluído, ver seção 8).

### 3.4 `src/app/(dashboard)/pedidos/monitoramento/acoes.tsx`
- **Quando**: commit `c500933`, 18/06/2026 16:40:03.
- **O que foi alterado**: removidos os botões "Verificar"/"Finalizar"
  (avançavam status manualmente) e "+ Protocolo" (entrada manual de
  número). Pedidos em GERADO/VERIFICADO agora mostram só "Aguardando".
  Mantidos "Liberar" (emissão online — checkpoint de pagamento) e
  "Notificar" (envio de mensagem), por não serem "aprovação de
  certificado".
- **Por que**: autorizado explicitamente por Vinicius ("Ou o sistema
  notifica sozinho ou não vai valer de nada"). Esses botões eram a causa
  raiz do certificado fictício do item 3.3.

### 3.5 `src/app/api/safeweb/webhook/route.ts`
**Não foi alterado hoje.** Última alteração: 17/06/2026 (commits
`2c827b6`, `90b14f4`, `9441677`, `75e074c`, `2b14538` — transação
atômica, retry, alerta crítico — todos de ontem, já documentados no
changelog de 17/06).

### 3.6 Integração Hope, eventos, protocolos, presencial, vídeo, emissão online
Nenhuma alteração hoje além do já descrito em 3.2 (mudança de ORDEM de
execução, não de lógica/payload).

### 3.7 Teste real executado hoje
- Pedido de teste criado pela própria tela (PED-202606-56897, CPF do
  Vinicius) → protocolo gerado automaticamente (1010850151) → confirmado
  no banco (`safewebProtocolo`, `numeroCompra`, `hopeUrlDocumentos`
  preenchidos) → cancelado pela tela de detalhe do pedido → Safeweb
  confirmou cancelamento real (`safewebStatus: "Cancelamento De
  Solicitação"`). Validação ponta a ponta da mudança 3.2.

---

## 4. Alterações em regras de negócio

| Regra | Antes | Depois | Autorização |
|---|---|---|---|
| Geração de protocolo na venda | Pedido sempre criado; protocolo em paralelo com timeout silencioso | Protocolo obrigatório **antes** de criar o pedido; falha = nenhum registro criado | Explícita (seção 3.2) |
| Marcar pedido como EMITIDO manualmente | Sem validação | Exige protocolo real preenchido | Explícita (seção 3.3) |
| Avançar status manualmente no monitoramento | Botões "Verificar"/"Finalizar"/"+Protocolo" disponíveis | Removidos — só webhook automático | Explícita (seção 3.4) |
| Marcar certificado como "Não Renovado" | Gravava `status=VENCIDO`, motivo só em HistoricoContato | Grava `status=NAO_RENOVADO` + `motivoNaoRenovacao` | Correção de bug, não regra nova |
| Bonificados no financeiro | Não existiam como filtro | Opção dedicada no dropdown de Status | Explícita |
| Valor de lançamento | Só editável recriando o lançamento | Editável inline antes de dar baixa | Explícita |

Nenhuma alteração de regra de negócio fora dessas seis.

---

## 5. Alterações de banco

**Migrations executadas (via `scripts/migrate.js`, padrão `ADD COLUMN IF NOT EXISTS`, aplicadas também direto no Neon nesta sessão):**

| Tabela | Coluna | Tipo | Motivo |
|---|---|---|---|
| `email_logs` | `entregueEm` | TIMESTAMP(3) | rastreio de entrega (webhook Brevo) |
| `email_logs` | `abertoEm` | TIMESTAMP(3) | rastreio de abertura |
| `email_logs` | `clicadoEm` | TIMESTAMP(3) | rastreio de clique |
| `email_logs` | `motivoFalha` | TEXT | rastreio de erro |
| `certificados` | `valorManual` | DECIMAL(10,2) | valor de certificado cadastrado manualmente (sem pedido) |

**Nenhuma coluna foi removida. Nenhum índice foi criado/removido. Nenhuma tabela foi removida.**

**Correções de dados em produção (via script Node/pg, não migration):**
- Excluídos: 1 `Pedido`, 1 `ItemPedido`, 1 `Certificado`, 1 `Lancamento`
  fictícios criados durante o teste manual do cliente Renato (ver seção 8).
- Corrigido: `valorManual` do certificado real do Renato (estava NULL/0,
  ajustado para R$ 60,00, valor que ele de fato cobrou).
- Corrigido: `motivoNaoRenovacao` do certificado do próprio Vinicius —
  restaurado o texto real digitado por ele em 11/06 ("Não será necessário
  renovar esse certificado pois é o token que fica com a Laryssa"),
  substituindo um texto genérico que tinha sido gravado por engano numa
  correção manual de 17/06.
- Removidos: 4 registros de teste em `email_logs` (testes do webhook
  Brevo) e o pedido de teste PED-202606-56897 foi mantido no banco com
  status CANCELADO (cancelamento real, não exclusão — é o registro que
  comprova o teste ponta a ponta da seção 3.7).

---

## 6. Alterações em APIs

### Endpoints criados
- `POST /api/brevo/webhook` — recebe eventos do Brevo.
- (Nenhum outro endpoint novo — os demais reaproveitaram rotas existentes.)

### Endpoints alterados (payload antes/depois)

**`PATCH /api/certificados/[id]`**
- Antes: `{ status?, observacao? }` — status aceito:
  `ATIVO|VENCIDO|CANCELADO|RENOVADO|NAO_RENOVADO`.
- Depois: `{ status?, observacao?, modeloId?, dataEmissao?, dataVencimento?, numeroSerie?, valorFinal? }`
  — mesmo enum de status, agora também grava `motivoNaoRenovacao` quando
  `status=NAO_RENOVADO`, e aceita edição completa do certificado.

**`PATCH /api/pedidos/[id]`**
- Antes: aceitava `status=EMITIDO` sem validar protocolo.
- Depois: rejeita (422) `status=EMITIDO` se não houver
  `safewebProtocolo`/`numeroCompra`.

**`POST /api/pedidos/nova-venda`**
- Antes: sempre retornava 201 com `safewebProtocolo: string | null`
  (podia ser `null` com pedido já criado).
- Depois: para presencial/videoconferência/emissão online, retorna 502
  com `{erro, motivo}` e **nenhum pedido criado** se a Safeweb falhar;
  caso contrário, 201 com `safewebProtocolo` sempre preenchido.

### Endpoints removidos
Nenhum.

---

## 7. Alterações em telas

| Tela | Alteração |
|---|---|
| Dashboard (ADMIN) | Widget de Calculadora trocado por Widget de Notificações Automáticas |
| Sidebar | Novo item "Calculadora de Deslocamento" em Certificado Digital |
| Configurações > E-mails | Estatísticas por tipo de e-mail (enviados/abertura/falhas) |
| Renovações | Aba "Não Renovados" corrigida; motivo visível na lista |
| Monitoramento de pedidos | Botões manuais removidos (Verificar/Finalizar/+Protocolo) |
| Cadastro de cliente | Botão "Editar" certificado; valor manual exibido corretamente |
| Contas a Receber | Nome do responsável, campo de busca, filtro Bonificados, layout de filtros numa linha, valor editável inline |
| Nova Venda / Emissão Online | Comportamento de erro mudou (mensagem de falha em vez de tela de sucesso parcial) — nenhuma mudança visual de formulário |

---

## 8. Problemas identificados hoje

1. **Pedido sem protocolo automático** (cliente Renato) — causa raiz: falha
   pontual da Safeweb combinada com timeout silencioso (não confirmado
   por log exato, log já tinha rotacionado — classificado como hipótese
   na seção 9).
2. **Certificado fictício criado via botão "Finalizar"** — confirmado:
   clicar "Finalizar" num pedido sem protocolo criava `Certificado`
   status=ATIVO e `Lancamento` de R$60 sem nenhum protocolo real por
   trás. Reproduzido pelo próprio Vinicius ao testar.
3. **Aba "Não Renovados" vazia** — confirmado: bug de campo
   (`status='VENCIDO'` consultado em vez de `'NAO_RENOVADO'`).
4. **Motivo de não renovação incorreto na tela de cliente** — confirmado:
   sobrescrito por correção manual anterior (17/06) que não sabia da
   ação real do usuário em 11/06.
5. **Valor de certificado manual sempre R$0,00** — confirmado: valor
   gravado só como texto em `observacoes`, nunca em campo numérico.
6. **Mensagens de teste recorrentes no Telegram** — confirmado: cron de
   teste (`ScheduleWakeup` mal configurado como recorrente diário em vez
   de único) chamando o endpoint de diagnóstico. Cancelado via
   `CronDelete`.
7. **E-mail crítico não funcionava** (investigado ontem, corrigido hoje)
   — confirmado: Railway bloqueia portas SMTP de saída.
8. **Webhook do Brevo não atualizava `EmailLog`** — confirmado: bug do
   campo `tag` vs `tags` no payload do Brevo.

*Itens "vídeos indo para ACI" e "protocolos presos em VERIFICADO"
mencionados no template do relatório: não foram objeto de investigação
hoje (18/06) — essas duas questões foram tratadas em sessões anteriores
(16/06, ver `feedback_certflow_emissao_automatica_robustez` e changelog
de 16/06) e não foram revisitadas hoje.*

---

## 9. Hipóteses levantadas

### Confirmadas (com evidência)
- Railway bloqueia portas SMTP de saída (teste de conectividade TCP
  direto nas 3 portas, todas com timeout).
- `api.digisac.com.br` em NXDOMAIN (3 métodos de DNS independentes) —
  **nota: essa investigação foi em 17/06, não hoje**.
- Bug do campo `tag`/`tags` no webhook do Brevo (visto no payload real
  capturado via log).
- Botão "Finalizar" cria certificado sem validar protocolo (reproduzido).
- `src/lib/safeweb.ts` e `nova-venda/route.ts` não alterados antes do
  incidente (confirmado via `git log --since`).

### Refutadas
- "Claude alterou algo na Safeweb que causou a falha do protocolo" —
  refutada por auditoria de git log (nenhum arquivo Safeweb tocado entre
  16/06 e o incidente).
- "Era um deploy em andamento no momento da falha" — refutada (último
  deploy antes do incidente foi 3h antes, sem deploy no meio).

### Ainda sem evidência direta (hipótese, não fato)
- **Causa exata da falha pontual da Safeweb no pedido do Renato**: não
  há log retido (buffer do Railway já rotacionou). Hipótese mais provável
  (lentidão/timeout pontual da API da Safeweb), mas **não comprovada**.

---

## 10. Estado atual do sistema

### Funcionando (confirmado por teste real hoje)
- Geração automática de protocolo na venda (presencial/videoconferência/
  emissão online) — testado ponta a ponta (criação + cancelamento real).
- Bloqueio de EMITIDO manual sem protocolo.
- Monitoramento sem botões manuais — só leitura/espera de webhook.
- E-mail automático (API Brevo) — testado com envio e confirmação de
  entrega via webhook.
- WhatsApp (Digisac) e Telegram — confirmados funcionando ontem (17/06),
  não houve indicação de regressão hoje.
- Aba "Não Renovados" e motivo de não renovação.
- Edição de certificado manual (valor, dados).
- Contas a Receber: busca, filtro Bonificados, edição de valor inline.

### Não está funcionando / pendente
- **Comissões de parceiros**: investigado hoje, infraestrutura de dados
  existe (modelo `Comissao`, tela de cadastro), mas cálculo e pagamento
  automático **não existem** — combinado para retomar em outra sessão.
- `Lancamento.parceiroId` sem foreign key declarada no banco (risco
  conhecido, documentado, não corrigido hoje).

### Sob investigação
- Nenhum item em investigação ativa neste momento — todos os problemas
  abertos hoje foram corrigidos e testados, exceto Comissões (pausado a
  pedido do Vinicius) e a causa exata da falha pontual da Safeweb (sem
  log disponível para confirmar, tratado como aceitável dado que é caso
  isolado de 1 em 7 pedidos).

### Pendente (próxima sessão)
- Implementar cálculo e pagamento de comissões de parceiros (ver memória
  `project_certflow_comissoes_pendente`).
- Corrigir FK ausente em `Lancamento.parceiroId` (mencionado, não
  agendado formalmente).
