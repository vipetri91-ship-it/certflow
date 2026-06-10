# Auditoria — Vazamento de dados entre formulários (estado "grudado" entre consultas)

Data: 10/06/2026
Escopo: busca por padrões `algumaCoisa?.campo ?? d.campo` (ou equivalente) em
toda a árvore `src/`, em fluxos de Cadastro PF, Cadastro PJ, Responsáveis,
Representantes legais, Clientes, Certificados, Renovação, Safeweb e Safe Agro.

**Esta etapa é apenas documentação. Nenhum código foi alterado.**

---

## O padrão de risco

```ts
campo: fonteNova?.campo ?? d.campo   // ou f.campo, prev.campo, atual.campo...
```

Quando `fonteNova` (resultado de uma nova consulta — CPF, CNPJ, CEP, cliente
existente) não traz o campo (ou a consulta não encontra nada), o `?? d.campo`
faz o formulário **manter o valor que já estava na tela**, que pode pertencer
a uma consulta anterior de **outra pessoa/empresa**.

Já confirmado e corrigido nesta sessão: [[consulta-cpf]] (`validarPF` em
`wizard.tsx`).

---

## 1. Cadastro PF / Responsável (Nova Venda)

### 1.1 `wizard.tsx` → `validarPF()` — **CORRIGIDO**
Linhas ~405-455. Consulta CPF + nascimento (Receita/Safeweb). Já ajustado
para limpar e-mail, telefone, CEP, endereço, bairro, cidade, UF, `clienteId`
e PIS/NIS quando não há `clienteExistente` para o CPF. Ver
`docs/regras-negocio/consulta-cpf.md`.

### 1.2 `wizard.tsx` → `buscarClientePorCPF()` — **RISCO (não corrigido)**
Linhas ~370-403. Disparado no `onBlur` do campo CPF do responsável (Step de
identificação rápida, antes da validação completa).

```ts
const c = data.clientes?.[0]
if (c?.cpf === cpf) {
  setDados(d => ({ ...d, nomeResponsavel: c.nome ?? d.nomeResponsavel, email: c.email ?? d.email, ... }))
}
```

Se `c?.cpf !== cpf` (CPF novo, sem cadastro local), a função **não faz
nada** — mas se o usuário já tinha consultado outro CPF antes (que preencheu
nome/e-mail/telefone/endereço), esses dados **permanecem na tela** mesmo
sendo de outra pessoa. Mesma família de bug do item 1.1, em outro gatilho.

**Campos potencialmente "grudados"**: `nomeResponsavel`, `nome`,
`dataNascimento`/`dataNasc`, `email`, `ddd`/`telefone`, `pisNis`, `cep`,
`logradouro`, `numero`, `bairro`, `municipio`, `estado`, `clienteId`,
`validado`, `historico`.

---

## 2. Cadastro PJ / Representante legal (Nova Venda)

### 2.1 `wizard.tsx` → `validarCNPJ` (bloco de `setDados`, linhas ~279-298) — **RISCO**
Consulta CNPJ na Receita + cliente existente (`cli = data.clienteExistente`).

```ts
nomeResponsavel: nomeRfb ?? cli?.responsavel ?? d.nomeResponsavel,
nome:            cli?.responsavel ?? nomeRfb ?? d.nome,
email:           cli?.email ?? d.email,
...telefoneFromCelular(cli?.celular, cli?.ddd, { ddd: d.ddd, telefone: d.telefone }),
cepEmpresa:        data.cep ? fmtCEP(data.cep) : d.cepEmpresa,
logradouroEmpresa: data.logradouro ?? d.logradouroEmpresa,
... (numeroEmpresa, bairroEmpresa, municipioEmpresa, estadoEmpresa)
```

Se o CNPJ consultado não tiver `clienteExistente` (`cli` indefinido) e a
Receita não retornar e-mail/telefone (ela normalmente não retorna), os
campos `email`/`ddd`/`telefone` ficam com o valor de uma consulta anterior
(de outro CNPJ, ou até de uma consulta de CPF anterior na mesma sessão).
O endereço da empresa (`*Empresa`) também herda `d.*Empresa` se `data.cep`
vier vazio.

