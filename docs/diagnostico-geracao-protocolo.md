# Diagnóstico — Geração automática de protocolo Safeweb na "Nova Venda"

> Análise estática (somente leitura) do repositório CertFlow.
> Objetivo: entender por que a geração automática de protocolo Safeweb funciona
> na máquina do Vinicius (mesmo logado como outro usuário) e não funciona nas
> máquinas dos demais funcionários (Arlen Junior, Ana Karolina, Laryssa Bueno),
> mesmo usando as mesmas credenciais.

---

## 1. Dependências para gerar um protocolo Safeweb na "Nova Venda"

Fluxo completo, na ordem em que é executado:

1. **Frontend (wizard)** — `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx`
   - Função `finalizar()` (linhas 485–574) monta o `body` do pedido e faz
     `POST /api/pedidos/nova-venda` (linha 566-568).
   - Campo `tipoAtendimento` (linha 552, default `'videoconferencia'`, linha 65)
     decide se a Safeweb será chamada.
   - Resultado é lido em `result.safewebProtocolo` (linha 571) e exibido na
     tela de sucesso (linhas 588-621): se vier preenchido, mostra "Protocolo
     Safeweb criado automaticamente"; se vier `null`, mostra o campo manual
     para colar o protocolo do Hope Portal (linhas 622-638).

2. **Rota API** — `src/app/api/pedidos/nova-venda/route.ts`
   - `export const preferredRegion = 'gru1'` (linha 1) e `maxDuration = 60`
     (linha 2) — roda como **Vercel Serverless Function** na região São Paulo.
   - `POST` (linha 84): exige `session = await auth()` (linha 85); se não
     houver sessão, retorna 401 — **não há checagem de `role`/permissão**
     além de "estar autenticado".
   - Cria/atualiza `Cliente` e `Pedido` no banco (linhas 99-204).
   - Bloco "3. Protocolo Safeweb automático" (linhas 206-378):
     - Só executa se `tipoAtendimento` for `'videoconferencia'`,
       `'presencial'` ou `'emissao-online'` (linhas 209-212).
     - Busca modelo de certificado e cliente no banco (linhas 216-236).
     - `buscarProduto()` (linha 243) → mapeia modelo CertFlow → produto
       Safeweb.
     - Monta `addParams` (linhas 322-335) e chama
       `adicionarVideoconferencia()` (linha 337).
     - Se `tipoAtendimento === 'videoconferencia'`, chama também
       `integracaoHope()` (linha 358).
     - Tudo dentro de `Promise.race([tarefa, limite=40s])` (linha 377) — se
       demorar mais de 40s, segue sem protocolo (mas a tarefa continua
       rodando em background até a função serverless ser encerrada).

3. **Lib de integração** — `src/lib/safeweb.ts`
   - `cfg()` (linhas 7-27): lê variáveis de ambiente `SAFEWEB_*`.
   - `getToken()` (linhas 34-76): autentica via Basic Auth
     (`SAFEWEB_IDENTIFICADOR` + `SAFEWEB_SEGREDO`) no endpoint
     `/Shared/HubAutenticacao/Autenticacoes/api/autorizacao/token` e cacheia o
     token **em variável de módulo Node (`_tokenCache`, linha 32)**.
   - `adicionarVideoconferencia()` (linhas 271-353): chama
     `POST {baseUrl}/Shared/Partner/api/Add/{1|3|5}` — cria o protocolo.
   - `integracaoHope()` (linhas 358-385): chama
     `POST {baseUrl}/Hope/Shared/api/integration/solicitation`.
   - `buscarProduto()`/`listarProdutos()` (linhas 409-494): chama
     `GET {baseUrl}/Shared/Product/api/GetListProdutoByAR/{idTipoEmissao}/{cnpjAR}`.
   - `validarCertificadoOnline()` (linhas 514-530, usado só em
     "emissão online"): `GET {baseUrl}/Shared/Partner/api/EmitirCertificadoOnline/...`.

