# Auditoria Geral do Sistema — CertFlow

> Realizada em 10/06/2026, conforme Regra 9 (Auditoria Contínua) da
> [Governança do ERP V&G](./GOVERNANCA.md). Documento somente de leitura —
> **nenhum código foi alterado** nesta auditoria.

Esta auditoria mapeia o estado atual do sistema, lacunas de documentação,
riscos técnicos, de regressão e de LGPD, com foco especial em padrões de
vazamento de dados entre clientes (tema do bug corrigido hoje em
`merge-dados-pf.ts`).

---

## 1. Funcionalidades implementadas

Com base em `docs/MAPA_DO_SISTEMA.md`, `src/app/(dashboard)/` e `src/app/api/`,
organizado por área:

| Área | Descrição curta | Principais arquivos/rotas |
|---|---|---|
| **Autenticação (Auth)** | Login interno (NextAuth/Credentials) e middleware de proteção de rotas | `src/lib/auth.ts`, `src/lib/auth-edge.ts`, `src/proxy.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login` |
| **Dashboard** | KPIs, painel por AGR, widgets financeiros, agenda, e-mail | `src/app/(dashboard)/dashboard/*`, `src/app/api/dashboard/*` |
| **Clientes** | Cadastro, edição, listagem, importação e detalhe de clientes PF/PJ | `src/app/(dashboard)/clientes/*`, `src/app/api/clientes/*`, `src/app/api/clientes/importar` |
| **Parceiros e Fornecedores** | Cadastro de parceiros indicadores (com portal próprio), comissões, contatos e fornecedores | `src/app/(dashboard)/parceiros/*`, `src/app/(dashboard)/fornecedores/*`, `src/app/api/parceiros/*` |
| **Pedidos/Vendas** | Núcleo: nova venda, geração automática de protocolo Safeweb, monitoramento, detalhe, recibo, orçamento, RFB | `src/app/(dashboard)/pedidos/*`, `src/app/(dashboard)/recibo`, `src/app/(dashboard)/orcamento`, `src/app/api/pedidos/*`, `src/lib/safeweb.ts`, `src/app/api/safeweb/*` |
| **Certificados** | Visualização/gestão de certificados emitidos e renovação | `src/app/(dashboard)/certificados`, `src/app/api/certificados/[id]/route.ts`, `src/app/api/certificados/[id]/renovar` |
| **Renovações** | Lista de vencimentos, notificação manual via WhatsApp/e-mail, jobs automáticos | `src/app/(dashboard)/renovacoes/*`, `src/app/api/renovacoes/*`, `src/app/api/jobs/processar-emails`, `src/app/api/jobs/processar-whatsapp` |
| **Financeiro/Lançamentos** | Contas a receber/pagar, baixa, comprovantes, cobrança Inter, conciliação, relatório de produção | `src/app/(dashboard)/financeiro/*`, `src/app/(dashboard)/relatorios`, `src/app/api/financeiro/*`, `src/lib/inter.ts`, `src/app/api/inter/*` |
| **Agenda** | Calendário de atendimentos integrado ao Google Calendar (Apps Script + OAuth2) | `src/app/(dashboard)/agenda/*`, `src/app/api/agenda/*`, `src/app/api/google/*`, `src/lib/google/calendar.ts` |
| **SST (leads)** | Kanban de prospecção de leads para serviços de SST | `src/app/(dashboard)/sst/page.tsx`, `src/app/api/sst/leads/*` |
| **Notícias/Comunicados** | Avisos internos e externos, visíveis também no portal do parceiro | `src/app/(dashboard)/noticias/*`, `src/app/api/noticias/*`, `src/app/portal/(auth)/noticias` |
| **Conteúdo Social (IA)** | Geração de posts (headline/legenda/hashtags) via Claude, calendário editorial, aprovação | `src/app/(dashboard)/conteudo/page.tsx`, `src/app/api/social/gerar`, `src/app/api/social/posts/*`, `src/app/api/jobs/social-media` |
| **Biometria** | Consulta biométrica de CPF (local/global) antes da emissão | `src/app/(dashboard)/biometria/page.tsx`, `src/app/api/biometria/route.ts` |
| **Configurações/Admin** | Modelos de certificado, templates de e-mail, dados da empresa, base de conhecimento da IA, auditoria, perfis de permissão, usuários | `src/app/(dashboard)/configuracoes/*`, `src/app/(dashboard)/usuarios/*`, `src/app/api/configuracoes/*`, `src/app/api/usuarios/*`, `src/app/api/auditoria`, `src/lib/permissoes-estrutura.ts`, `src/lib/permissions.ts`, `src/lib/audit.ts` |
| **Admin/Manutenção** | Limpeza de dados de teste, diagnóstico de protocolo, pedidos-teste | `src/app/(dashboard)/admin/limpar-testes`, `src/app/api/admin/diagnostico-protocolo`, `src/app/api/admin/limpar-testes`, `src/app/api/admin/pedidos-teste` |
| **Assistente IA interno (ZOE)** | Chat com IA (Claude) com tool-use sobre dados internos, extração de PDFs | `src/app/api/assistente/chat`, `src/app/api/assistente/conhecimento`, `src/app/api/assistente/extrair-pdf`, `src/app/(dashboard)/configuracoes/assistente` |
| **Portal do Parceiro** | Dashboard, certificados da carteira, relatórios, notícias, regulamento, cadastro de cliente, ZOE restrita | `src/app/portal/*`, `src/lib/portal-session.ts`, `src/app/api/portal/*` |
| **Perfil do usuário** | Edição de dados próprios (foto, WhatsApp, senha) | `src/app/(dashboard)/perfil`, `src/app/api/perfil` |
| **Utilitários diversos** | Calculadora de deslocamento, consulta CNPJ/CPF, heartbeat de sessão, horário do sistema, webmail, upload, bot Telegram, Digisac (WhatsApp) | `src/app/api/calculadora/deslocamento`, `src/app/api/cnpj/[cnpj]`, `src/app/api/cpf/[cpf]`, `src/app/api/sessao/heartbeat`, `src/app/api/sistema/horario`, `src/app/api/webmail/*`, `src/app/api/upload`, `src/app/api/telegram/webhook`, `src/app/api/digisac/webhook`, `src/lib/digisac.ts` |
| **Notificações** | Notificações gerais e de pedidos pendentes | `src/app/api/notificacoes`, `src/app/api/pedidos/notificacoes-pendentes`, `src/app/api/pedidos/[id]/notificar` |
| **Endpoints de teste/diagnóstico** | Rotas de teste (auth, db, email, whatsapp, safeweb) usadas em diagnóstico | `src/app/api/test-auth`, `src/app/api/test-db`, `src/app/api/test-email`, `src/app/api/test-whatsapp`, `src/app/api/safeweb/testar` |

