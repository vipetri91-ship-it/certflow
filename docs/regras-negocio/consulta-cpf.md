# Consulta de CPF — Step "Responsável" (Nova Venda)

## Onde

`src/app/(dashboard)/pedidos/nova-venda/wizard.tsx`, função `validarPF()`,
chamada ao validar o CPF + data de nascimento do responsável/titular.

## Bug corrigido

**Persistência indevida de dados entre consultas de CPF.**

### Causa

Ao montar os dados do formulário após a consulta, os campos dependentes do
cadastro local (`clienteDb`) usavam o padrão:

```ts
clienteDb?.campo ?? d.campo
```

Quando o CPF consultado **não tinha** cadastro de cliente no banco
(`clienteDb` indefinido), o `?? d.campo` mantinha o valor que já estava
preenchido na tela — geralmente os dados de uma consulta de CPF *anterior*,
de outra pessoa, feita na mesma sessão do wizard.

Exemplo real: consultando o CPF da pessoa A (sem cadastro), o nome veio
corretamente da Receita Federal, mas e-mail, telefone e endereço continuaram
sendo os da pessoa B, consultada antes na mesma tela.

### Correção

Em `validarPF()`, ao montar o novo estado:

- Se `clienteDb` existe → usa os dados do cadastro local normalmente.
- Se `clienteDb` **não existe** → os campos dependentes são **limpos**
  (string vazia / `{ ddd: '', telefone: '' }`), em vez de herdar `d.campo`.

```ts
setDados(d => ({
  ...d,
  validado:        true,
  nomeResponsavel: nomeRfb || (clienteDb?.nome ?? d.nomeResponsavel),
  nome:            nomeRfb || (clienteDb?.nome ?? d.nome),
  clienteId:       clienteDb?.id ?? '',
  email:           clienteDb?.email ?? '',
  ...telefoneFromCelular(clienteDb?.celular, clienteDb?.ddd, { ddd: '', telefone: '' }),
  pisNis:          clienteDb?.pisNis ?? '',
  cep:             clienteDb?.cep ? fmtCEP(clienteDb.cep) : '',
  logradouro:      clienteDb?.logradouro ?? '',
  numero:          clienteDb?.numero ?? '',
  bairro:          clienteDb?.bairro ?? '',
  municipio:       clienteDb?.cidade ?? '',
  estado:          clienteDb?.estado ?? '',
}))
```

## Regras obrigatórias (mantidas a partir desta correção)

1. Ao consultar um novo CPF sem cadastro local (`clienteDb` ausente), todos
   os campos dependentes do cadastro devem iniciar **vazios**.
2. Nenhum dado de uma consulta anterior (de outro CPF) pode permanecer na
   tela.
3. O **nome** retornado pela Receita Federal (`nomeRfb`) pode ser mantido —
   é a única informação que não depende do `clienteDb`.
4. Os campos **e-mail, telefone (DDD + número), CEP, logradouro, número,
   bairro, cidade e UF** devem ser limpos sempre que não houver `clienteDb`
   válido para o CPF consultado.

## Não afetado

- `clienteId` agora também é limpo quando não há `clienteDb` — evita que um
  novo pedido seja associado por engano ao cliente da consulta anterior.
- O fluxo PJ (`autoPreencherPorCNPJ`) e a busca por CPF no Step 1
  (`buscarClientePorCPF`) não foram alterados — só atualizam a tela quando
  encontram um `cliente.cpf` correspondente, então não sofriam deste
  problema.

Relacionado: deploy `c0e4ed5` (10/06/2026).