### Variáveis de ambiente `SAFEWEB_*` usadas (`src/lib/safeweb.ts:7-27`)
- `SAFEWEB_HOMOLOGACAO` (`'true'`/`'false'`)
- `SAFEWEB_IDENTIFICADOR` / `SAFEWEB_IDENTIFICADOR_HOMOLOG`
- `SAFEWEB_SEGREDO` / `SAFEWEB_SEGREDO_HOMOLOG`
- `SAFEWEB_BASE_URL` / `SAFEWEB_BASE_URL_HOMOLOG`
- `SAFEWEB_CODIGO_AR`
- `SAFEWEB_CNPJ_AR`
- `SAFEWEB_ATTENDANCE_PLACE_ID`
- `SAFEWEB_WEBHOOK_URL` (opcional, fallback `${NEXTAUTH_URL}/api/safeweb/webhook`,
  `src/lib/safeweb.ts:277-278`)

Há também `SAFEWEB_API_URL` / `SAFEWEB_API_KEY`, usadas apenas para exibir o
status "configurado" na tela de Configurações
(`src/app/(dashboard)/configuracoes/page.tsx:20`) — **não são usadas no fluxo
de geração de protocolo** (esse fluxo usa as variáveis listadas acima, lidas
em `src/lib/safeweb.ts`).

**Importante**: todas essas variáveis são lidas via `process.env` **dentro da
rota/lib que roda no servidor (Vercel)** — nunca são enviadas ao navegador,
nunca aparecem em código client-side (`'use client'`). Logo, não há como o
"navegador" do Vinicius ter acesso a credenciais Safeweb que outras máquinas
não tenham — todas as requisições passam pelo mesmo backend serverless.

---

## 2. Dados vindos da SESSÃO (NextAuth/JWT)

Configuração em `src/lib/auth.ts`:
- Estratégia `session: { strategy: 'jwt' }` (linha 87) — sessão é um JWT
  assinado, guardado em cookie (não há sessão em banco usada pelo NextAuth
  aqui, apesar de existir um model `Sessao` no Prisma — ver seção 4).
- Callback `jwt` (linhas 71-77): grava `token.id` e `token.role` a partir do
  usuário autenticado.
- Callback `session` (linhas 78-82): expõe `session.user.id` e
  `session.user.role`.

No fluxo de `nova-venda/route.ts`, a sessão é usada apenas para:
- `session.user.id` → grava `usuarioId` no `Pedido` (linha 179) e em
  `registrarAuditoria` (linha 420).
- **Nenhum dado do Safeweb depende de `session.user.email`, `name`, `role`
  etc.** — a chamada à Safeweb usa exclusivamente as variáveis de ambiente do
  servidor (seção 1) e os dados do cliente/pedido enviados no `body`.
- Não há diferenciação de comportamento por `role` nesse endpoint — qualquer
  usuário autenticado (`ADMIN`, `GERENTE`, `OPERADOR`, `FINANCEIRO`,
  `VISUALIZADOR`) consegue, em tese, disparar o mesmo fluxo (linha 86: só
  checa `if (!session)`).

---

## 3. Uso de `localStorage` / `sessionStorage` no projeto

Busca em todo `src/**/*.ts` e `*.tsx` por
`localStorage|sessionStorage|window.localStorage|window.sessionStorage`.
Resultado completo:

| Arquivo:linha | Uso |
|---|---|
| `src/app/layout.tsx:33` | Tema claro/escuro (`certflow-theme`) |
| `src/components/theme-toggle.tsx:13,23` | Tema claro/escuro (`certflow-theme`) |
| `src/app/(dashboard)/dashboard/agenda-tab.tsx:16-25` | URL do calendário (`certflow_calendar_url`) — fallback de exibição |
| `src/components/calendar-widget.tsx:11,16` | URL do calendário (`certflow_calendar_url`) |
| `src/app/(dashboard)/dashboard/widget-agenda-pessoal.tsx:21,26` | Itens de agenda pessoal por usuário (`chaveStorage(userId)`) |
| `src/components/meta-celebracao.tsx:20,73` | Flag "já comemorou meta hoje" |
| `src/components/welcome-popup.tsx:99,107` | Flag "já viu popup de boas-vindas hoje" |