---

## 2. Funcionalidades sem documentação

As seguintes áreas/rotas existem no código mas **não têm documentação
dedicada** em `/docs` (violação potencial da Regra 1):

| Área/Rota | Arquivo | Observação |
|---|---|---|
| Certificados (CRUD/renovar) | `src/app/(dashboard)/certificados/page.tsx`, `src/app/api/certificados/[id]/route.ts`, `.../renovar/route.ts` | Citado só indiretamente no módulo de vendas |
| Admin — Limpeza de testes / pedidos-teste / diagnóstico de protocolo | `src/app/(dashboard)/admin/limpar-testes`, `src/app/api/admin/limpar-testes`, `src/app/api/admin/pedidos-teste`, `src/app/api/admin/diagnostico-protocolo` | Existe doc da limpeza pontual (`LIMPEZA_*`), mas não como módulo permanente |
| Notificações (gerais) | `src/app/api/notificacoes/route.ts`, `src/app/api/pedidos/notificacoes-pendentes/route.ts`, `src/app/api/pedidos/[id]/notificar/route.ts` | Sem seção própria |
| Perfil do usuário | `src/app/(dashboard)/perfil`, `src/app/api/perfil/route.ts` | Não aparece no MAPA |
| Sessão / Heartbeat | `src/app/api/sessao/heartbeat/route.ts` | Endpoint não documentado |
| Sistema/Horário | `src/app/api/sistema/horario/route.ts` | Sem documentação |
| Calculadora de Deslocamento | `src/app/api/calculadora/deslocamento/route.ts` | Citada como widget, não como funcionalidade própria |
| `pedidos/novo` (rota distinta de `nova-venda`) | `src/app/(dashboard)/pedidos/novo/` | Não mencionada no MAPA — checar se é rota ativa ou legado |
| Buscar série A3 | `src/app/api/pedidos/buscar-serie-a3/route.ts` | Sem documentação |
| Liberar emissão online | `src/app/api/pedidos/[id]/liberar-emissao-online/route.ts` | Citada como funcionalidade, sem detalhamento técnico |
| Endpoints de teste em produção | `src/app/api/test-auth`, `test-db`, `test-email`, `test-whatsapp` | Não documentados — ver risco crítico na seção 6 |
| Configurações de permissões (API) | `src/app/api/configuracoes/permissoes/route.ts` | Sem doc do contrato da API |
| Auditoria (API) | `src/app/api/auditoria/route.ts`, `src/lib/audit.ts` | Sem doc sobre o que é registrado/retenção |
| Categorias financeiras (API) | `src/app/api/financeiro/categorias/route.ts`, `src/lib/financeiro-config.ts` | Mencionado de forma genérica |
| Rate limiting | `src/lib/rate-limit.ts` | Sem doc de regras (limites, janelas, reset) |

