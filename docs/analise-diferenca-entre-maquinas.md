# Análise — onde o fluxo de "Nova Venda" pode parar antes do backend

Arquivo analisado: `src/app/(dashboard)/pedidos/nova-venda/wizard.tsx`
Rota chamada ao final: `POST /api/pedidos/nova-venda` (`src/app/api/pedidos/nova-venda/route.ts`)

Esta análise é **somente leitura** — nenhuma regra de negócio foi alterada.

---

## 1. Validações executadas no frontend ANTES da chamada da API

| Onde | O que valida | Linha |
|---|---|---|
| Step 1 — `validarCNPJ()` / `validarPF()` | CNPJ com 14 dígitos / CPF com 11 dígitos + data de nascimento preenchida | `wizard.tsx:247-248`, `406-408` |
| Step 1 — `consultarPrevia()` | Checagem Safeweb "ConsultaPrevia" (CPF/CNPJ cancelado, inapto, suspenso, divergência de nascimento) | `wizard.tsx:225-244`, usado em `262-265` (CNPJ) e `416-422` (CPF) |
| Step 1 → Step 2 | Botão "Avançar" só libera se `dados.validado === true` | `wizard.tsx:771` |
| Step 2 → Step 3 | Botão só libera se `dados.modeloId` estiver preenchido | `wizard.tsx:856` |
| Step 3 → Step 4/5 (`nextStep`) | Botão só libera se `nome`, `email`, `ddd` (2 dígitos) e `telefone` (9 dígitos) estiverem completos | `wizard.tsx:941` |
| Step 4 → Step 5 (PJ) | Botão só libera se `cnpj`, `razaoSocial`, `emailEmpresa`, `dddEmpresa` (2 dígitos) e `telEmpresa` (9 dígitos) estiverem completos | `wizard.tsx:1014` |
| Step 5 — `finalizar()` | Se `dados.agendar` for true, busca o horário do servidor (`/api/sistema/horario`) e bloqueia se o horário agendado já passou | `wizard.tsx:488-498` |
| Step 5 — botão "Finalizar" | Desabilitado apenas enquanto `loading === true` (não há outra trava de campos obrigatórios neste botão) | `wizard.tsx:1154` |

---

## 2. Pontos onde a execução pode ser interrompida ANTES de chegar ao backend

Nenhum desses pontos chama `/api/pedidos/nova-venda` — todos terminam a função antes do `fetch` final:

1. `validarCNPJ()` — encerra sem avançar se:
   - CNPJ ≠ 14 dígitos (`wizard.tsx:247`)
   - API de CNPJ retorna erro (`252`)
   - CPF do responsável não bate com a RFB (`262`)
   - `consultarPrevia` indica que o CNPJ/responsável não está liberado (`272`)
   - exceção de rede (`307`)
2. `validarPF()` — encerra sem avançar se:
   - CPF ≠ 11 dígitos ou data de nascimento vazia (`406-408`)
   - CPF não encontrado na Receita (`417`)
   - `consultarPrevia` indica que o CPF não está liberado (`424`)
   - exceção de rede (`452`)
3. `finalizar()` — encerra **sem chamar a API** se:
   - `dados.agendar === true` e o horário agendado já passou (`493-496`)
   - exceção lançada antes do `fetch` (capturada pelo `catch` genérico em `572`)

**Importante**: nenhum desses early-returns produz a tela "Pedido gerado com sucesso!" — essa tela só aparece depois que `setPedidoCriado(...)` é chamado em `wizard.tsx:571`, o que só acontece **depois** de `res.ok` ser `true` (ou seja, depois que o backend respondeu com sucesso).

---

## 3. Todos os `return` antecipados em funções do fluxo

| Função | Linha do `return` | Condição |
|---|---|---|
| `consultarPrevia` | 238, 239, 241 | resposta não-ok / sucesso / exceção |
| `validarCNPJ` | 247, 252, 262, 272 | validações de formato/RFB/Safeweb |
| `autoPreencherPorCNPJ` | 313, 323 | CNPJ ≠ 14 dígitos / cliente não encontrado |
| `buscarClientePorCPF` | 372 | CPF ≠ 11 dígitos |
| `validarPF` | 406 (implícito), 417, 424 | CPF inválido / não encontrado / não liberado |
| `buscarCep` | 465 | CEP ≠ 8 dígitos |
| `finalizar` | 495 | agendamento no passado |
| `salvarProtocolo` | 577 | sem `pedidoCriado` ou protocolo vazio |

---

## 4. `try/catch` que podem "engolir" erros silenciosamente