**Nenhuma dessas chaves tem relação com Safeweb, tokens de API, credenciais
ou autenticação.** Não existe nenhum `localStorage.setItem`/`getItem` com
strings como `safeweb`, `token`, `access_token`, `SAFEWEB_*` em todo o
projeto (`src/`). Portanto **não há cache local no navegador do Vinicius que
explique o comportamento** — o token Safeweb nunca é exposto ao cliente.

---

## 4. `cookies()`, `next/headers`, `document.cookie`, NextAuth

- `src/lib/auth.ts` configura `NextAuth` com `session: { strategy: 'jwt' }`
  (linha 87) e **não define `cookies: {...}` customizado** — usa os defaults
  do NextAuth/Auth.js (cookie `authjs.session-token` ou
  `__Secure-authjs.session-token` em produção HTTPS, `httpOnly`, `sameSite:
  lax`, escopo de domínio = domínio do deploy).
- Esse cookie é **por navegador/dispositivo**, mas isso é o comportamento
  normal e esperado de qualquer sessão web — não é "Vinicius x outras
  máquinas", é "cada login gera seu próprio cookie de sessão", o que já
  funciona (os funcionários conseguem logar e usar o sistema, só a geração de
  protocolo falha).
- `src/lib/auth-edge.ts` existe (usado provavelmente no middleware de
  proteção de rotas) — não há `middleware.ts` na raiz de `src/` encontrado
  pela busca, então a proteção de rotas provavelmente é feita
  página-a-página via `auth()`.
- O model `Sessao` existe no `prisma/schema.prisma` (linha 114+), mas o
  NextAuth está configurado com `strategy: 'jwt'`, ou seja, **não usa esse
  model para a sessão de login** (esse model parece ser usado para outra
  finalidade, ex.: rastreamento de dispositivos/atividade — fora do escopo
  deste fluxo).
- `req.headers.get('cookie')` é repassado em `src/app/api/pedidos/nova-venda/route.ts:405`
  apenas para a chamada interna a `/api/agenda` (agendamento no Google
  Calendar) — não tem relação com Safeweb.
- Não há "remember device", "trusted machine" ou qualquer mecanismo de cache
  de sessão por máquina identificado no código.

**Conclusão da seção**: nada relacionado a cookies/sessão diferencia
"máquina do Vinicius" de "máquina de outro funcionário" no que diz respeito à
chamada Safeweb — a chamada Safeweb roda inteiramente no servidor,
independente do cookie do usuário.

---

## 5. Cache de token / variável global no servidor

- `src/lib/safeweb.ts:32` — `let _tokenCache: { token: string; expiraMs: number } | null = null`
  - Variável de módulo (escopo do processo Node). Em ambiente Vercel
    serverless, **cada instância/região/cold start tem sua própria cópia**
    dessa variável — não é compartilhada entre execuções diferentes, e não
    "pertence" a nenhuma máquina de usuário.
  - `getToken()` (linhas 34-76) usa esse cache com margem de 60s
    (linha 35). Token Safeweb dura ~10 min (linha 30, 67).
  - Esse cache **não pode** ser a causa do problema reportado, porque:
    - Ele vive no servidor (Vercel), não no navegador/máquina do usuário.
    - Mesmo que estivesse "quente" só para alguns requests, isso seria
      aleatório por instância serverless, não consistente "sempre funciona
      na máquina do Vinicius / nunca nas outras".
  - Único efeito possível: se o token expirar/for inválido e a 1ª chamada de
    `getToken()` falhar (`SAFEWEB_IDENTIFICADOR`/`SAFEWEB_SEGREDO` ausentes ou
    inválidos em produção), `adicionarVideoconferencia()` cairia no `catch`
    (linha 350-352) e retornaria `{ ok: false, erro }`, fazendo o protocolo
    automático falhar **igualmente para todos os usuários**, não apenas para
    funcionários.