---

## 3. Bugs potenciais

### 3.1 Endpoint CNPJ sem autenticação — ✅ Corrigido em 10/06/2026
- ~~**Arquivo**: `src/app/api/cnpj/[cnpj]/route.ts:4`~~
- ~~Endpoint GET retorna dados sensíveis (CPF mascarado de sócios, e-mail,
  telefone, endereço) **sem verificar sessão**. Em contraste,
  `src/app/api/cpf/[cpf]/route.ts:12` exige `auth()`.~~ Adicionada a mesma
  checagem `auth()` de `/api/cpf/[cpf]`, retornando `401` para requisições
  sem sessão. Ver `docs/changelog.md`.

### 3.2 Endpoints de teste expostos em produção
- ~~`src/app/api/test-db/route.ts:11-13` — em caso de erro, retorna
  `db_url_raw: process.env.DATABASE_URL` **completo** (credenciais do
  banco).~~ **Corrigido em 10/06/2026** — endpoint removido. Ver
  [docs/endpoints-removidos.md](./endpoints-removidos.md) e
  `docs/changelog.md`.
- `src/app/api/test-auth/route.ts:13,19` — testa se a senha
  `certflow@2024` é válida para `admin@certflow.com.br`, sem autenticação
  (permite força bruta).
- `src/app/api/test-email`, `src/app/api/test-whatsapp` — também sem
  autenticação.

### 3.3 Chave de diagnóstico hardcoded — ✅ Corrigido em 10/06/2026
- ~~`src/app/api/admin/diagnostico-protocolo/route.ts:10` — bypass de
  autenticação via `chaveDiag === 'cf-diag-2026-vp-temp'` hardcoded no
  código-fonte (mesmo padrão usado nos endpoints temporários criados/
  removidos hoje). Quem souber a string acessa dados de até 30 pedidos com
  CPF/CNPJ/data de nascimento/endereço.~~ Bypass por chave removido,
  mantida apenas a checagem `auth()` + `role === 'ADMIN'` já existente.
  Endpoint preservado para uso futuro de diagnóstico, agora restrito a
  administradores autenticados. Ver `docs/changelog.md`.

### 3.4 `catch {}` silenciosos sem feedback ao usuário
- `src/app/(dashboard)/clientes/novo/page.tsx:109,125,137,368` e
  `src/app/(dashboard)/clientes/[id]/editar/page.tsx:138,158` — falhas em
  `buscarCep()`/`buscarCnpj()` são engolidas sem mensagem nem log; usuário
  não percebe que o preenchimento automático falhou.

### 3.5 Race condition na busca de CPF no wizard (sem debounce)
- `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx:371-403` —
  `buscarClientePorCPF()` dispara no `onBlur` sem debounce/cancelamento.
  Se o usuário digitar um CPF, sair do campo, voltar e digitar outro CPF
  rapidamente, a resposta da primeira consulta pode chegar **depois** da
  segunda e sobrescrever os dados na tela com os do CPF errado — um vetor
  adicional para o mesmo tipo de vazamento corrigido hoje.

