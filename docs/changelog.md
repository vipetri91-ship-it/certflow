# Changelog

Registro de alterações no CertFlow, conforme Regra 5 da
[Governança do ERP V&G](./GOVERNANCA.md).

---

## 23/06/2026

### feat: aba de Comissões de Parceiros no Financeiro
- **Arquivos**: `prisma/schema.prisma` (novo model `ComissaoFechamento`),
  `scripts/migrate.js`, `src/lib/comissoes.lib.ts` (fórmula pura,
  testável), `src/lib/comissoes.lib.test.ts` (6 testes),
  `src/lib/comissoes.ts` (cálculo agregando dados do banco),
  `src/app/api/financeiro/comissoes/route.ts` (novo),
  `src/app/api/financeiro/comissoes/[parceiroId]/pagar/route.ts` (novo),
  `src/app/(dashboard)/financeiro/comissoes/page.tsx` (novo),
  `src/components/comissao-pagar-button.tsx` (novo),
  `src/components/sidebar.tsx` (item de menu novo).
- **Regra de negócio confirmada com Vinicius** (não assumida): a
  modalidade de comissão usada na prática hoje é "preço de custo x preço
  de venda" — cada parceiro tem, por modelo de certificado, um valor de
  custo (`Comissao.valorCusto`) e um valor de venda ao cliente final
  (`Comissao.valorCliente`), já configuráveis na aba "Comissões" de
  Parceiros. A comissão de cada pedido é `valorCliente - valorCusto`.
  Os campos `percentual`/`valorFixo` existem no schema mas **não são
  usados** nesse cálculo — não há fallback para eles (decisão explícita:
  "não pretendo trabalhar com comissão por percentual" hoje).
- **Quando conta**: só `Pedido.status === 'EMITIDO'` (mesma régua já
  usada para o Lançamento financeiro — confirmado que pedidos emitidos
  nunca são cancelados depois, então não há risco de reverter comissão
  já contabilizada).
- **Tela**: `/financeiro/comissoes`, por mês — lista cada parceiro com
  pedidos emitidos no período, o detalhe de cada pedido (custo, venda,
  diferença) e o total. Pedidos cujo modelo não tem
  `valorCusto`/`valorCliente` configurados são sinalizados e excluídos
  do total (não geram erro, só aviso).
- **Marcar como pago**: cria um `Lancamento` `PAGAR` (categoria
  "Comissões Parceiros", `cat02`, já existente) e um registro em
  `ComissaoFechamento` (novo model) vinculado a esse Lançamento — evita
  pagar a mesma comissão duas vezes (`@@unique([parceiroId, mes, ano])`,
  e a API rejeita repagamento se já estiver `PAGO`).
- **Validação contra produção** (somente leitura, sem gravar nada):
  confirmado que existe 1 pedido `EMITIDO` com parceiro
  (`P3 CONTABILIDADE LTDA`), mas nenhum parceiro tem ainda
  `valorCusto`/`valorCliente` cadastrados — a tela aparece vazia até o
  Vinicius cadastrar esses valores por parceiro. Comportamento esperado,
  não é bug.
- **Impacto**: aditivo. Não altera nenhuma rota/tela existente além do
  item novo no menu.
- **Testes**: `npx vitest run` (62/62, 8 novos), `npx prisma generate` e
  `npx next build` limpos.
- **Reversão**: commit único, revertível com `git revert` (tabela nova
  fica sem uso, sem efeito em dados existentes).
- **Autor**: Vinicius (via Claude Code).

### feat: enviar cobrança Inter direto ao cliente por WhatsApp ou e-mail
- **Arquivos**: `prisma/schema.prisma` (novo valor de enum
  `TipoEmailAutomatico.COBRANCA_FINANCEIRA`), `scripts/migrate.js`,
  `src/lib/token-publico.ts` (novo), `src/lib/email/transporte.ts` e
  `src/lib/email/enviar.ts` (suporte a anexo no envio via Brevo),
  `src/app/api/inter/cobranca/pdf-publico/route.ts` (novo),
  `src/app/api/inter/cobranca/enviar/route.ts` (novo),
  `src/components/inter-cobranca-button.tsx` (2 novos botões).
- **Motivo**: depois de gerar a cobrança Inter, era preciso baixar o
  PDF, abrir a conversa com o cliente e anexar manualmente — Vinicius
  pediu 2 botões ("Enviar por WhatsApp" e "Enviar por E-mail") para fazer
  isso com um clique.
- **WhatsApp**: manda mensagem de texto (via Digisac, mesma integração
  já usada para avisos de vencimento) com valor, vencimento, Pix copia e
  cola e um link para o PDF do boleto.
- **E-mail**: manda e-mail (via Brevo) com o PDF do boleto **anexado**
  (a API do Brevo já aceita anexos em base64 — adicionado suporte ao
  `transporte.sendMail`).
- **Link público do PDF**: como o cliente final não tem login no
  CertFlow, criada uma rota pública nova (`/api/inter/cobranca/pdf-publico`)
  protegida por um **token assinado** (HMAC com `NEXTAUTH_SECRET`, ver
  `src/lib/token-publico.ts`) — sem o token correto o acesso é negado, e
  não dá para adivinhar/enumerar `lancamentoId`. A rota autenticada
  original (`/api/inter/cobranca/pdf`, usada internamente no CertFlow)
  não foi alterada.
- **Impacto**: aditivo. Não altera o fluxo de geração de cobrança nem
  nenhuma rota existente de e-mail/WhatsApp automático (vencimentos,
  pós-emissão etc.).
- **Testes**: `npx vitest run` (54/54), `npx prisma generate` e
  `npx next build` limpos.
- **Reversão**: commit único, revertível com `git revert` (o valor novo
  do enum pode ficar sem uso, sem efeito colateral).
- **Autor**: Vinicius (via Claude Code).

### feat: baixar PDF do boleto gerado via Banco Inter
- **Arquivos**: `prisma/schema.prisma`, `scripts/migrate.js` (campo novo
  `Lancamento.interCodigoSolicitacao`), `src/lib/inter.ts` (nova função
  `baixarPdfCobranca`), `src/app/api/inter/cobranca/route.ts` (passa a
  salvar o `codigoSolicitacao` da cobrança), `src/app/api/inter/cobranca/pdf/route.ts`
  (novo endpoint), `src/components/inter-cobranca-button.tsx` (novo link
  "Ver PDF do boleto").
- **Motivo**: ao testar a primeira cobrança real (commit `ed12326`), só
  era possível copiar a linha digitável — sem PDF para enviar ao
  cliente. A API do Inter expõe
  `GET /cobranca/v3/cobrancas/{codigoSolicitacao}/pdf` (confirmado contra
  o código-fonte do pacote `@thiago.zampieri/bancointer`, já usado para
  validar a estrutura de cobrança), mas exige o `codigoSolicitacao` —
  campo que não era salvo no `Lancamento` até agora.
- **Migration**: `ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS
  "interCodigoSolicitacao" TEXT` — aditiva, sem impacto em dados
  existentes.
- **Dado retroativo**: o `Lancamento` de teste gerado em 22/06/2026 (R$
  50, cliente Vinicius) não tinha esse campo — recuperado consultando a
  API do Inter (`GET /cobranca/v3/cobrancas?cpfCnpjPessoaPagadora=...`)
  e populado manualmente após o deploy, para o teste de PDF funcionar
  também nesse caso já existente.
- **Impacto**: aditivo. Não altera o fluxo de geração de cobrança nem a
  estrutura de payload corrigida no dia anterior.
- **Testes**: `npx vitest run` (54/54), `npx prisma generate` e
  `npx next build` limpos.
- **Reversão**: commit único, revertível com `git revert` (a coluna nova
  pode ficar no banco sem uso, sem efeito colateral).
- **Autor**: Vinicius (via Claude Code).

## 22/06/2026

### docs: fechamento do dia — domínio novo, Banco Inter e vínculo de Lançamento
- **Arquivo**: `docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md` (seção 8,
  item 4 — marcado como resolvido).