- `_ibgeCache` (linha 108) — cache em memória de códigos IBGE de
  cidade/UF. Mesmo raciocínio: vive no servidor, não depende de máquina de
  usuário, e na pior hipótese causaria falha de `montarEndereco`/
  `montarClienteNotaFiscal` igual para todos.

- Não há uso de `unstable_cache` ou `revalidate` do Next.js relacionado à
  Safeweb (busca não retornou ocorrências relevantes em `src/lib/safeweb.ts`
  nem em `src/app/api/pedidos/nova-venda/route.ts`).

**Conclusão da seção**: não existe nenhum cache (token Safeweb, IBGE, etc.)
que seja "local à máquina do Vinicius". Tudo roda no servidor compartilhado.

---

## 6. Permissões / roles verificadas no fluxo

- `prisma/schema.prisma` — `model Usuario` (linhas 87-112): campo `role
  Role @default(OPERADOR)` (linha 93), enum `Role` (linhas 60-66):
  `ADMIN`, `GERENTE`, `OPERADOR`, `FINANCEIRO`, `VISUALIZADOR`.
- `src/app/api/pedidos/nova-venda/route.ts:85-86`:
  ```ts
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  ```
  — **única verificação de autorização** nessa rota. Não há `if
  (session.user.role !== 'ADMIN')` nem nada equivalente bloqueando o bloco de
  geração de protocolo Safeweb (seção "3. Protocolo Safeweb automático",
  linhas 206-378) para roles diferentes de `ADMIN`/`GERENTE`.
- Conclusão: **a permissão do usuário (role) não é o fator diferenciador**
  — o código trata qualquer usuário autenticado da mesma forma para fins de
  geração de protocolo.

---

## 7. Chamadas de API no fluxo

### Internas (CertFlow)
- `POST /api/pedidos/nova-venda` — `src/app/api/pedidos/nova-venda/route.ts`
  (rota principal do fluxo).
- `POST /api/safeweb/consulta-previa` — chamada pelo wizard
  (`wizard.tsx:232`) antes da etapa de pagamento, para checar elegibilidade
  CPF/CNPJ na RFB.
- `GET /api/sistema/horario` — `wizard.tsx:489`, valida horário do
  agendamento usando relógio do **servidor** (`src/app/api/sistema/horario/route.ts`).
- `POST /api/agenda` — chamada interna feita pela própria rota
  `nova-venda/route.ts:403` para criar evento no Google Calendar (usa
  `process.env.NEXTAUTH_URL`).
- `PATCH /api/pedidos/{id}` — `wizard.tsx:579-582`, salva protocolo manual
  quando a geração automática não ocorre.

### Externas (Safeweb / terceiros)
- `POST {baseUrl}/Shared/HubAutenticacao/Autenticacoes/api/autorizacao/token`
  — autenticação/token (`src/lib/safeweb.ts:45-54`).
- `POST {baseUrl}/Shared/Partner/api/Add/{1|3|5}` — criação do protocolo
  (`src/lib/safeweb.ts:339`).
- `POST {baseUrl}/Hope/Shared/api/integration/solicitation` — vínculo Hope
  (`src/lib/safeweb.ts:364-376`), só para videoconferência.
- `GET {baseUrl}/Shared/Product/api/GetListProdutoByAR/{idTipoEmissao}/{cnpjAR}`
  — listagem de produtos (`src/lib/safeweb.ts:416`).
- `GET {baseUrl}/Shared/Partner/api/EmitirCertificadoOnline/{numeroSerie}/{idProduto}/{cnpjAR}`
  — só para emissão online (`src/lib/safeweb.ts:520-523`).
- `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios`
  — códigos IBGE (`src/lib/safeweb.ts:119`).