---

## 4. Código duplicado

### 4.1 Formatação de CPF/CNPJ reimplementada
- **Definição única**: `src/lib/utils.ts:35-40` (`formatarCPF`,
  `formatarCNPJ`).
- **Reimplementações** (10+ ocorrências): `clientes/novo/page.tsx:43-48`,
  `clientes/[id]/editar/page.tsx:43-48`, `parceiros/novo/page.tsx:35-40`,
  `parceiros/[id]/editar/page.tsx`, `pedidos/nova-venda/wizard.tsx:85-87`,
  `pedidos/nova-venda/emissao-online.tsx:31-32`,
  `dashboard/widget-rfb.tsx:14-29` (`mascaraCPF`/`mascaraCNPJ`),
  `biometria/page.tsx:7-13` (`fmtCpf`), `sst/page.tsx:51-55`
  (`formatarCNPJ`), `fornecedores/novo/page.tsx`.
- **Impacto**: mudança na regra de formatação/validação precisa ser
  replicada em 10+ arquivos.

### 4.2 Formatação de telefone duplicada
- **Definição única**: `src/lib/utils.ts:43-47` (`formatarTelefone`).
- **Reimplementações**: `clientes/novo/page.tsx:49-53`,
  `clientes/[id]/editar/page.tsx:49-53`, `parceiros/novo/page.tsx:41-45`,
  `widget-rfb.tsx` (máscara própria).

### 4.3 Lógica de mesclagem DDD+celular duplicada
- **Definição única e testada**:
  `pedidos/nova-venda/lib/merge-dados-pf.ts:12-21`
  (`telefoneFromCelular`).
- **Reimplementação idêntica**: `wizard.tsx:92-101`, usada em 3 pontos
  diferentes do mesmo arquivo.

### 4.4 Consulta de CEP via ViaCEP duplicada
- `wizard.tsx` `buscarCep()` (453-471), `clientes/novo/page.tsx`
  `buscarCep()` (116-141), `clientes/[id]/editar/page.tsx` `buscarCep()`
  (142-160) — três implementações com pequenas diferenças de
  loading/limpeza de campos.

---

## 5. Riscos de regressão

### 5.1 Wizard de nova venda — estado complexo e acoplado
- `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx` (~1150 linhas), com
  `WizardDados` contendo 25+ campos, 5 steps e fluxos PF/PJ entrelaçados
  (ex.: validação condicional de step 3→5 para PF vs 3→4 para PJ, linhas
  ~212-218). Sem testes além de `merge-dados-pf.test.ts` (que cobre só uma
  função).

### 5.2 Funções de consulta CPF/CNPJ com lógica duplicada e parcialmente protegida
- Apenas `validarPF()` usa a função pura testada
  `mergeDadosResponsavelPF()`. `buscarClientePorCPF()`, `validarCNPJ()` e
  `autoPreencherPorCNPJ()` (todas em `wizard.tsx`) usam lógica inline com
  padrão `campo ?? d.campo`, sem testes — uma mudança na regra de negócio
  exige atualizar 4 lugares manualmente (alto risco de esquecer um).

### 5.3 Endpoint `/api/cnpj/[cnpj]` sem autenticação — refatoração sensível
- Usado por `clientes/novo`, `clientes/[id]/editar`, `parceiros/novo`,
  `parceiros/[id]/editar` e `wizard.tsx` (`validarCNPJ`). Adicionar
  autenticação corrige o risco da seção 3.1/6.2, mas precisa de
  coordenação para não quebrar todos esses fluxos de uma vez.

### 5.4 Lista de AGRs (Ana/Arlen/Vinicius/Laryssa) mantida em 3 lugares
- `src/lib/utils.ts:65-71` (`deriveAgr`), `wizard.tsx`
  (`AGR_OPTIONS` inline) e `emissao-online.tsx` (`AGR_OPTIONS` inline).
  Já causou um bug real hoje (mismatch entre AGRs do wizard e do enum de
  `/api/agenda`, corrigido no commit `07d67bc`) — risco de recorrência se
  um novo AGR for adicionado sem atualizar os 3 pontos + o enum da agenda.

