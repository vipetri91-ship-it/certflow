# Regra arquitetural — Isolamento de formulários entre consultas

## Regra obrigatória

> Toda nova consulta de CPF, CNPJ, cliente, responsável ou representante
> deve iniciar com **estado limpo**. É **proibido** reutilizar valores de
> consultas anteriores.

Todo formulário que dispara uma consulta externa (Receita Federal, Safeweb,
ViaCEP, busca de cliente no banco) e usa o resultado para preencher campos
da tela deve seguir os 4 pontos abaixo:

1. **Limpar dados antigos antes de carregar novos** — ao iniciar uma nova
   consulta, os campos que dependem do resultado dessa consulta devem ser
   resetados (string vazia / `undefined`), não mantidos com o valor
   anterior enquanto a nova resposta não chega.
2. **Popular apenas dados obtidos da fonte atual** — cada campo do
   formulário só pode receber valor da resposta da consulta **atual**. Se a
   fonte atual não trouxe aquele campo, o campo fica vazio.
3. **Nunca utilizar valores remanescentes da sessão/tela anterior** — o
   estado de uma consulta anterior (de outro CPF, CNPJ, CEP, cliente) não
   pode "vazar" para o resultado da consulta atual, mesmo que pareça
   conveniente para o usuário não "perder" o que já tinha digitado.
4. **Nunca usar fallback de campos visuais para preencher novos registros**
   — é proibido o padrão `respostaNova?.campo ?? estadoAtual.campo` (ou
   equivalente com `prev`/`d`/`f`/`atual`) para campos que vêm de uma
   consulta de identificação (CPF/CNPJ/cliente). Esse padrão é o que causa
   o vazamento documentado em
   [[vazamento-de-dados-entre-formularios]].

---

## Exemplos

### ❌ Incorreto

```ts
// Consulta CPF e mescla com o que já está na tela
const clienteDb = data.clienteExistente

setDados(d => ({
  ...d,
  nome:      nomeRfb || (clienteDb?.nome ?? d.nome),
  email:     clienteDb?.email ?? d.email,        // <- herda e-mail de outra pessoa
  telefone:  clienteDb?.celular ?? d.telefone,    // <- herda telefone de outra pessoa
  cep:       clienteDb?.cep ?? d.cep,             // <- herda endereço de outra pessoa
}))
```

```ts
// Auto-preenchimento que só atualiza "se vier algo"
if (ext.email) setEmail(ext.email)   // se vazio, mantém e-mail da consulta anterior
```

```ts
// Lookup que só age em caso de match — silencioso no caso contrário
const c = data.clientes?.[0]
if (c?.cpf === cpf) {
  setDados(d => ({ ...d, email: c.email ?? d.email /* ... */ }))
}
// se não houver match, NADA é limpo — dados antigos permanecem
```

### ✅ Correto

```ts
// Consulta CPF: campo dependente do cadastro local sempre parte de string vazia
const clienteDb = data.clienteExistente

setDados(d => ({
  ...d,
  // nome pode vir da Receita (fonte independente do clienteDb)
  nome:      nomeRfb || (clienteDb?.nome ?? ''),
  clienteId: clienteDb?.id ?? '',
  email:     clienteDb?.email ?? '',
  telefone:  clienteDb?.celular ?? '',
  cep:       clienteDb?.cep ? fmtCEP(clienteDb.cep) : '',
  logradouro: clienteDb?.logradouro ?? '',
  bairro:     clienteDb?.bairro ?? '',
  municipio:  clienteDb?.cidade ?? '',
  estado:     clienteDb?.estado ?? '',
}))
```

```ts
// Auto-preenchimento: sempre escreve o campo, com '' como padrão explícito
setEmail(ext.email ?? '')
setDocumento(docRaw ? formatar(docRaw) : '')
```

```ts
// Lookup com match: em caso de não-match, limpa explicitamente
const c = data.clientes?.[0]
if (c?.cpf === cpf) {
  setDados(d => ({ ...d, email: c.email ?? '', telefone: c.celular ?? '' /* ... */ }))
} else {
  setDados(d => ({ ...d, clienteId: '', email: '', telefone: '', cep: '', logradouro: '', bairro: '', municipio: '', estado: '' }))
}
```

---

## Exceções permitidas

- Campos que o **próprio usuário está digitando naquele momento** no
  formulário atual (ex.: o CEP que ele acabou de digitar, antes de a busca
  retornar) podem manter seu valor — a regra se aplica aos campos
  **resultado de uma consulta**, não ao campo de entrada da consulta em si.
- Estado de UI que não representa dado de cliente (ex.: `loading`, `etapa`,
  `step`, mensagens de erro) está fora do escopo desta regra.
- Cache técnico compartilhado por design (ex.: token de autenticação da
  Safeweb, `_tokenCache` em `src/lib/safeweb.ts`) não é "dado de
  formulário" e não está sujeito a esta regra.

---

## Aplicação

Esta regra é a base para corrigir os pontos pendentes listados em
[[vazamento-de-dados-entre-formularios]] e deve ser seguida em qualquer novo
formulário de cadastro/identificação criado no CertFlow.

Relacionado: [[consulta-cpf]] (primeira correção aplicada seguindo esta
regra, em `validarPF`).