- `GET https://viacep.com.br/ws/{cep}/json/` — preenchimento de endereço no
  wizard (`wizard.tsx:468`), client-side.

`baseUrl` = `https://pss.safewebpss.com.br/Service/Microservice` (produção)
ou `https://h-pss.safewebpss.com.br/Service/Microservice` (homologação),
conforme `SAFEWEB_HOMOLOGACAO` (`src/lib/safeweb.ts:18-20`).

---

## 8. Hipóteses — por que dependeria da MÁQUINA e não do usuário/sessão

Dado que (a) toda a lógica Safeweb roda no servidor (Vercel), (b) não há
token/credencial salvos no navegador, e (c) não há diferenciação por
`role`/sessão no código, **a causa mais provável NÃO está no código do fluxo
Safeweb em si**, mas em **diferenças no AMBIENTE/REQUEST que cada máquina
gera** ao chamar `/api/pedidos/nova-venda`. Hipóteses concretas, da mais para
a menos provável:

### Hipótese A — `tipoAtendimento` / dados obrigatórios incompletos no formulário
- O bloco Safeweb só roda para `tipoAtendimento` em
  `videoconferencia | presencial | emissao-online`
  (`src/app/api/pedidos/nova-venda/route.ts:209-212`).
- Se na máquina do funcionário o campo `tipoAtendimento` estiver, por algum
  motivo de estado/cache do navegador (ex.: versão antiga do bundle JS em
  cache, service worker, ou aba aberta há muito tempo sem reload após um
  deploy), enviando um valor diferente (ou vazio) — o bloco inteiro é pulado
  e `safewebProtocolo` volta `null` (comportamento idêntico ao "presencial
  sem protocolo automático" na tela de sucesso, `wizard.tsx:622-638`).
- Isso é **consistente com "o campo protocolo fica editável manualmente"** —
  é exatamente o fallback desenhado para quando `safewebProtocolo` é `null`
  (`wizard.tsx:601` vs `622`).
- **Por que dependeria da máquina**: bundle JS desatualizado em cache do
  navegador é por-máquina/por-navegador, não por-usuário/sessão. Trocar de
  usuário na mesma aba/máquina do Vinicius não força um reload do JS, mas o
  JS dele já está atualizado; já a máquina do funcionário pode estar
  servindo uma versão antiga do `wizard.tsx` compilado (`.next/static/...`)
  via cache do navegador/CDN.

### Hipótese B — endereço incompleto → `enderecoCliente` vira `undefined`
- `montarEnderecoCompleto()` (`src/app/api/pedidos/nova-venda/route.ts:269-284`)
  só retorna o endereço se **todos** os campos (`cep, logradouro, numero,
  bairro, cidade, estado`) estiverem preenchidos — senão retorna `undefined`
  (linha 283).
- Se `enderecoCliente` vier `undefined`, `montarEndereco()`
  (`src/lib/safeweb.ts:223-237`) retorna `undefined`, e
  `ClienteNotaFiscal`/`Endereco` ficam ausentes no payload — a Safeweb pode
  rejeitar o `Add/{1|3|5}` (campo obrigatório), fazendo
  `adicionarVideoconferencia` retornar `{ ok: false }` e o protocolo não ser
  gerado (linhas 339-342, log `[Safeweb] falha ao criar protocolo`).
- **Por que dependeria da máquina**: se o autopreenchimento de CEP via ViaCEP
  (`wizard.tsx:468`, chamada **client-side**, direto do navegador para
  `viacep.com.br`) falhar silenciosamente em algumas máquinas (proxy,
  firewall corporativo, extensão de navegador bloqueando `viacep.com.br`,
  DNS, etc.), os campos de endereço ficam vazios só naquela máquina, mesmo
  que o usuário seja o mesmo. Na máquina do Vinicius, o ViaCEP responde
  normalmente e o endereço é preenchido — qualquer usuário logado ali terá
  endereço completo.

### Hipótese C — bloqueio de rede/firewall/proxy da máquina para a Safeweb ou IBGE
- `buscarCodigosIbge()` (`src/lib/safeweb.ts:114-137`) roda no **servidor**
  (Vercel), então normalmente não dependeria da máquina do usuário — porém
  se o ambiente NÃO estiver rodando em produção/Vercel para os funcionários
  (ex.: alguém testando via `npm run dev` localmente, ou apontando para uma
  URL/ambiente diferente), o servidor que processa a requisição passa a ser
  a própria máquina local, e aí sim bloqueios de rede locais (firewall da
  empresa, antivírus, proxy) poderiam impedir as chamadas a
  `pss.safewebpss.com.br` / `servicodados.ibge.gov.br` especificamente
  naquela máquina — explicando por que, na máquina do Vinicius (sem esse
  bloqueio), tudo funciona com qualquer usuário, mas na máquina do
  funcionário (com bloqueio), falha com qualquer usuário.
- Vale confirmar com o usuário: **os funcionários acessam via
  `https://certflow-nine.vercel.app` (produção) ou via algum ambiente
  local/dev rodando na máquina deles?** Se for produção (Vercel) para todos,
  esta hipótese perde força (pois o servidor é o mesmo Vercel, compartilhado).

### Hipótese D — dados de cliente/CPF/CNPJ diferentes no banco causando
`Consulta Prévia` ou `Add` rejeitarem silenciosamente
- O bloco Safeweb tem `try/catch` amplo e, em caso de erro, apenas faz
  `console.error` e retorna sem protocolo (linhas 339-342, 350-352, 371-373)
  — **o usuário não vê o erro real**, só vê "protocolo não gerado, preencha
  manualmente". Isso por si só não depende de máquina, mas reforça que **o
  diagnóstico real exige olhar os logs do Vercel** (`console.error('[Safeweb]
  ...')`) no momento em que o funcionário tenta gerar o pedido — os logs
  mostrarão exatamente qual chamada falhou (`produto não encontrado`, `falha
  ao criar protocolo`, erro de `getToken`, etc.) e se o comportamento
  realmente difere por usuário/máquina ou se é sempre o mesmo erro
  (sugerindo então uma causa não relacionada à máquina, e sim a dados
  específicos do cliente/pedido sendo testado).

### Hipótese E — variável de ambiente `SAFEWEB_WEBHOOK_URL`/`NEXTAUTH_URL`
incorreta gerando `UrlSolicitacao` inválida
- `webhookUrl` (`src/lib/safeweb.ts:277-278`) usa `SAFEWEB_WEBHOOK_URL` ou
  `${NEXTAUTH_URL}/api/safeweb/webhook`. Se `NEXTAUTH_URL` apontar para
  `localhost` (configuração de ambiente de desenvolvimento) em vez da URL
  pública de produção, a Safeweb pode rejeitar o payload por
  `UrlSolicitacao` inválida — mas, novamente, isso seria uma variável de
  **servidor**, igual para todos os usuários daquele deployment, não
  "por máquina".

### Recomendação prática (não é alteração de código, é próximo passo de
investigação)
1. Confirmar que TODOS (Vinicius e funcionários) acessam exatamente o mesmo
   domínio/deploy de produção (não dev local, não preview branch diferente).
2. Pedir para um funcionário tentar gerar a venda e, **no mesmo instante**,
   olhar os logs da função `/api/pedidos/nova-venda` no painel da Vercel —
   procurar por linhas `[Safeweb] ...` (definidas em
   `src/app/api/pedidos/nova-venda/route.ts:239,251,313,315,318,336,338,340,
   360,362,372`) para ver exatamente em qual etapa o fluxo está parando para
   aquele request específico.
3. Comparar o `body` enviado pelo wizard nas duas máquinas (via DevTools →
   Network → payload de `/api/pedidos/nova-venda`), especialmente
   `tipoAtendimento`, `cep/logradouro/numero/bairro/cidade/estado` e
   `clienteDados.dataNascimento` — para checar a Hipótese A/B sem precisar
   alterar código.