---

## 6. Riscos de LGPD

### 6.1 Endpoint de diagnóstico expõe dados pessoais com proteção fraca
- `src/app/api/admin/diagnostico-protocolo/route.ts:43-47` retorna CPF,
  CNPJ, DDD, celular, data de nascimento, CEP e endereço completo de até
  30 clientes, com bypass via chave hardcoded (ver 3.3).

### 6.2 Endpoint CNPJ retorna dados pessoais sem autenticação — ✅ Corrigido em 10/06/2026
- ~~`src/app/api/cnpj/[cnpj]/route.ts:53-57` — array `qsa` com
  `cpfMascarado` de sócios, acessível publicamente.~~ Análise mais
  aprofundada (10/06/2026) mostrou risco maior do que o registrado
  originalmente: o endpoint também consultava `prisma.cliente` e
  retornava, sem máscara, CPF, data de nascimento, e-mail, celular,
  endereço completo, PIS/NIS e responsável de clientes já cadastrados,
  para qualquer requisição sem login. Corrigido com a mesma checagem
  `auth()` de `/api/cpf/[cpf]`. Ver `docs/changelog.md`.

### 6.3 Log de dados pessoais em produção
- `src/app/api/pedidos/nova-venda/route.ts:39-40` —
  `console.log('[Safeweb][diag] usuário logado', { id, nome, email, role })`
  grava nome/e-mail do usuário interno em logs de servidor.

### 6.4 Dados sensíveis trafegando do widget RFB
- `src/app/(dashboard)/dashboard/widget-rfb.tsx:82-87` — CPF/CNPJ e data
  de nascimento enviados via fetch para validação na Receita. Tráfego é
  HTTPS (Vercel), mas vale revisar se há necessidade de manter esses dados
  em algum log/estado por mais tempo que o necessário.

### 6.5 Endpoint de teste expõe credenciais de banco — ✅ Corrigido em 10/06/2026
- ~~`src/app/api/test-db/route.ts:12-13` — em erro, retorna
  `process.env.DATABASE_URL` completo (usuário/senha/host do Postgres).
  Crítico mesmo não envolvendo diretamente dados de clientes, pois uma
  credencial vazada dá acesso a TODOS os dados pessoais do banco.~~
  Endpoint removido (ver [docs/endpoints-removidos.md](./endpoints-removidos.md)
  e `docs/changelog.md`).

---

## 7. Campos que podem vazar dados entre clientes

O bug corrigido hoje (commit `c3e9803`, função `mergeDadosResponsavelPF` em
`pedidos/nova-venda/lib/merge-dados-pf.ts`) resolveu **um** ponto de
vazamento. O mesmo padrão (`campo ?? estadoAnterior.campo`, ou
`if (novoValor) setState(...)` sem `else` para limpar) foi encontrado em
outros pontos, ainda **sem correção**:

| Local | Função | Campos em risco | Proteção atual |
|---|---|---|---|
| `wizard.tsx` | `buscarClientePorCPF()` (371-403) | nome, e-mail, telefone, endereço, CEP, PIS/NIS, clienteId | Nenhuma |
| `wizard.tsx` | `validarCNPJ()` (246-310) | e-mail, telefone, endereço da empresa | Nenhuma |
| `wizard.tsx` | `autoPreencherPorCNPJ()` (312-368) | praticamente todos os campos PJ + responsável | Nenhuma |
| `wizard.tsx` | `buscarCep()` (453-471) | logradouro, bairro, município, estado | Nenhuma |
| `clientes/novo/page.tsx` | `buscarCnpj()` (86-114) | razão social, fantasia, e-mail, telefone, endereço | Nenhuma |
| `clientes/novo/page.tsx` | `buscarCep()` (116-141) | logradouro, bairro, cidade, estado | ✅ Limpa campos no `onChange` do CEP |
| `clientes/[id]/editar/page.tsx` | `buscarCnpj()` (118-140) | razão social, fantasia, e-mail, telefone, endereço | Nenhuma |
| `clientes/[id]/editar/page.tsx` | `buscarCep()` (142-160) | logradouro, bairro, cidade, estado | Nenhuma |
| `pedidos/nova-venda/emissao-online.tsx` | `validar()` (91-119) | nome, documento, e-mail (padrão `if` sem `else`) | Nenhuma |
| `parceiros/novo/page.tsx` | `buscarCnpj()` (66-86) | razão social, e-mail, telefone | Nenhuma |
| `parceiros/[id]/editar/page.tsx` | provável `buscarCnpj()` análogo | (a confirmar) | Não verificado nesta auditoria |
| `sst/page.tsx` | busca de CNPJ no modal de lead | campos de empresa do lead | Não verificado nesta auditoria |