- **Resumo consolidado do dia** (Regra 8 — `/docs` é a fonte da
  verdade), para retomar com contexto completo:
  1. Domínio `www.vazcertflow.com.br` ativado: DNS configurado na
     HostGator, certificado SSL válido, `NEXTAUTH_URL`/`AUTH_URL`
     atualizados no Railway, Google OAuth (origens/redirect) atualizado,
     webhook do Telegram corrigido (estava apontando para a Vercel
     antiga), webhook do Digisac criado pela primeira vez (nunca tinha
     sido ativado).
  2. Bug corrigido: callback do Google Agenda redirecionava para o host
     interno do Railway (`localhost:8080`) em vez do domínio público
     (commit `bdacb9b`).
  3. Integração com o Banco Inter (cobrança Pix + boleto) ativada pela
     primeira vez em produção: credenciais configuradas, escopo OAuth
     corrigido, estrutura real do payload descoberta e corrigida
     (commits `21fc50e`, `1468f82`, `ed12326`), webhook de pagamento
     cadastrado, testado de ponta a ponta com uma cobrança real.
  4. Lançamento financeiro agora pode ser vinculado manualmente a um
     Pedido na tela Nova Conta a Receber, para cobrar antes da emissão
     do certificado, sem alterar a regra de conciliação de 11/06/2026
     (commit `c0abe1b`).
- **Pendências para retomar**: testar o botão "Gerar cobrança Inter" em
  produção após a correção definitiva do payload; considerar
  redirecionamento da raiz `vazcertflow.com.br` (sem `www`) no painel da
  HostGator (não bloqueante).
- **Autor**: Vinicius (via Claude Code).