**Campos potencialmente "grudados"**: `email`, `ddd`/`telefone`,
`cepEmpresa`, `logradouroEmpresa`, `numeroEmpresa`, `bairroEmpresa`,
`municipioEmpresa`, `estadoEmpresa`. (`nomeResponsavel`/`nome`/`nomeEmpresa`/
`razaoSocial`/`fantasia` são preenchidos a partir de `data`/`nomeRfb` com
fallback para `''`, então não vazam — exceto `nomeResponsavel`/`nome`, que
caem para `cli?.responsavel`/`d.nome*` se `nomeRfb` for vazio.)

### 2.2 `wizard.tsx` → `autoPreencherPorCNPJ()` (linhas ~311-368) — **RISCO**
Auto-preenchimento ao digitar/colar um CNPJ (busca direta em
`/api/clientes`, sem passar pela Receita).

```ts
nomeEmpresa:      (c.nome as string) ?? d.nomeEmpresa,
razaoSocial:      (c.nome as string) ?? d.razaoSocial,
fantasia:         (c.nomeFantasia as string) ?? d.fantasia,
nomeResponsavel:  (c.responsavel as string) ?? d.nomeResponsavel,
nome:             (c.responsavel as string) ?? d.nome,
email:            (c.email as string) ?? d.email,
emailEmpresa:     (c.email as string) ?? d.emailEmpresa,
... (logradouroEmpresa, numeroEmpresa, bairroEmpresa, municipioEmpresa, estadoEmpresa)
ddd/telefone, dddEmpresa/telEmpresa via telefoneFromCelular(c.celular, c.ddd, { ddd: d.*, telefone: d.* })
cpfResponsavel: cpfFill ? ... : d.cpfResponsavel
dataNascimento: nascFill ? ... : d.dataNascimento
```

Aqui `c` **sempre existe** quando a função chega ao `setDados` (há um
`if (!c) return` antes — linha 323), mas `c` pode ter campos `null`
individualmente (ex.: empresa sem `email`, sem `celular`, sem
`responsavel`). Nesses casos, cada campo `null` cai no `?? d.campo` e herda
o valor da consulta anterior (de outro CNPJ ou de um CPF consultado antes).

**Campos potencialmente "grudados"**: praticamente todos os campos da PJ e
do responsável — `email`, `emailEmpresa`, `ddd`/`telefone`,
`dddEmpresa`/`telEmpresa`, `*Empresa` (endereço), `nomeResponsavel`, `nome`,
`cpfResponsavel`, `dataNascimento`, `nomeEmpresa`, `razaoSocial`, `fantasia`.

---

## 3. CEP (Cliente PF e Empresa/Responsável PJ)

### 3.1 `wizard.tsx` → `buscarCep()` (linhas ~460-485) — **RISCO BAIXO**
```ts
// cliente
logradouro: data.logradouro ?? d.logradouro,
bairro: data.bairro ?? d.bairro, municipio: data.localidade ?? d.municipio, estado: data.uf ?? d.estado,
// empresa/responsável
logradouroEmpresa: data.logradouro ?? d.logradouroEmpresa,
bairroEmpresa: data.bairro ?? d.bairroEmpresa, municipioEmpresa: data.localidade ?? d.municipioEmpresa, estadoEmpresa: data.uf ?? d.estadoEmpresa,
```

Se a API de CEP retornar um logradouro/bairro vazio para o **novo** CEP
digitado, o endereço antigo (de um CEP anterior, possivelmente de outro
cliente/responsável já pesquisado na mesma tela) permanece. Risco menor
porque normalmente é o mesmo cliente preenchendo o próprio CEP, mas ainda
viola a regra de "nunca herdar valor de consulta anterior".

---

## 4. Cadastro de cliente novo (`/clientes/novo`)

### 4.1 `clientes/novo/page.tsx` — busca por CNPJ (linhas ~89-110) — **RISCO**
```ts
setForm(f => ({
  ...f,
  razaoSocial:  data.razaoSocial  ?? f.razaoSocial,
  nomeFantasia: data.nomeFantasia ?? f.nomeFantasia,
  email:        data.email        ?? f.email,
  telefone:     data.telefone     ?? f.telefone,
  logradouro:   data.logradouro  ?? f.logradouro,
  numero:       data.numero      ?? f.numero,
  bairro:       data.bairro      ?? f.bairro,
  cidade:       data.municipio   ?? f.cidade,
  estado:       data.uf          ?? f.estado,
}))
```
Mesmo padrão: se o usuário digitar um CNPJ, a Receita preencher parcialmente
e depois o usuário **trocar** o CNPJ digitado (ex.: corrigiu um dígito), os
campos que a segunda consulta não retornar ficam com o valor da primeira
consulta.