**Conclusão**: a correção de hoje cobre 1 de pelo menos 10 pontos com o
mesmo padrão de risco. Os 2 itens marcados "não verificado" precisam de
checagem antes de afirmar se têm ou não o problema (Regra 7 — não supor).

---

## 8. Integrações críticas

| Integração | Implementação | Variáveis de ambiente | Se falhar |
|---|---|---|---|
| **Safeweb PSS** (núcleo) | `src/lib/safeweb.ts`, `src/app/api/pedidos/nova-venda/route.ts`, `src/app/api/safeweb/webhook`, `consulta-previa`, `validar-cert-online`, `src/app/api/biometria/route.ts` | `SAFEWEB_IDENTIFICADOR`, `SAFEWEB_SEGREDO`, `SAFEWEB_CODIGO_AR`, `SAFEWEB_CNPJ_AR`, `SAFEWEB_BASE_URL`, `SAFEWEB_ATTENDANCE_PLACE_ID`, `NEXTAUTH_URL` | Nenhuma venda gera protocolo (parada total do core); webhook não atualiza status se `NEXTAUTH_URL` mudar |
| **Hope Portal (Safeweb)** | `src/lib/safeweb.ts` (`integracaoHope`) | `SAFEWEB_ATTENDANCE_PLACE_ID` | Pedidos de videoconferência ficam sem link de documentos |
| **Banco Inter** | `src/lib/inter.ts`, `src/app/api/inter/cobranca`, `src/app/api/inter/webhook` | `INTER_CERT_B64`, `INTER_KEY_B64`, `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET` | Geração de boleto/PIX falha (mTLS); sem webhook, pagamentos exigem baixa manual |
| **Google Calendar (OAuth2 direto)** | `src/lib/google/calendar.ts`, `src/app/api/google/route.ts`, `.../callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL` | Tokens guardados em sessão (não no banco); sem refresh automático |
| **Google Apps Script (Agenda)** | `src/app/api/agenda/route.ts` | `APPS_SCRIPT_URL`, `APPS_SCRIPT_TOKEN` | Tela de Agenda fica bloqueada, sem fallback |
| **Digisac (WhatsApp)** | `src/lib/digisac.ts`, `renovacoes/notificar-whatsapp`, `jobs/processar-whatsapp`, `digisac/webhook` | `DIGISAC_URL`, `DIGISAC_TOKEN`, `DIGISAC_CHANNEL_ID`, `BOT_ADMIN_NUMERO` | Notificações de renovação por WhatsApp não saem; chatbot fica mudo |
| **SMTP / E-mail (Nodemailer)** | `src/lib/email/transporte.ts`, `enviar.ts`, `templates.ts`, jobs de e-mail/relatório | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | E-mails de vencimento/nutrição/pós-emissão e relatório diário param |
| **Webmail IMAP (Roundcube)** | `src/app/api/webmail/unread`, `.../autologin` | `WEBMAIL_PASSWORD` | Widget de e-mails não lidos para; autologin do webmail falha |
| **Anthropic Claude (SDK)** | `assistente/chat`, `assistente/extrair-pdf`, `social/gerar`, `portal/zoe`, `telegram/webhook`, `digisac/webhook` | `ANTHROPIC_API_KEY` | ZOE (interna e portal), extração de PDF, geração de posts e bots ficam inoperantes |
| **Telegram Bot** | `telegram/webhook`, `jobs/relatorio-atividade`, `social/gerar` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `CANVA_TEMPLATE_FEED`, `CANVA_TEMPLATE_STORIES` | Bot para de responder; notificações de post/relatório mensal não saem |
| **Vercel Blob** | `src/app/api/upload/route.ts` | `BLOB_READ_WRITE_TOKEN` | Upload de comprovantes falha — afeta baixa de lançamentos |
| **BrasilAPI / CNPJ.ws (fallback)** | `cnpj/[cnpj]`, `rfb/responsavel` | nenhuma (públicas) | Preenchimento automático de CNPJ/QSA falha |
| **IBGE** | `src/lib/safeweb.ts` (`buscarCodigoIbge`) | nenhuma (pública) | Falha no `CidadeCodigo`/`UFCodigo` do payload Safeweb — pode quebrar criação do protocolo |
| **ViaCEP / Nominatim / OSRM** | `calculadora/deslocamento` | nenhuma (públicas) | Calculadora de deslocamento falha ou erra a distância |
| **ReceitaWS (CPF)** | `cpf/[cpf]/route.ts` | `RECEITAWS_TOKEN` (opcional) | Sem token, sistema usa dados do banco sem checar a RFB |
| **NextAuth.js / Portal Session** | `src/lib/auth.ts`, `auth-edge.ts`, `portal-session.ts`, `src/proxy.ts` | `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL` | Bloqueio total de acesso (interno e portal do parceiro) |
| **Vercel Cron** | `vercel.json` + `src/app/api/jobs/*` | `AUTH_SECRET` | Jobs diários (e-mail, WhatsApp, relatório, social media) não disparam |