| Local | Comportamento no `catch` | Linha |
|---|---|---|
| `consultarPrevia` | retorna `null` silenciosamente (comentário no código diz explicitamente que não bloqueia o fluxo) | `240-242` |
| `validarCNPJ` | mostra `'Erro de conexão'` (visível ao usuário) | `307` |
| `autoPreencherPorCNPJ` | `catch {}` — **totalmente silencioso**, nada é mostrado nem logado | `367` |
| `buscarClientePorCPF` | `catch {}` — **totalmente silencioso** | `402` |
| `validarPF` | mostra `'Erro de conexão ao validar CPF'` (visível) | `452-454` |
| `buscarCep` | `catch {}` — **totalmente silencioso** | `480` |
| `finalizar` | mostra `'Erro de conexão'` (visível) — só dispara se o `fetch` em si falhar (rede), não se o backend responder com erro | `572` |

Nenhum desses `catch` está entre a montagem do `body` e o `fetch('/api/pedidos/nova-venda')` — ou seja, nenhum deles pode "engolir" um erro que impeça a chamada à API sem o usuário perceber (exceto os silenciosos de autopreenchimento, que apenas deixam campos vazios).

---

## 5. Dependências de `localStorage`, `sessionStorage`, cookies ou cache

Busca em todo `src/` por `localStorage`, `sessionStorage` e `document.cookie`:

- **Nenhum uso dentro de `wizard.tsx`** ou de qualquer arquivo do fluxo de Nova Venda / Safeweb / `route.ts`.
- Usos existentes no projeto (não relacionados a este fluxo):
  - `theme-toggle.tsx:13/23` e `layout.tsx:33` — tema claro/escuro (`certflow-theme`)
  - `agenda-tab.tsx:17/25` e `calendar-widget.tsx:11/16` — URL do calendário (`certflow_calendar_url`)
  - `widget-agenda-pessoal.tsx:21/26` — agenda pessoal por usuário
  - `meta-celebracao.tsx:20/73` e `welcome-popup.tsx:99/107` — flags de "já vi o popup hoje"
- **Service Worker** (`public/sw.js`): registrado em `layout.tsx:35`. Ele explicitamente **não intercepta** `/api/*` nem `/_next/*` (`sw.js:11-15`) e usa estratégia *network-first* para páginas, com cache só como fallback offline (`sw.js:17-29`). Ou seja, ele não pode estar servindo uma versão antiga da chamada de API nem dos bundles JS.
- Cookies: a sessão usa o cookie padrão do NextAuth (JWT), igual para qualquer máquina/navegador — não há cookie customizado no fluxo de pedidos.

**Conclusão do item 5**: não há nada client-side (localStorage/sessionStorage/cookie/cache/service worker) que possa fazer o fluxo se comportar de forma diferente entre a máquina do Vinicius e a do Arlen.

---

## 6. Condições que impedem a chamada da API

Resumo de tudo que pode impedir o `fetch('/api/pedidos/nova-venda')` de ser disparado:

- Qualquer um dos botões "Avançar" desabilitados (itens da seção 1) impede o usuário de SEQUER chegar ao Step 5.
- Em `finalizar()`, somente o agendamento no passado (`493-496`) impede a chamada — e isso mostra uma mensagem de erro vermelha na tela (`erroValidacao`), bem diferente da tela "Pedido gerado com sucesso!".
- Não existe nenhuma condição baseada em `localStorage`, `role`, `agr`, ou identidade da máquina que bloqueie a chamada.

---

## Observação importante sobre a evidência já coletada

O print de rede do teste do Arlen mostra:

```
nova-venda    201    fetch    9.28 s
```

Status **201 (Created)** significa que o `fetch('/api/pedidos/nova-venda')` **foi disparado e o backend respondeu com sucesso**, criando o pedido. A tela "Pedido gerado com sucesso!" com o campo de protocolo manual só aparece quando `result.safewebProtocolo` vem **vazio na resposta do servidor** (`wizard.tsx:589` e `601`), e isso só é decidido dentro de `route.ts` (lado servidor), não no navegador.

Ou seja: **com base na evidência atual, o frontend NÃO está abortando antes de enviar a requisição** — a requisição chega ao servidor e ele que decide não preencher `safewebProtocolo`. A ausência de logs `[Safeweb]` nos testes anteriores é mais provável de ter uma destas duas causas:

1. Uma exceção dentro do bloco assíncrono de geração do protocolo era **engolida silenciosamente** por `Promise.race([tarefa, limite]).catch(() => {})` em `route.ts`, sem nenhum log — isso foi corrigido no commit `1eea77e` (adiciona captura e log da exceção real).
2. O comando `vercel logs` perdeu/descartou linhas durante a captura ao vivo (streaming é instável para payloads grandes).

**Próximo passo recomendado**: repetir o teste agora que o commit `1eea77e` (logs de diagnóstico) está em produção — ele vai expor o motivo exato (erro/exceção ou resposta de rejeição da Safeweb) mesmo que a causa seja do lado do servidor.