A busca de CEP nesse mesmo arquivo (linhas ~128-134) usa `?? ''` (não usa
`f.campo`), então **não tem esse problema** — está correta.

---

## 5. Emissão Online (`emissao-online.tsx`)

### 5.1 `validar()` (linhas ~91-119) — **RISCO (padrão diferente)**
Não usa `setDados`/objeto único — usa `useState` individuais
(`setNome`, `setDocumento`, `setEmail`, `setModeloNome`, `setModeloPreco`,
`setValorVenda`).

```ts
setNome(ext.nome)
const docRaw = ext.cnpj || ext.cpf
if (docRaw) { setDocumento(...) }
if (ext.email) setEmail(ext.email)
```

Se o usuário validar a **série A** de um certificado A3 (preenche
nome/documento/e-mail), perceber que errou e validar a **série B** (de outra
pessoa), e a resposta da série B não trouxer `ext.email` (ou `ext.cnpj`/
`ext.cpf`), o `if (ext.email) setEmail(...)` **não roda** e o e-mail da
pessoa A continua no estado — mesmo problema, mecanismo diferente (ausência
de `else limpar`, em vez de `?? d.campo`).

`setNome(ext.nome)` sempre roda (sem `if`), então o nome é atualizado mesmo
que venha vazio — esse campo específico não vaza, mas pode ficar vazio
silenciosamente.

---

## 6. Renovações (`/renovacoes`)

Verificado `renovacoes/lista.tsx`, `renovacoes/detalhe.tsx`,
`renovacoes/page.tsx`: não há consulta de CPF/CNPJ com merge de estado nessas
telas — operam sobre um cliente/pedido já identificado por `id` da rota.
**Sem padrão de risco encontrado.**

---

## 7. Cadastro de certificado em cliente existente (`clientes/[id]/...`)

Verificado `cadastrar-certificado.tsx`, `clientes/[id]/page.tsx`,
`clientes/[id]/editar/page.tsx`: operam sobre o `id` do cliente já carregado
via rota — não há lookup paralelo de outro CPF/CNPJ que possa contaminar o
formulário. **Sem padrão de risco encontrado.**

---

## 8. Safeweb (`src/lib/safeweb.ts`)

- `_tokenCache` (módulo): cache do token JWT da Safeweb, em memória do
  processo, **compartilhado entre todas as requisições/usuários por
  design** (config global única, ver [[project_certflow]]). Não é
  "vazamento de dados de formulário entre clientes" — é cache de
  credencial técnica, mesma para todos. Fora do escopo desta auditoria,
  citado apenas para registro.
- `montarContato()`, `adicionarVideoconferencia()`, `buscarProduto()` etc.:
  recebem todos os dados como parâmetros explícitos a cada chamada (sem
  estado entre requisições) — **sem padrão de risco**.

---

## 9. Safe Agro

Não existe nenhuma feature/área "Safe Agro" no código — a única ocorrência
da palavra "agro" é um rótulo de segmento de público
(`src/app/api/social/gerar/route.ts:27`, geração de posts para redes
sociais), sem relação com cadastro de clientes/certificados. **Não
aplicável.**

---

## Resumo — pontos a corrigir (por ordem de risco)

| # | Local | Função | Risco | Status |
|---|-------|--------|-------|--------|
| 1.1 | `wizard.tsx` | `validarPF()` | Alto | ✅ Corrigido |
| 1.2 | `wizard.tsx` | `buscarClientePorCPF()` | Médio-Alto | ⏳ Pendente |
| 2.2 | `wizard.tsx` | `autoPreencherPorCNPJ()` | Alto | ⏳ Pendente |
| 2.1 | `wizard.tsx` | `validarCNPJ` (setDados) | Médio | ⏳ Pendente |
| 5.1 | `emissao-online.tsx` | `validar()` | Médio | ⏳ Pendente |
| 4.1 | `clientes/novo/page.tsx` | busca CNPJ | Médio | ⏳ Pendente |
| 3.1 | `wizard.tsx` | `buscarCep()` | Baixo | ⏳ Pendente |

A regra geral a aplicar em cada um está descrita em
[[isolamento-de-formularios]].