---

## 9. Arquivos críticos do sistema

| Arquivo | Por que é crítico |
|---|---|
| `src/lib/safeweb.ts` | Toda comunicação com a Safeweb (auth JWT, protocolo, biometria, Hope Portal) — núcleo do negócio |
| `src/app/api/pedidos/nova-venda/route.ts` | Orquestra o fluxo completo de venda (cliente → produto → Safeweb → agenda → financeiro) |
| `src/app/api/safeweb/webhook/route.ts` | Único canal automático de atualização de status dos pedidos |
| `docs/protocolo.md` | Regra de negócio do fallback `data ??` na resposta da Safeweb — base para qualquer mudança no fluxo de protocolo |
| `src/lib/prisma.ts` | Cliente Prisma compartilhado — falha derruba 100% das funcionalidades com banco |
| `src/lib/auth.ts` / `auth-edge.ts` / `src/proxy.ts` | Autenticação e middleware — falha bloqueia todo acesso interno |
| `src/lib/portal-session.ts` | Autenticação do portal do parceiro |
| `src/lib/inter.ts` + `src/app/api/inter/webhook/route.ts` | Geração de cobranças e confirmação automática de pagamento |
| `src/lib/email/enviar.ts` + `transporte.ts` | Função central de envio de e-mail (renovações, jobs, relatórios) |
| `src/lib/digisac.ts` | Função central de envio de WhatsApp |
| `src/app/api/jobs/*` | Pontos de entrada dos crons Vercel (renovações, relatórios, social media) |
| `src/lib/permissoes-estrutura.ts` + `permissions.ts` | Controle de acesso por role — erro pode expor dados ou bloquear operadores |
| `src/lib/audit.ts` + `src/app/api/auditoria/route.ts` | Registro de auditoria — exigido pela Governança |
| `src/lib/rate-limit.ts` | Proteção do login contra força bruta |
| `src/app/api/financeiro/lancamentos/[id]/baixa` e `comprovante` | Baixa de pagamentos e upload de comprovantes |
| `vercel.json` | Define todos os agendamentos de cron — erro aqui interrompe automações silenciosamente |

---

## 10. Recomendações prioritárias

Ordenadas por risco × esforço, sem alterar nada até aprovação (Regra 2):