### fix: estrutura real do payload de cobrança do Banco Inter (correção definitiva)
- **Arquivos**: `src/lib/inter.ts`, `src/app/api/inter/cobranca/route.ts`.
- **Contexto**: a correção anterior (entrada abaixo, "payload de
  cobrança... rejeitava multa/mora/desconto sem valor") não foi
  suficiente — testando contra a API real em produção, o mesmo erro
  `400 — Não foi possível converter o valor (multa)` persistiu.
- **Investigação**: a documentação pública do Inter
  (developers.inter.co) é uma SPA que não expõe o schema real de forma
  acessível. A estrutura correta foi confirmada testando diretamente
  contra a API (`cdpj.partners.bancointer.com.br`) com variações de
  payload, e depois validada contra o código-fonte de uma biblioteca de
  terceiros publicada (pacote npm `@thiago.zampieri/bancointer`).
- **Erros reais encontrados no payload anterior**:
  1. `multa`/`mora`/`desconto` **devem ser omitidos** quando não há
     cobrança extra — não existe código "sem multa" (`NAOTEMMULTA` não é
     um valor válido); enviar esses objetos zerados causa erro 400.
  2. Faltava o campo `seuNumero` (identificador da cobrança,
     obrigatório).
  3. O endereço do pagador vai **direto** no objeto `pagador` (sem
     aninhar em `endereco`), mas o nome do campo do logradouro é
     `endereco` (string), não `logradouro`.
  4. Faltavam os campos `ddd` e `telefone` do pagador (obrigatórios).
  5. A criação (`POST /cobranca/v3/cobrancas`) só retorna
     `codigoSolicitacao` — os dados do boleto (`nossoNumero`,
     `linhaDigitavel`) e do Pix (`pixCopiaECola`) só vêm consultando
     depois (`GET /cobranca/v3/cobrancas/{codigoSolicitacao}`).
- **Mudança**: `criarCobranca()` agora monta o payload correto, omite
  multa/mora/desconto, e faz a consulta de detalhes automaticamente após
  criar, retornando os dados completos numa única chamada para quem usa
  a função. `consultarCobranca()` passou a receber `codigoSolicitacao`
  (antes recebia, incorretamente, `nossoNumero`). A rota
  `/api/inter/cobranca` agora monta `ddd`/`telefone` a partir do cadastro
  do cliente (`celular`/`telefone`/`ddd`).
- **Validação**: testado de ponta a ponta contra a API real (criação,
  consulta de detalhes e cancelamento) com os dados de um cliente real —
  a cobrança de teste foi cancelada após confirmação, sem deixar
  pendência no painel do banco.
- **Testes**: `npx vitest run` (54/54) e `npx next build` (compilação
  TypeScript limpa).
- **Reversão**: commit único, revertível com `git revert`.
- **Autor**: Vinicius (via Claude Code).

### fix: payload de cobrança do Banco Inter rejeitava multa/mora/desconto sem valor
- **Arquivo**: `src/lib/inter.ts`.
- **Erro**: ao gerar a primeira cobrança real, a API do Inter retornou
  `400 — Não foi possível converter o valor (propriedade: multa)`. Os
  objetos `multa`, `mora` e `desconto` precisam sempre de `valor`/`taxa`
  numéricos (mesmo quando o código é "sem multa/mora/desconto" — não
  podem faltar). Também corrigido o código de `mora`, que era
  `'NAOTEMMORA'` (inválido) e deveria ser `'ISENTO'`.
- **Impacto**: sem essa correção, nenhuma cobrança poderia ser gerada de
  fato — a chamada sempre falhava no Inter. Não afeta nenhuma outra
  integração.
- **Testes**: `npx vitest run` (54/54) e `npx next build` limpos.
  Confirmação final feita gerando uma cobrança real em produção.
- **Reversão**: commit único, revertível com `git revert`.
- **Autor**: Vinicius (via Claude Code).

### feat: vincular Pedido ao criar Lançamento manual (cobrança antes da emissão)
- **Arquivos**: `src/app/api/pedidos/route.ts` (busca `?q=` por número/cliente),
  `src/app/(dashboard)/financeiro/contas-a-receber/novo/page.tsx`.
- **Motivo**: Vinicius relatou que, para cobrar um cliente antes da emissão
  do certificado (ex.: cobrança à vista no momento da venda), era preciso
  emitir o certificado primeiro só para o Lançamento aparecer no
  Financeiro e poder gerar o boleto/Pix do Inter — fluxo invertido.
- **Investigação**: a regra de "Lançamento só nasce na emissão" é
  deliberada (`docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md`, decisão de
  11/06/2026) para manter a conciliação diária "certificados emitidos" x
  "contas a receber" correta — **não foi revertida**. O próprio documento
  já previa esse caso (seção 8.4) e indicava a criação manual de
  Lançamento vinculado a `pedidoId` como mitigação — mas a tela nunca
  ganhou um campo para isso (só havia um campo de texto livre
  "Referência", sem vínculo real).
- **Mudança**: adicionado campo "Vincular a um Pedido (opcional)" na tela
  Nova Conta a Receber — busca por número/cliente
  (`GET /api/pedidos?q=...`), preenche valor/descrição automaticamente e
  define vencimento padrão de 3 dias. Ao emitir o certificado depois, a
  checagem de idempotência já existente em `pedidos/[id]/route.ts` evita
  duplicar o Lançamento.
- **Impacto**: aditivo — campo novo e opcional. Não altera o
  comportamento de criação automática de Lançamento na emissão, nem o
  endpoint `GET /api/pedidos` quando `q` não é informado.
- **Testes**: `npx vitest run` (54/54) e `npx next build` limpos.
- **Reversão**: commit único, revertível com `git revert` sem efeito em
  dados (campo de UI/busca, sem migration).
- **Autor**: Vinicius (via Claude Code).

### fix: escopo OAuth errado bloqueava toda a integração com o Banco Inter
- **Arquivo**: `src/lib/inter.ts`.
- **Contexto**: a integração de cobrança (Pix + boleto) via API do Banco
  Inter já estava implementada (`src/lib/inter.ts`,
  `src/app/api/inter/cobranca/route.ts`,
  `src/app/api/inter/webhook/route.ts`,
  `src/components/inter-cobranca-button.tsx`) mas nunca tinha sido
  ativada em produção: faltavam as credenciais (`INTER_CLIENT_ID`,
  `INTER_CLIENT_SECRET`, `INTER_CERT_B64`, `INTER_KEY_B64`) no Railway —
  agora configuradas.
- **Bug encontrado ao ativar**: o código pedia o escopo OAuth
  `cobranças.read cobranças.write`, que a API do Inter rejeitava com
  `401 — No registered scope value for this client has been requested`,
  mesmo com a permissão de Cobrança corretamente habilitada na
  integração do painel do Inter. O nome correto do escopo é
  `boleto-cobranca.read boleto-cobranca.write` (confirmado testando
  diretamente contra a API, já que a documentação oficial não lista os
  nomes de escopo de forma acessível).
- **Impacto**: sem essa correção, nenhuma cobrança poderia ser gerada —
  toda chamada a `criarCobranca()`/`consultarCobranca()` falharia no
  passo de autenticação. Não afeta nenhuma outra integração.
- **Testes**: autenticação validada com token real obtido com sucesso
  (`access_token` + `expires_in: 3600`) antes do commit; `npx vitest run`
  (54/54) e `npx next build` limpos.
- **Próximo passo, fora deste commit**: cadastrar o webhook
  `https://www.vazcertflow.com.br/api/inter/webhook` no painel do Inter
  (Cobranças → Webhooks) para a confirmação automática de pagamento
  funcionar.
- **Reversão**: commit único e isolado, revertível com `git revert`.
- **Autor**: Vinicius (via Claude Code).

### fix: redirect do callback do Google Agenda usava host interno do Railway
- **Arquivo**: `src/app/api/google/callback/route.ts`.
- **Causa raiz**: o domínio do CertFlow foi migrado de
  `certflow-nine.vercel.app` para `www.vazcertflow.com.br` (Railway). Ao
  testar a conexão com o Google Agenda, o fluxo OAuth completava
  normalmente (token trocado com sucesso), mas o redirecionamento final
  caía em `localhost:8080/configuracoes?google=conectado` — página em
  branco/erro de conexão. Causa: a rota usava `new URL(path, req.nextUrl)`
  para montar o redirect, e `req.nextUrl` reflete o host **interno** do
  container no Railway (porta 8080), não o domínio público.
- **Correção**: trocado `req.nextUrl` por uma URL base fixa lida de
  `process.env.NEXTAUTH_URL` (mesmo padrão já usado em
  `src/lib/google/calendar.ts` para montar o `redirect_uri` do OAuth).
  Nenhuma outra rota do projeto tinha esse padrão (`new URL(_, req.nextUrl)`
  para redirect absoluto) — confirmado por busca em todo `src/app`.
- **Impacto**: corrige a tela de conexão com Google Agenda
  (`/configuracoes`) em produção. Não afeta login (NextAuth já usa
  `NEXTAUTH_URL` corretamente) nem nenhuma outra integração.
- **Testes**: `npx vitest run` (54/54) e `npx next build` limpos antes do
  commit.
- **Reversão**: commit único e isolado, revertível com `git revert` sem
  efeito colateral em outras áreas.
- **Autor**: Vinicius (via Claude Code).

## 18/06/2026

### fix: migrar envio de e-mail de SMTP para API HTTP do Brevo
- **Contexto**: Vinicius pediu sistema de monitoramento de e-mails automáticos
  e, ao testar o canal de alerta crítico (configurado em 17/06), o e-mail
  falhava com "Connection timeout".
- **Causa raiz confirmada**: Railway bloqueia as portas SMTP de saída
  (587/465/2525 — todas davam timeout de conexão TCP, mesmo com o DNS de
  `smtp-relay.brevo.com` resolvendo normalmente). Confirmado via teste de
  conectividade TCP direto nas 3 portas.
- **Solução**: `src/lib/email/transporte.ts` reescrito para usar
  `api.brevo.com/v3/smtp/email` (HTTPS/443, não sujeito ao bloqueio) em vez
  de nodemailer/SMTP, mantendo a mesma assinatura `sendMail()` — nenhum dos
  5 pontos de chamada existentes precisou ser alterado.
- **Nova variável**: `BREVO_API_KEY` no Railway (chave de API gerada no
  painel Brevo, diferente das credenciais SMTP antigas que ficaram sem uso).

### feat: monitoramento de notificações automáticas (e-mail + WhatsApp)
- **Contexto**: Vinicius precisa garantir que os e-mails automáticos de
  vencimento (60/30/15/7 dias, pós-emissão, nutrição 3/6/9 meses) estão
  sendo enviados e abertos — "não posso quebrar esse fluxo".
- **Solução**:
  - `EmailLog` ganhou campos `entregueEm`, `abertoEm`, `clicadoEm`,
    `motivoFalha`
  - `transporte.sendMail()` aceita `tag` (= id do EmailLog) — repassada ao
    Brevo via `tags: [tag]` para religar o evento do webhook ao log de origem
  - Novo webhook `/api/brevo/webhook` recebe eventos (entregue, aberto,
    clicado, bounce) e atualiza o `EmailLog` correspondente
  - **Bug encontrado e corrigido**: o Brevo manda dois campos no payload —
    `tags` (array correto, ex. `["abc123"]`) e `tag` (string contendo o
    array serializado, ex. `'["abc123"]'`) — o código priorizava `tag`
    (sempre truthy mesmo malformado), então a busca por esse ID nunca batia
    com nenhum `EmailLog`. Corrigido para priorizar `tags[0]`.
  - Webhook registrado via API do Brevo (`POST /v3/webhooks`, id 2043410) —
    sem precisar configuração manual no painel
  - Página Configurações > E-mails mostra, por tipo, enviados/taxa de
    abertura/falhas (últimos 90 dias)
  - Novo widget "Notificações Automáticas" no dashboard do ADMIN
    (substitui o widget de Taxa de Deslocamento só para esse role)
  - Calculadora de Deslocamento ganhou rota própria
    (`/pedidos/calculadora-deslocamento`) no sidebar — continua no
    dashboard para os demais perfis (AGRs usam no dia a dia)
- **Arquivos**: `prisma/schema.prisma`, `scripts/migrate.js`,
  `src/lib/email/{enviar,tipos,transporte}.ts`,
  `src/app/api/brevo/webhook/route.ts`,
  `src/app/(dashboard)/dashboard/{page,widget-monitoramento-notificacoes}.tsx`,
  `src/app/(dashboard)/configuracoes/emails/{editor,page}.tsx`,
  `src/components/sidebar.tsx`

### fix: botão "Não Renovou" gravava status errado e perdia o motivo
- **Contexto**: Vinicius marcou um certificado seu como "não renovado" via
  UI em 11/06 com um motivo específico; em 18/06, a aba "Não Renovados" em
  `/renovacoes` aparecia vazia e o motivo mostrado na tela de cliente não
  era o que ele tinha digitado.
- **Causa raiz**: o botão "Não Renovou" enviava
  `{status: 'VENCIDO', observacao}` para `PATCH /api/certificados/[id]`.
  A API só aceitava status `['ATIVO','VENCIDO','CANCELADO','RENOVADO']` e
  nunca escrevia em `Certificado.motivoNaoRenovacao` — só em
  `HistoricoContato`. A aba "Não Renovados" consultava `status='VENCIDO'`.
  Quando uma correção manual anterior (17/06) mudou esse certificado para
  `NAO_RENOVADO` com um motivo genérico, ele desapareceu da aba (que olhava
  só para `VENCIDO`) e o motivo real do usuário ficou perdido, visível só
  no `HistoricoContato`.
- **Solução**: `PATCH /api/certificados/[id]` aceita `status=NAO_RENOVADO`
  e grava `motivoNaoRenovacao`/`naoRenovadoEm`/`naoRenovadoPorId`;
  `detalhe.tsx` envia `status: 'NAO_RENOVADO'`; `/renovacoes` consulta
  `status='NAO_RENOVADO'`; listagem mostra o motivo resumido na linha.
  Restaurado o motivo real do certificado de Vinicius ("Não será
  necessário renovar esse certificado pois é o token que fica com a
  Laryssa", 11/06/2026).

### Incidente Safeweb — auditoria completa + mudanças de regra de negócio
- **Contexto**: pedido do cliente Renato Santos Araújo saiu sem protocolo
  automático da Safeweb, exigindo conclusão manual via Hope Portal.
  Vinicius citou a regra de governança "Safeweb é sagrado" e exigiu
  auditoria com evidências antes de qualquer explicação.
- **Auditoria (evidência objetiva, não inferência)**: `src/lib/safeweb.ts`
  não era alterado desde 16/06; `nova-venda/route.ts` desde 11/06 — nenhum
  tocado nesta sessão. Safeweb respondia normalmente no teste
  (`?modo=basico`). 1 falha em 7 pedidos em 14 dias — caso isolado, não
  regressão. Nenhum deploy em andamento no momento do atendimento.
- **Mudança de regra autorizada (ponto a ponto, via confirmação explícita)**:
  - `src/app/api/pedidos/nova-venda/route.ts`: a chamada à Safeweb agora
    roda **antes** de criar o Pedido (não mais em paralelo com um timeout
    de 40s que silenciosamente seguia adiante). Se falhar/der timeout,
    retorna erro e **nenhum pedido é criado** — vale para presencial,
    videoconferência e emissão online. Payload/lógica de chamada à Safeweb
    em si não foi alterado, só a ordem de persistência.
  - `src/app/api/pedidos/[id]/route.ts`: transição manual para `EMITIDO`
    agora exige `safewebProtocolo`/`numeroCompra` preenchido — descoberto
    porque clicar "Finalizar" num pedido sem protocolo criava um
    certificado "ativo" fictício (reproduzido com o pedido de teste do
    Renato).
  - `src/app/(dashboard)/pedidos/monitoramento/acoes.tsx`: removidos os
    botões "Verificar"/"Finalizar"/"+ Protocolo" — pedidos em
    GERADO/VERIFICADO agora só mostram "Aguardando", sem ação manual
    disponível. Mantidos "Liberar" (emissão online — checkpoint de
    pagamento) e "Notificar" (envio de mensagem), que não são "aprovação
    de certificado".
  - Excluídos do banco: pedido/certificado/lançamento fictícios criados
    durante o teste (cliente Renato) — certificado real dele foi cadastrado
    manualmente depois (ver próximo item).

### feat: editar certificado manual + corrigir valor que não persistia
- **Contexto**: ao cadastrar manualmente o certificado real do Renato
  (emitido fora do CertFlow, via Safeweb direto — "Controller"), o valor
  digitado (R$ 60,00) aparecia como R$ 0,00 na tela, e não havia como
  editar um certificado já cadastrado sem excluir e recriar.
- **Causa raiz**: o formulário de "Cadastrar Certificado" mandava o valor
  só como texto dentro de `observacoes` — nunca virava um número de fato;
  a tela de cliente exibe `Pedido.valorFinal`, que não existe para
  certificado sem pedido vinculado.
- **Solução**: novo campo `Certificado.valorManual` (Decimal), usado como
  fallback de exibição quando não há Pedido; `POST /api/certificados`
  grava o valor digitado nesse campo; `PATCH /api/certificados/[id]`
  passa a aceitar edição completa (modelo, datas, protocolo, valor); novo
  botão "Editar" (lápis) na tela de cliente abre modal pré-preenchido.
  Confirmado: esse fluxo manual nunca cria `Lancamento` financeiro —
  é só um registro de controle de vencimento, como pedido pelo Vinicius.

### chore: cancelado cron de teste do Telegram que disparava a cada 30min
- **Contexto**: Vinicius reportou receber repetidamente no Telegram a
  mensagem de teste do sistema de alerta.
- **Causa raiz**: um `ScheduleWakeup` usado durante a investigação do canal
  de alerta (17/06) foi registrado como cron diário recorrente em vez de
  disparo único, e parte do prompt agendado chamava o endpoint de teste.
- **Solução**: cron cancelado (`CronDelete`). Confirmado que não há nenhum
  agendamento automático real chamando o endpoint de teste — ele só roda
  quando chamado manualmente para diagnóstico.

---

## 17/06/2026

### fix: webhook Safeweb atômico com retry e alerta — emissão 100% automática
- **Contexto**: encontrados pedidos `EMITIDO` sem `Certificado` e/ou sem
  `Lancamento` (2 certificados COOPER e o certificado do próprio Vinicius)
  — o webhook fazia múltiplas escritas separadas, cada uma com try/catch
  silencioso, deixando estado parcial possível.
- **Solução**: toda a escrita do evento "emissao" (status, popup,
  Certificado, Lancamento) roda dentro de uma única `prisma.$transaction`
  — tudo ou nada. Retry automático (3 tentativas, backoff 500ms/1500ms).
  Se as 3 falharem: alerta crítico e registra `AuditLog`.
- **Regra de negócio confirmada**: emissão é 100% automática via webhook,
  nunca depende de clique manual do AGR (ver também correções de 18/06
  sobre os botões manuais que ainda existiam na UI).

### feat: bonificado no financeiro + emissão síncrona em tempo real
- Pedidos com `valorFinal = 0` geram `Lancamento` com `bonificado: true`,
  `status: 'PAGO'`, `formaPagamento: 'Bonificado'` — aparecem na tela
  Contas a Receber com badge roxo e contador "Bonificados (N)", sem entrar
  nos totais de "A Receber"/"Vencidos".
- `PATCH /api/pedidos/[id]`: Certificado e Lançamento criados de forma
  síncrona ao marcar EMITIDO (antes era assíncrono com `Promise.race`).

### fix: investigação e correção dos 3 canais de alerta crítico
- **Contexto**: testando o alerta crítico recém-criado, nenhum dos canais
  funcionava em produção.
- **Causa raiz #1 (WhatsApp/Digisac)**: `api.digisac.com.br` (URL antiga)
  estava em NXDOMAIN — confirmado por 3 métodos DNS independentes
  (resolver padrão do Railway, Google 8.8.8.8, DNS-over-HTTPS). Falha do
  lado do Digisac, não do Railway. Conta migrou para
  `https://vegcertificados.digisac.biz/api/v1`; token também precisou ser
  renovado no painel Digisac.
- **Causa raiz #2 (E-mail)**: na época, ainda via SMTP — Railway bloqueia
  portas SMTP de saída (ver correção definitiva em 18/06, migração para
  API do Brevo).
- **Solução temporária**: adicionado Telegram como terceiro canal
  (`src/lib/telegram.ts`, HTTPS/443, não sujeito a bloqueio de porta) —
  já configurado no projeto via `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ADMIN_CHAT_ID`.
- **Correção de dados**: certificado/lançamento faltantes recriados para
  2 pedidos da COOPER e para o certificado do próprio Vinicius (que também
  teve o status corrigido de `VENCIDO` para `NAO_RENOVADO`, posteriormente
  ajustado de novo em 18/06 com o motivo real do usuário).

### chore: remover seção "Últimos Pedidos" da tela de cliente
- A pedido do Vinicius, removida a listagem de pedidos recentes da tela
  de informações do cliente — fica só a tabela de certificados.

---

## 16/06/2026

### feat: reconciliação automática de protocolos Safeweb presos em VERIFICADO
- **Contexto**: investigação revelou que 3 protocolos de videoconferência
  (1010813157, 1010810289, 1010810219) estavam aprovados/emitidos na Safeweb
  mas permaneciam em `status=VERIFICADO` no CertFlow porque o webhook
  de "emissao" nunca foi entregue (falha de rede/timeout no momento da
  emissão). O campo `safewebStatus` armazena apenas o último evento recebido
  e não há histórico de eventos — impossível saber quantos eventos anteriores
  se perderam.
- **Causa raiz confirmada**: webhook do evento "emissao" não chegou ao
  CertFlow. Safeweb já havia emitido os certificados. Status manual "Finalizar"
  resolvia o caso mas exigia intervenção humana para cada protocolo.
- **Solução**: job de reconciliação ativa que consulta a Safeweb via
  `consultarProtocolo()` e avança pedidos presos automaticamente.
- **Arquivos criados**:
  - `src/app/api/jobs/reconciliar-protocolos/route.ts` — job POST+GET;
    autentica via `AUTH_SECRET` (cron) ou sessão ADMIN (manual); consulta
    `consultarProtocolo()`; se emissão confirmada: atualiza `status=EMITIDO`,
    cria `Certificado` e `Lancamento` (replicando a lógica do
    `PATCH /api/pedidos/[id]`), chama `registrarAuditoria`
  - `src/app/(dashboard)/pedidos/monitoramento/botao-reconciliar.tsx` —
    botão client-component "Reconciliar Safeweb" visível só para ADMIN
    no painel de monitoramento; exibe resumo inline (total/emitidos/erros)
    com painel de detalhes por protocolo expansível
- **Arquivos modificados**:
  - `vercel.json` — cron `*/30 * * * *` adicionado para
    `/api/jobs/reconciliar-protocolos`
  - `src/app/(dashboard)/pedidos/monitoramento/page.tsx` — importa e
    renderiza `<BotaoReconciliar />` condicionalmente para `role=ADMIN`
- **Efeito colateral zero**: pedidos já em `EMITIDO`/`CANCELADO` são
  ignorados pelo filtro (`status=VERIFICADO` + `updatedAt < now-2h`).
  Lançamentos e certificados duplicados são protegidos por `findFirst`
  antes de criar.
- **Autor**: Claude Code (solicitado por Vinicius)

---

## 15/06/2026

### docs: divisão da Fase 8 em 8A (vínculo manual) e 8B (sugestões automáticas)
- **Contexto**: revisão de premissa do Vinicius — um cliente pode ter
  múltiplos certificados válidos simultâneos (mesmo modelo ou diferentes:
  vários tokens A3, contingência, responsáveis diferentes, certificado
  novo emitido antes do vencimento do antigo). A existência de um
  certificado novo **não implica** substituição de outro, então
  "Cliente + Modelo + proximidade de datas" não é critério válido para
  vincular automaticamente uma renovação.
- **Decisão**: nenhum vínculo `certificadoAnteriorId` é criado
  automaticamente. Toda renovação passa a depender de confirmação humana.
  A Fase 8 foi dividida em:
  - **Fase 8A** (próxima etapa): redesenho da ficha (já especificado) +
    ação "🔗 Marcar como renovado por..." na timeline, com seletor que
    lista **qualquer** certificado do cliente (sem filtro por modelo —
    cobre A1→A3, Token→Nuvem, 12→24/36 meses), confirmação, aplicação da
    regra de status já aprovada (seção 3) e ação de desfazer.
  - **Fase 8B** (futura, sem data): motor de sugestões automáticas
    (heurísticas, candidatos, busca inteligente) — apenas sugere, nunca
    grava.
- **Entregável**: seção 10 (nova) do documento
  `docs/ESPECIFICACAO_FICHA_CLIENTE_CERTIFICADOS.md`, detalhando fluxo de
  seleção, efeitos transacionais, validações, desfazer e permissões da
  Fase 8A.
- **Status**: apenas documentação — nenhuma alteração de schema, banco ou
  código realizada nesta etapa. Próximo passo: análise de impacto da
  implementação da Fase 8A.
- **Autor**: Vinicius (via Claude Code).

### docs: especificação consolidada da Fase 8 — Ficha do Cliente Centrada em Certificados
- **Contexto**: após a primeira proposta funcional para a Fase 8 (ficha do
  cliente baseada em certificados, validada com o cadastro do Vinicius como
  caso real), o Vinicius solicitou 6 ajustes conceituais antes de qualquer
  implementação.
- **Entregável**: novo documento
  `docs/ESPECIFICACAO_FICHA_CLIENTE_CERTIFICADOS.md`, consolidando:
  1. Regra de exclusividade mútua entre os estados finais `RENOVADO`,
     `NAO_RENOVADO` e `REVOGADO` (vínculo de renovação sempre sobrescreve
     `NAO_RENOVADO`).
  2. Nova hierarquia visual do card de certificado (Modelo/Validade/
     Emissão/Vencimento/Status/AGR em destaque; Pedido/Protocolo/
     Atendimento/Número da compra em área secundária).
  3. Necessidade de "Valor Comercial" vs. "Valor Cobrado" em bonificações —
     identificada lacuna no schema atual (`Lancamento.valor` +
     `bonificado`), com proposta de campo adicional `valorComercial` para a
     Fase 9 (não implementado agora).
  4. Arquitetura formal da "fonte da verdade": Certificado → Controle de
     Vencimentos (visão derivada) → Renovação (relação entre certificados).
  5. Decisão de integrar `RenovacaoManual` ao histórico cronológico único do
     cliente (timeline única, com diferenciação visual por tipo de card),
     em vez de seção separada de "Acompanhamento de Renovação".
  6. Nova seção obrigatória "Caso Real Validado — Vinicius Antonio Silveira
     Petri", cobrindo ficha, histórico, financeiro, controle de vencimentos
     e compatibilidade com a futura importação do legado.
- **Status**: apenas documentação — nenhuma alteração de schema, banco ou
  código realizada nesta etapa. Aguardando revisão final do Vinicius antes
  de iniciar a análise de impacto da implementação da Fase 8.
- **Autor**: Vinicius (via Claude Code).

### feat(schema): Frente D — Fase 2 (schema aditivo, sem backfill)
- **Contexto**: implementação da Fase 2 da especificação
  `docs/ESPECIFICACAO_HISTORICO_CERTIFICADOS_RENOVACOES.md`, aprovada após
  inclusão dos campos `origem`, `responsavelId` e `encerradoEm` em
  `RenovacaoManual` e do índice composto `(cpfCnpj, status)`.
- **Schema** (`prisma/schema.prisma` + `scripts/migrate.js`, ambos
  aditivos/idempotentes):
  - `StatusCertificado`: novos valores `NAO_RENOVADO` e `REVOGADO`
    (`VENCIDO`/`CANCELADO` permanecem no enum por compatibilidade
    histórica, sem uso por código novo).
  - `Certificado`: novos campos `certificadoAnteriorId`
    (`@unique`, self-relation `RenovacaoCertificado`),
    `motivoNaoRenovacao`/`naoRenovadoEm`/`naoRenovadoPorId`,
    `motivoRevogacao`/`revogadoEm`/`revogadoPorId`, e índice
    `(clienteId, modeloId, status)`.
  - Novos enums `StatusRenovacaoManual` (`PROSPECT`/`CONVERTIDA`/`DESCARTADA`)
    e `OrigemRenovacaoManual` (`MANUAL`/`IMPORTADO`/`CERTIFICADO`).
  - Novo model `RenovacaoManual` (tabela `renovacoes_manuais`): cadastro de
    vencimentos de certificados emitidos fora da V&G, com `origem`,
    `responsavelId` (FK `Usuario`), `criadoPorId`, `encerradoEm` e índices
    `(cpfCnpj, status)` e `(status)`.
  - `Lancamento.bonificado` (`Boolean @default(false)`) para lançamentos de
    cortesia/bonificação.
  - `Usuario`/`Cliente`: novas back-relations correspondentes
    (`certificadosNaoRenovadosPor`, `certificadosRevogadosPor`,
    `renovacoesManuaisCriadas`, `renovacoesManuaisResponsavel`,
    `renovacoesManuais`).
- **Ajuste necessário**: `statusBadge` em
  `src/app/(dashboard)/certificados/page.tsx` passou a cobrir
  `NAO_RENOVADO`/`REVOGADO` (mapa exaustivo por `StatusCertificado`,
  necessário para o build com TypeScript).
- **Fora do escopo desta etapa**: backfill de dados existentes (migração
  `VENCIDO`→`NAO_RENOVADO`/`CANCELADO`→`REVOGADO`, vínculo retroativo de
  `certificadoAnteriorId`), auto-linking de renovação, conversão automática,
  unificação de `/renovacoes`, CRUD de `RenovacaoManual`, timeline da ficha
  do cliente e UI de bonificação — todos planejados para fases seguintes
  (seção 8 da especificação), cada uma com aprovação própria.
- **Validação**: `npx prisma generate` e `npx next build` executados com
  sucesso. Nenhuma query de `UPDATE`/backfill incluída no `migrate.js`.

### docs: especificação da Frente D — Histórico Inteligente de Certificados e Controle de Renovações
- **Contexto**: revisão funcional do módulo de Clientes e Controle de
  Vencimentos identificou que (1) a renovação de certificados não é
  detectada automaticamente nem encadeada na ficha do cliente, (2) o status
  `VENCIDO` está sobrecarregado (usado tanto para "passou da data" quanto
  para a decisão manual "Não Renovou"), e (3) não existe forma de
  acompanhar vencimentos de certificados emitidos fora da V&G que o cliente
  pretende renovar conosco.
- **Entregável**: novo documento
  `docs/ESPECIFICACAO_HISTORICO_CERTIFICADOS_RENOVACOES.md`, com a análise
  estrutural completa, riscos e plano de execução em 10 fases. Cobre:
  novos campos em `Certificado` (`certificadoAnteriorId`,
  `motivoNaoRenovacao`, `naoRenovadoEm`, `naoRenovadoPorId`,
  `motivoRevogacao`, `revogadoEm`, `revogadoPorId`), novos status
  `NAO_RENOVADO`/`REVOGADO`, novo model `RenovacaoManual` (cadastro manual
  de vencimentos externos com conversão automática por CPF/CNPJ ao
  efetivar a venda), e `Lancamento.bonificado` (lançamentos de
  cortesia/bonificação visíveis nos relatórios sem somar na receita).
- **Status**: apenas documentação — nenhuma alteração de schema ou código
  realizada nesta etapa. Aguardando aprovação para iniciar a Fase 2
  (migração de schema aditiva).

### fix(lgpd): redução de exposição de PII no diagnóstico de protocolo e nos audit logs de Cliente/Parceiro (ONDA 3 / P1.3)
- **Contexto**: levantamento da ONDA 3 (P1.3) identificou que
  `/api/admin/diagnostico-protocolo` retornava CPF, CNPJ, DDD, celular,
  data de nascimento e endereço completo de até 30 clientes sem
  necessidade — nenhum desses campos influencia o diagnóstico de geração
  de protocolo Safeweb (que depende apenas de `tipoPessoa` e dos dados do
  pedido/modelo). Também identificou que os audit logs de `Cliente` e
  `Parceiro` gravavam snapshots completos (`antes`/`depois`) a cada
  edição, incluindo CPF/CNPJ/RG/endereço/dados bancários e, no caso de
  `Parceiro`, o hash bcrypt de `senhaParceiro` — visível para ADMIN e
  GERENTE na tela `/configuracoes/auditoria`.
- **Decisão do Vinicius**: reduzir exposição "daqui para frente"; o
  expurgo/anonimização do histórico já gravado fica para um levantamento e
  decisão separados (não realizado nesta etapa).
- **Arquivos alterados**:
  1. `src/app/api/admin/diagnostico-protocolo/route.ts` — `select` do
     `cliente` reduzido a `{ tipoPessoa: true }` (removidos cpf, cnpj,
     ddd, celular, dataNascimento, cep, logradouro, numero, bairro,
     cidade, estado).
  2. `src/lib/audit.ts` — nova função `camposAlterados(antes, depois,
     campos)`, que retorna apenas os **nomes** dos campos cujo valor
     mudou (datas comparadas por valor, não por referência).
  3. `src/app/api/clientes/[id]/route.ts` — PATCH grava
     `dados: { camposAlterados: [...] }` em vez de `{ antes, depois }`.
  4. `src/app/api/parceiros/[id]/route.ts` — mesmo padrão;
     `senhaParceiro` é explicitamente excluído da lista de campos
     auditados (nem o nome do campo nem o hash entram no log a partir de
     agora).
- **Testes novos**: `src/lib/audit.test.ts` (5 testes para
  `camposAlterados`, incluindo comparação de datas e detecção de mudança
  null → valor).
- **Impacto**: nenhuma mudança na resposta das APIs para o frontend
  (Editar Cliente/Parceiro retornam o mesmo JSON). Na tela
  `/configuracoes/auditoria`, o painel de detalhes de UPDATE de
  Cliente/Parceiro passa a mostrar `camposAlterados: [...]` em vez do
  snapshot completo — ajustes cosméticos nessa tela ficam fora do escopo
  desta etapa.
- **Testes/build**: `npx vitest run` (54/54 passou, +5 novos) e
  `npx next build` concluído com sucesso.
- **Onda**: ONDA 3 (P1.3 ✅ concluído — ONDA 3 encerrada).

### fix(security): remoção dos endpoints de teste test-auth, test-email e test-whatsapp (ONDA 3 / P0.1)
- **Arquivos removidos**: `src/app/api/test-auth/route.ts`,
  `src/app/api/test-email/route.ts`, `src/app/api/test-whatsapp/route.ts`.
- **Motivo**: os 3 endpoints respondiam sem autenticação em produção.
  `/api/test-auth` permitia testar repetidamente a senha
  `certflow@2024` contra o usuário `admin@certflow.com.br` (oráculo de
  força bruta da senha do admin) e ainda retornava parte do hash da
  senha e a role do usuário. `/api/test-email` e `/api/test-whatsapp`
  permitiam a qualquer pessoa, sem login, disparar e-mail (via SMTP da
  V&G) ou WhatsApp (via canal Digisac da V&G) para qualquer
  destinatário informado por query string, além de vazar
  configuração de SMTP/Digisac.
- **Verificação**: busca global em `src/` por
  `test-auth|test-email|test-whatsapp` não encontrou nenhuma referência
  funcional (apenas strings de exemplo dentro dos próprios arquivos
  removidos) — mesmo perfil de segurança de `/api/test-db`, removido na
  ONDA 1.
- **Impacto**: nenhum em fluxos existentes — endpoints de diagnóstico não
  usados por nenhuma tela/integração.
- **Testes/build**: `npx vitest run` (37/37 passou) e `npx next build`
  concluídos com sucesso após limpeza do cache `.next`.
- **Onda**: ONDA 3 (P0.1).

### fix: correção sistêmica de race conditions em buscas assíncronas por CNPJ/CPF (ONDA 3 / P1.2 + P3.1)
- **Contexto**: durante o mapeamento da ONDA 3, foi confirmado que o
  escopo original do P1.2 (debounce/`AbortController` na busca de CPF do
  wizard) já havia sido resolvido na ONDA 2 (commit `bfa1aab`,
  12/06/2026). O mapeamento identificou, porém, que o mesmo tipo de race
  condition — resposta tardia de uma busca por CNPJ sobrescrevendo dados
  de uma busca mais recente, podendo deixar a tela com dados de uma
  empresa diferente da pesquisada — existia em outros 5 pontos do
  sistema, sem qualquer cancelamento.
- **Nova abstração**: `src/lib/busca-cancelavel.ts` (`BuscaCancelavel`) —
  extraída do padrão já validado em `buscarClientePorCPF` (ONDA 2).
  Cancela automaticamente a busca anterior ao iniciar uma nova e retorna
  `{ cancelada: true }` quando a resposta de uma busca obsoleta chega
  depois de uma mais recente, para que o `setState` correspondente seja
  ignorado.
- **Arquivos corrigidos** (nesta ordem de prioridade):
  1. `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx` —
     `autoPreencherPorCNPJ` agora usa `cnpjBuscaRef` (`BuscaCancelavel`)
     no lugar do `AbortController` cru; lógica de
     `buscarClientePorCPF`/debounce (ONDA 2) não foi alterada.
  2. `src/app/(dashboard)/clientes/[id]/editar/page.tsx` — `buscarCnpj`
     refeito sobre `BuscaCancelavel`; novo módulo
     `lib/merge-dados-cnpj.ts` (`mergeDadosEmpresaPorCnpj`) limpa os
     campos da empresa quando o novo CNPJ não é encontrado ou a consulta
     falha.
  3. `src/app/(dashboard)/sst/page.tsx` — `buscarCnpj` (modal de lead)
     refeito sobre `BuscaCancelavel`; novo módulo
     `lib/merge-dados-cnpj.ts` (`mergeDadosEmpresaPorCnpjSst`).
  4. `src/app/(dashboard)/clientes/novo/page.tsx` — `buscarCnpj` refeito
     sobre `BuscaCancelavel` (reaproveitando o módulo de merge já
     existente da ONDA 2).
  5. `src/app/(dashboard)/parceiros/novo/page.tsx` — `buscarCnpj` refeito
     sobre `BuscaCancelavel` (reaproveitando o módulo de merge já
     existente da ONDA 2).
- **Testes novos (P3.1)**:
  - `src/lib/busca-cancelavel.test.ts` — valida explicitamente o descarte
    de uma resposta tardia quando uma busca mais nova já foi iniciada,
    além de cancelamento manual e propagação de erros que não são de
    cancelamento.
  - `src/app/(dashboard)/clientes/[id]/editar/lib/merge-dados-cnpj.test.ts`
    e `src/app/(dashboard)/sst/lib/merge-dados-cnpj.test.ts` — mesmo
    padrão de `clientes/novo/lib/merge-dados-cnpj.test.ts` (ONDA 2):
    preenchimento, fallback de campos nulos e limpeza de dados de uma
    empresa pesquisada anteriormente quando o CNPJ não é encontrado ou há
    erro de rede.
- **Impacto**: nenhuma mudança de regra de negócio — apenas timing/
  cancelamento das requisições e limpeza de campos obsoletos na tela.
- **Testes/build**: `npx vitest run` (49/49 passou, +12 novos testes) e
  `npx next build` concluído com sucesso (mesmos avisos `prisma:error`
  pré-existentes durante a geração de páginas estáticas, sem relação com
  esta mudança — ambiente local sem `DATABASE_URL` válida).
- **Onda**: ONDA 3 (P1.2 ✅ concluído, P3.1 ✅ parcialmente concluído).

### feat: endpoint temporário de diagnóstico — cancelamento de 3 protocolos antigos remanescentes
- **Arquivos**: `src/app/api/admin/diagnostico-cancelamento-temp/route.ts`
  (novo, temporário — removido após a validação, ver entrada abaixo).
- **Motivo**: Vinicius recebeu e-mails diários da Safeweb cobrando envio
  de documentos para os protocolos `1010749376`, `1010766479` e
  `1010749841` — protocolos de teste mais antigos (anteriores à limpeza
  de 10/06), sem pedido correspondente no CertFlow, que nunca foram
  cancelados na Safeweb. Não têm relação com os 4 protocolos já
  cancelados em 11/06 (ver `docs/LIMPEZA_EXECUTADA.md`).
- **Escopo**: endpoint `GET`, protegido por `auth()` + `role === 'ADMIN'`,
  lista fixa de 3 protocolos hardcoded no código, sem aceitar nenhum
  parâmetro externo. Reaproveita `cancelarSolicitacao`/`consultarProtocolo`
  já existentes em `src/lib/safeweb.ts`, mesmo procedimento validado em
  11/06. Não altera nenhum fluxo existente, não é chamado por nenhuma
  tela.
- **Impacto**: nenhum em fluxos existentes — endpoint isolado e de uso
  único, removido após a validação.
- **Risco**: ação de cancelamento na Safeweb (terceiro), possivelmente
  irreversível — só pode ser acionada manualmente pelo Vinicius (ADMIN
  autenticado) acessando a URL. Autorização explícita obtida em
  15/06/2026.
- **Autor**: Vinicius Petri (via Claude Code)

### chore: remoção do endpoint temporário de diagnóstico (cancelamento de 3 protocolos antigos)
- **Arquivos**: `src/app/api/admin/diagnostico-cancelamento-temp/route.ts`
  (removido), `docs/LIMPEZA_EXECUTADA.md`.
- **Motivo**: Vinicius acessou a URL (ADMIN autenticado) e os 3 protocolos
  (`1010749376`, `1010766479`, `1010749841`) foram cancelados com sucesso
  na Safeweb (`cancelamento.ok: true`, "Protocolo não encontrado" na
  consulta posterior — mesmo padrão de 11/06). Pendência registrada e
  encerrada em `docs/LIMPEZA_EXECUTADA.md`.
- **Impacto**: nenhum — endpoint isolado, sem chamadas de nenhuma tela.
- **Risco**: nenhum.
- **Autor**: Vinicius Petri (via Claude Code)

## 12/06/2026

### docs: visão geral do PROJETO 001 — Centro de Inteligência e Automação V&G
- **Arquivo**: `docs/PROJETO_001_CENTRO_INTELIGENCIA_VG.md` (novo).
- **Motivo**: registrar a especificação completa enviada pelo Vinicius
  para o "Centro de Inteligência V&G" — visão de longo prazo em 4 fases
  (Observador, Copiloto, Autopilot de Renovação, Executor Operacional),
  conforme Regra 1 (documentar antes de planejar/implementar).
- **Relação com outros documentos**: definido junto com o Vinicius que
  este documento é o guarda-chuva da visão, e que
  `docs/AGENTE_IA_WHATSAPP.md` (categorização de conversas Digisac) é uma
  peça da Fase 1 deste projeto — sua estrutura de categorização deve ser
  reaproveitada, evitando tabelas/estruturas duplicadas.
- **Mapeamento de infraestrutura reaproveitável** para a Fase 1
  (Observador Operacional): integração Digisac (`src/lib/digisac.ts`,
  webhook — hoje stateless, sem histórico de conversas), Google Agenda
  (`src/lib/google/calendar.ts`, já funcional e retorna AGR/eventos),
  dados Prisma já existentes (`Cliente`, `Certificado`, `Pedido`,
  `Lancamento`, `HistoricoContato`) e padrão de migração
  (`scripts/migrate.js`, `CREATE TABLE IF NOT EXISTS`).
- **Impacto**: nenhum em código/produção. Apenas documentação. Próximo
  passo: plano técnico de implementação da Fase 1 (com análise de
  impacto — Regra 3) para aprovação, a ser retomado em sessão futura.
- **Autor**: Vinicius (via Claude Code).

### feat: reordenação da Dashboard — Controle de Vencimentos acima dos widgets
- **Arquivo**: `src/app/(dashboard)/dashboard/page.tsx`.
- **Motivo**: solicitação do Vinicius para dar mais destaque ao Controle
  de Vencimentos de certificados, posicionando-o antes da grade de
  widgets (Vendas, Financeiro, Agenda, Meta, RFB, Calculadora).
- **Alteração**: bloco `<VencimentosWidget />` (full width) movido para
  antes do `<div>` da grade 3×2 de widgets, na coluna principal da
  Dashboard. Nenhuma alteração nos dados (`getDashboardData`,
  `getVencimentosData`), nos componentes dos widgets ou na lógica
  condicional por perfil — apenas a ordem de exibição.
- **Reversão**: mudança isolada em um commit único — revertível com
  `git revert` deste commit sem efeitos colaterais em outras áreas.
- **Testes**: `npx vitest run` — 37/37 passando. `npx next build` — build
  limpo.
- **Autor**: Vinicius (via Claude Code).

### feat: barra de navegação inferior flutuante no mobile/tablet
- **Arquivos**: `src/components/mobile-bottom-nav.tsx` (novo),
  `src/components/dashboard-shell.tsx`, `src/components/assistente-widget.tsx`.
- **Motivo**: solicitação do Vinicius para adotar, no mobile/tablet, um
  estilo de navegação inferior flutuante (pill, com blur) similar ao do
  Instagram, em vez de depender apenas do drawer lateral.
- **Alteração**: novo componente `MobileBottomNav`, visível apenas em
  `lg:hidden` (mobile/tablet), fixo no rodapé com `safe-area-inset-bottom`,
  com 5 acessos: Início (Dashboard), Agenda, Nova Venda (destaque central),
  Clientes e Menu (abre o drawer lateral existente, com todos os demais
  itens). `dashboard-shell.tsx` passou a renderizar essa barra e adicionou
  `pb-24` ao conteúdo principal no mobile/tablet para o conteúdo não ficar
  escondido atrás da barra. O botão e o painel do assistente ZOE
  (`assistente-widget.tsx`) foram reposicionados no mobile (`bottom-24`/
  `bottom-40`) para não sobrepor a nova barra; o painel também passou a
  ocupar a largura da tela (com margens) em telas pequenas.
- **Impacto**: apenas visual/layout no mobile/tablet (`lg:hidden`). Sidebar
  desktop (`lg:flex`) e drawer lateral mobile (acessível pelo botão "Menu"
  da nova barra) não foram alterados em sua lógica. Nenhuma alteração em
  rotas, autenticação ou regras de negócio.
- **Reversão**: mudança isolada em um commit único — revertível com
  `git revert` deste commit sem efeitos colaterais em outras áreas.
- **Testes**: `npx vitest run` — 37/37 passando (sem novos testes, mudança
  é apenas de UI). `npx next build` — build limpo.
- **Autor**: Vinicius (via Claude Code).

### análise: buscarCnpj em SST (ONDA 2 — item "não verificado") — risco residual aceitável, baixa prioridade
- **Arquivo analisado**: `src/app/(dashboard)/sst/page.tsx` (`buscarCnpj()`,
  linhas 209-228).
- **Motivo da análise**: item "não verificado" do mapa de
  `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) / `docs/ROADMAP_CORRECOES.md`
  (P1.1).
- **Observação**: o mesmo modal/formulário atende dois modos — "novo lead"
  (`abrirNovo`, formulário vazio) e "editar lead" (`abrirEditar`, pré-carregado
  com dados reais). Em caso de falha do `buscarCnpj`, nenhum dos dois modos
  limpa os campos `empresa`/`nome` preenchidos por uma busca anterior.
- **Decisão**: nenhuma alteração de código nesta etapa. Uma correção análoga
  ao item #9 exigiria diferenciar os dois modos do mesmo formulário, o que
  aumenta a complexidade de forma desproporcional ao risco: trata-se de leads
  comerciais internos do módulo SST, sem impacto em certificados, integração
  Safeweb ou dados financeiros. Classificado como risco residual aceitável,
  de baixa prioridade, a ser tratado em uma ONDA futura caso o módulo SST
  ganhe relevância operacional maior.
- **Autor**: Vinicius (via Claude Code).

### análise: buscarCnpj em Editar Parceiro (ONDA 2 — item "não verificado") — não aplicável
- **Arquivo analisado**: `src/app/(dashboard)/parceiros/[id]/editar/page.tsx`.
- **Motivo da análise**: item "não verificado" do mapa de
  `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) / `docs/ROADMAP_CORRECOES.md`
  (P1.1).
- **Decisão**: encerrado como não aplicável. A página não possui nenhuma
  função `buscarCnpj()` nem consulta a `/api/cnpj/...` — o único uso
  relacionado a CNPJ é `formatarCNPJ`, utilizado apenas para exibir o CNPJ de
  clientes vinculados em uma tabela somente leitura. O padrão de vazamento de
  dados entre consultas não se aplica a esta tela.
- **Autor**: Vinicius (via Claude Code).

### análise: buscarCep em Editar Cliente (ONDA 2 — item #8) — sem ação necessária
- **Arquivo analisado**: `src/app/(dashboard)/clientes/[id]/editar/page.tsx`
  (`buscarCep()`, linhas 142-160).
- **Motivo da análise**: item #8 do mapa de `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
  (seção 7) / `docs/ROADMAP_CORRECOES.md` (P1.1).
- **Diferença em relação ao item #6**: assim como no item #7, "Editar
  Cliente" é uma tela pré-carregada com os dados reais do cliente já salvos
  no banco. Limpar ou restaurar um snapshot dos campos de endereço em caso de
  falha do `buscarCep` arriscaria apagar dados do cliente ou desfazer edições
  manuais feitas pelo usuário durante a edição.
- **Decisão**: nenhuma alteração de código. Em caso de CEP não encontrado
  (`data.erro`) ou erro de rede, o código atual já não chama `setForm` —
  os campos de endereço permanecem como estavam, preservando os dados do
  cliente e qualquer edição manual em andamento. Esse comportamento já é o
  desejado, na mesma linha da decisão do item #7.
- **Autor**: Vinicius (via Claude Code).

### fix: vazamento de dados na busca de CNPJ (Novo Parceiro, ONDA 2 — item #9)
- **Arquivos**: `src/app/(dashboard)/parceiros/novo/page.tsx`,
  `src/app/(dashboard)/parceiros/novo/lib/merge-dados-cnpj.ts` (novo),
  `src/app/(dashboard)/parceiros/novo/lib/merge-dados-cnpj.test.ts` (novo).
- **Motivo**: conforme `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) e
  `docs/ROADMAP_CORRECOES.md` (P1.1), `buscarCnpj()` em "Novo Parceiro" tinha
  o mesmo padrão do item #6: em caso de CNPJ não encontrado ou erro de
  consulta, os campos `razaoSocial`, `email` e `telefone` preenchidos por uma
  busca anterior permaneciam na tela e podiam ser salvos vinculados a um CNPJ
  diferente do pesquisado por último.
- **Alteração**: novo módulo `lib/merge-dados-cnpj.ts` (com testes), com
  `mergeDadosParceiroPorCnpj(f, data)`: no sucesso, mantém exatamente a lógica
  anterior (`data.campo ?? f.campo`); em caso de `data === null` (CNPJ não
  encontrado ou erro de rede), os 3 campos voltam para `''` em vez de manter
  o valor pesquisado anteriormente.
- **Impacto**: nenhuma alteração no caminho de sucesso da consulta de CNPJ.
  Demais campos do formulário (nome, tipo, dados bancários, observações etc.)
  não são afetados.
- **Testes**: `npx vitest run` — 37/37 passando (4 novos casos em
  `merge-dados-cnpj.test.ts`). `npx next build` — build limpo.
- **Autor**: Vinicius (via Claude Code).

### fix: retenção indevida de documento e e-mail em revalidações sucessivas (Emissão Online, ONDA 2 — item #10)
- **Arquivos**: `src/app/(dashboard)/pedidos/nova-venda/emissao-online.tsx`,
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-emissao-online.ts` (novo),
  `src/app/(dashboard)/pedidos/nova-venda/lib/merge-dados-emissao-online.test.ts` (novo).
- **Motivo**: conforme `docs/AUDITORIA_GERAL_DO_SISTEMA.md` (seção 7) e
  `docs/ROADMAP_CORRECOES.md` (P1.1), `validar()` atualizava `documento` e
  `email` apenas com `if (...)` sem `else`. Ao validar um certificado, voltar
  ("Anterior") e validar outro certificado de um cliente diferente cuja
  resposta da Receita/Safeweb não retornasse `email` e/ou CPF/CNPJ, os
  valores do cliente validado anteriormente permaneciam na tela — e podiam
  ser enviados em `gerarProtocolo()` no pedido do novo cliente.
- **Alteração**: novo módulo `lib/merge-dados-emissao-online.ts` (com
  testes), com `mergeDadosEmissaoOnline(ext)`: substitui sempre
  `nome`/`documento`/`email` pelo resultado da validação atual — se
  `ext.email`/`ext.cpf`/`ext.cnpj` vierem vazios, os campos correspondentes
  voltam para `''` em vez de manter o valor da validação anterior.
- **Impacto**: nenhuma mudança de layout, na integração Safeweb
  (`/api/safeweb/validar-cert-online`) ou em `gerarProtocolo()`/
  `/api/pedidos/nova-venda`. Nenhuma alteração nos retornos antecipados por
  série/produto não informados ou validação com erro (pontos que não levam
  à etapa "Dados da Renovação"). Validações bem-sucedidas com dados
  completos mantêm exatamente o comportamento atual.
- **Testes**: `npx vitest run` — 33/33 passando (5 novos casos em
  `merge-dados-emissao-online.test.ts`). `npx next build` — build limpo.
- **Autor**: Vinicius (via Claude Code).

### análise: buscarCnpj em Editar Cliente (ONDA 2 — item #7) — sem ação necessária
- **Arquivo analisado**: `src/app/(dashboard)/clientes/[id]/editar/page.tsx`
  (`buscarCnpj()`, linhas 118-140).
- **Motivo da análise**: item #7 do mapa de `docs/AUDITORIA_GERAL_DO_SISTEMA.md`
  (seção 7) / `docs/ROADMAP_CORRECOES.md` (P1.1).
- **Diferença em relação ao item #6**: em "Novo Cliente" o formulário nasce
  vazio, então limpar os campos em caso de falha é seguro. Em "Editar
  Cliente" o formulário é pré-carregado com os dados reais do cliente já
  salvos no banco (`useEffect` de carregamento). Limpar ou restaurar um
  snapshot em caso de falha do `buscarCnpj` arriscaria apagar dados do
  cliente ou desfazer edições manuais feitas pelo usuário durante a edição.
- **Decisão**: nenhuma alteração de código. Em caso de falha (CNPJ não
  encontrado ou erro de rede), o código atual já não chama `setForm` —
  apenas exibe `setErro(...)`, preservando tanto os dados do cliente quanto
  qualquer edição manual em andamento. Esse comportamento já é o desejado.
- **Risco residual aceito**: cenário composto em que uma busca de CNPJ B é
  bem-sucedida (sobrescrevendo razão social/endereço com dados da Empresa
  B) e uma busca seguinte falha — os dados da Empresa B permaneceriam na
  tela e poderiam ser salvos no registro do cliente A. Considerado menos
  grave que o risco de perda de dados/edições introduzido por limpeza ou
  restauração automática nesta tela.
- **Autor**: Vinicius (via Claude Code).

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

### docs: arquitetura do Agente IA WhatsApp (cliente)
- **Arquivos**: `docs/AGENTE_IA_WHATSAPP.md` (novo).
- **Motivo**: planejamento de um agente de IA para conversar diretamente
  com clientes da V&G via WhatsApp/Digisac (triagem, FAQ, status de
  pedido/certificado e, em fases futuras, agendamento e cobrança), sem usar
  a IA paga do Digisac. Conforme Regra 1, a documentação é criada antes de
  qualquer alteração de código.
- **Impacto**: nenhum em código/produção nesta etapa. O webhook
  `/api/digisac/webhook` (fluxo admin) não foi alterado (Regra 2). O
  documento define escopo de dados, regras de escalonamento para humano,
  novas tabelas (`agente_ia_conversas`, `agente_ia_cobranca_aprovacao`) e
  fases de rollout, que serão implementadas em etapas futuras com sua
  própria análise de impacto.
- **Autor**: Vinicius (via Claude Code).

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