1. **CRÍTICO — Remover ou proteger os endpoints de teste em produção**
   (`/api/test-db`, `/api/test-auth`, `/api/test-email`,
   `/api/test-whatsapp`). `test-db` vaza a `DATABASE_URL` completa em
   caso de erro; `test-auth` permite testar senha do admin sem auth.
   - ✅ `/api/test-db` removido em 10/06/2026 (ver
     [docs/endpoints-removidos.md](./endpoints-removidos.md)).
   - Pendentes: `/api/test-auth`, `/api/test-email`, `/api/test-whatsapp`.
   Risco: vazamento total do banco. Esforço: baixo.

2. ~~**CRÍTICO — Adicionar autenticação ao endpoint `/api/cnpj/[cnpj]`**,
   que hoje retorna CPF de sócios e dados de contato sem sessão. Esforço:
   médio (precisa coordenar os 5 pontos do frontend que o consomem — ver
   seção 5.3).~~ ✅ **Corrigido em 10/06/2026** — adicionada checagem
   `auth()`. As 5 telas dependentes continuam funcionando normalmente
   (fetch relativo envia o cookie de sessão). Ver `docs/changelog.md`.

3. ~~**ALTO — Eliminar chaves de diagnóstico hardcoded** (padrão
   `cf-diag-2026-vp-temp`), a começar por
   `src/app/api/admin/diagnostico-protocolo/route.ts`. Substituir por
   autenticação ADMIN apenas, ou remover o endpoint se não for mais
   usado.~~ ✅ **Corrigido em 10/06/2026** — bypass por chave removido,
   mantida apenas `auth()` + `role === 'ADMIN'`. Ver `docs/changelog.md`.

4. **ALTO — Replicar a correção de isolamento de formulário** (o que foi
   feito em `mergeDadosResponsavelPF`) para os outros 8-10 pontos
   listados na seção 7, priorizando `wizard.tsx` (`buscarClientePorCPF`,
   `validarCNPJ`, `autoPreencherPorCNPJ`, `buscarCep`) por ser o fluxo de
   vendas com maior volume de uso. Cada correção deve seguir Regra 3
   (análise de impacto) e Regra 6 (testes) individualmente.

5. **MÉDIO — Adicionar debounce/cancelamento na busca de CPF do wizard**
   (`buscarClientePorCPF`, seção 3.5) para eliminar a race condition que
   pode reintroduzir vazamento mesmo após a correção do item 4.

6. **MÉDIO — Centralizar formatação de CPF/CNPJ/telefone/CEP** em
   `src/lib/utils.ts` e remover as 10+ duplicações (seção 4), reduzindo
   risco de inconsistência futura.

7. **MÉDIO — Remover `console.log` com dados pessoais em produção**
   (`nova-venda/route.ts:39-40`) ou substituir por log sem PII.

8. **MÉDIO — Documentar as áreas listadas na seção 2** (certificados,
   perfil, notificações, sessão, calculadora, admin/diagnóstico,
   permissões, auditoria, jobs/cron), conforme Regra 1 — começar pelas
   integrações financeiras e de automação (jobs), por serem as mais
   críticas e menos visíveis.

9. **BAIXO — Revisar retenção/exposição de `audit_logs` e endpoints de
   diagnóstico** à luz da LGPD — já removemos o endpoint
   `diagnostico-limpeza` hoje; falta revisar `diagnostico-protocolo`
   (item 3) e decidir uma política de retenção para `audit_logs`.

10. **BAIXO — Adicionar testes automatizados ao wizard de nova venda**
    (maior arquivo de risco do sistema, seção 5.1), começando pelas
    funções que tocam dados pessoais (itens da seção 7).

---

## Itens marcados como "não verificado" nesta auditoria

Por aderência à Regra 7 (proibição de suposições), os seguintes pontos
precisam de checagem antes de qualquer ação:
- `src/app/(dashboard)/parceiros/[id]/editar/page.tsx` — confirmar se
  `buscarCnpj()` tem o mesmo padrão de risco da seção 7.
- `src/app/(dashboard)/sst/page.tsx` — confirmar se a busca de CNPJ no
  modal de lead tem o mesmo padrão.
- `src/app/(dashboard)/pedidos/[id]/page.tsx` — confirmar se exibe
  CPF/CNPJ completo sem mascaramento.
- `src/app/(dashboard)/pedidos/novo/` — confirmar se é rota ativa ou
  código legado a ser removido.