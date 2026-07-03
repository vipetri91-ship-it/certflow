# Regra Oficial de Geração de Protocolo Safeweb

**Versão:** 1.0  
**Data:** 09/06/2026  
**Status:** IMUTÁVEL — nenhuma alteração é permitida sem autorização explícita do proprietário do sistema (Vinicius Petri / V&G Certificadora Digital)

---

## Princípio Fundamental

O protocolo Safeweb **sempre deve ser gerado automaticamente** pelo sistema no momento em que uma nova venda é registrada.

O atendente **nunca deve precisar digitar o número do protocolo manualmente.**

Qualquer comportamento que leve à exibição de um campo de entrada manual de protocolo representa uma falha no sistema e deve ser corrigida imediatamente.

---

## Quando o Protocolo é Gerado

O protocolo é gerado automaticamente sempre que o tipo de atendimento da venda for um dos três abaixo:

| Tipo de Atendimento | Código na API Safeweb |
|---|---|
| Videoconferência | `Add/3` |
| Presencial | `Add/1` |
| Emissão Online | `Add/5` |

Para qualquer outro tipo de atendimento, o protocolo não se aplica e não é gerado.

---

## Sequência Obrigatória

A geração do protocolo segue esta sequência — toda alteração de código deve preservá-la integralmente:

### Passo 1 — Autenticação
O sistema obtém um token JWT da Safeweb via:
```
POST {SAFEWEB_BASE_URL}/Shared/HubAutenticacao/Autenticacoes/api/autorizacao/token
Authorization: Basic {base64(SAFEWEB_IDENTIFICADOR:SAFEWEB_SEGREDO)}
```
O token é armazenado em cache por até 9 minutos (renovado com margem de 60 segundos antes do vencimento de 10 minutos).

### Passo 2 — Busca do Produto
Antes de criar o protocolo, o sistema identifica o `idProduto` Safeweb correspondente ao modelo de certificado vendido:
```
GET /Shared/Product/api/GetListProdutoByAR/{idTipoEmissao}/{SAFEWEB_CNPJ_AR}
```
A correspondência é feita por: tipo de pessoa (PF/PJ), modelo (A1/A3), validade (1 ano / 2 anos) e suporte (NUVEM/TOKEN/CARTAO/ARQUIVO).

**Certificados A1 (arquivo) são SEMPRE roteados para Add/5 (Emissão Online)**, independente do tipo de atendimento selecionado na venda. O redirecionamento ocorre automaticamente no fluxo de nova venda antes da busca de produto. (Adicionado 03/07/2026 — A1 via Add/3 disparava ACI.)

Para certificados do tipo **NUVEM**, o tipo de emissão é o selecionado na venda — o sistema NÃO tenta `5 → 3 → 1` em sequência. Se o produto não for encontrado com o tipo informado, a venda falha com erro claro. (Comportamento alterado em 25/06/2026 para evitar troca silenciosa de tipo de emissão.)

### Passo 3 — [Somente Emissão Online] Validação do Certificado A3 PF
```
GET /Shared/Partner/api/EmitirCertificadoOnline/{numeroSerie}/{idProduto}/{SAFEWEB_CNPJ_AR}
```
Retorna o `protocoloOrigem` do certificado A3 PF existente, que é incluído na criação do novo protocolo.

### Passo 4 — Criação do Protocolo
```
POST /Shared/Partner/api/Add/{idTipoEmissao}
```

#### Payload obrigatório — Pessoa Física (CPF)
```json
{
  "CnpjAR":         "<SAFEWEB_CNPJ_AR>",
  "CodigoParceiro": "<SAFEWEB_CODIGO_AR>",
  "idProduto":      12345,
  "Nome":           "Nome completo do titular",
  "CPF":            "00000000000",
  "DataNascimento": "DD/MM/YYYY",
  "Contato": {
    "DDD":      "11",
    "Telefone": "999999999",
    "Email":    "email@dominio.com"
  },
  "PaisTelefone": { "CodigoAlpha2": "BR" },
  "Endereco": {
    "Logradouro":          "Rua Exemplo",
    "Numero":              "123",
    "Complemento":         "",
    "Bairro":              "Centro",
    "UF":                  "SP",
    "Cidade":              "São Paulo",
    "CodigoIbgeMunicipio": "3550308",
    "CodigoIbgeUF":        "35",
    "CEP":                 "01310100"
  },
  "ClienteNotaFiscal": {
    "Sacado":           "Nome completo do titular",
    "Documento":        "00000000000",
    "Endereco":         "Rua Exemplo",
    "Numero":           "123",
    "Complemento":      null,
    "Bairro":           "Centro",
    "CEP":              "01310100",
    "Cidade":           "São Paulo",
    "CidadeCodigo":     "3550308",
    "UF":               "SP",
    "UFCodigo":         "35",
    "Pais":             "Brasil",
    "PaisCodigoAlpha3": "BRA",
    "Email1":           "email@dominio.com",
    "Email2":           "",
    "IE":               ""
  },
  "UrlSolicitacao": "https://certflow-nine.vercel.app/api/safeweb/webhook"
}
```

#### Payload obrigatório — Pessoa Jurídica (CNPJ)
```json
{
  "CnpjAR":         "<SAFEWEB_CNPJ_AR>",
  "CodigoParceiro": "<SAFEWEB_CODIGO_AR>",
  "idProduto":      12345,
  "RazaoSocial":    "Razão Social da Empresa",
  "NomeFantasia":   "Nome Fantasia",
  "CNPJ":           "00000000000000",
  "Contato": {
    "DDD":      "11",
    "Telefone": "999999999",
    "Email":    "email@dominio.com"
  },
  "PaisTelefone": { "CodigoAlpha2": "BR" },
  "Endereco":     { "...mesmos campos do PF..." },
  "Titular": {
    "Nome":           "Nome do responsável PF",
    "CPF":            "00000000000",
    "DataNascimento": "DD/MM/YYYY",
    "Contato":        { "DDD": "11", "Telefone": "999999999", "Email": "email@dominio.com" },
    "PaisTelefone":   { "CodigoAlpha2": "BR" },
    "Endereco":       { "...mesmos campos..." }
  },
  "ClienteNotaFiscal": { "...mesmos campos do PF, com CNPJ no Documento..." },
  "UrlSolicitacao": "https://certflow-nine.vercel.app/api/safeweb/webhook"
}
```

#### Regras críticas dos campos
- `idProduto` é **Number**, não String
- `CPF`, `CNPJ`, `CEP` devem ter **somente números** (sem pontos, traços, barras)
- `CodigoParceiro` é o UUID da variável `SAFEWEB_CODIGO_AR`
- `CnpjAR` é o CNPJ da AR da variável `SAFEWEB_CNPJ_AR`
- `CidadeCodigo` e `UFCodigo` são os **códigos IBGE** — obtidos via API pública `servicodados.ibge.gov.br`
- `UrlSolicitacao` é a URL do webhook do sistema (não `urlNotificacao`)

### Passo 5 — Leitura do Protocolo Retornado

**REGRA CRÍTICA:** A Safeweb retorna o protocolo como uma **string direta** (ex: `"1010766479"`), e não como um objeto JSON com campo nomeado.

A leitura do protocolo deve sempre incluir o fallback `data ??` para capturar a resposta em formato de string direta:

```typescript
const protocolo = String(
  data.Protocolo ?? data.protocolo ??
  data.NumeroProtocolo ?? data.numeroProtocolo ??
  data.Id ?? data.id ?? data ?? ''
)
```

Remover o `data ??` desta linha faz o protocolo ser lido como vazio, resultando na exibição da tela de protocolo manual — que é o comportamento proibido.

### Passo 6 — [Somente Videoconferência] Integração Hope Portal
```
POST /Hope/Shared/api/integration/solicitation
Authorization: Bearer {token}

{
  "protocol":            "1010766479",
  "attendancePlaceId":   <SAFEWEB_ATTENDANCE_PLACE_ID>,
  "aciRemovalCandidate": false
}
```
Retorna a URL do portal de documentos (`hopeUrlDocumentos`), que é exibida ao atendente como botão "Anexar documentação".

---

## Onde os Dados São Armazenados

Tabela: `pedidos` no banco PostgreSQL (Neon)

| Campo | Descrição |
|---|---|
| `safewebProtocolo` | Número do protocolo retornado pela Safeweb |
| `numeroCompra` | Cópia do mesmo protocolo — usado pelo Hope para localizar o pedido via webhook |
| `hopeUrlDocumentos` | Link do Hope Portal para anexo de documentos |
| `safewebSerieA3` | Número de série do cert A3 PF usado na emissão online |
| `safewebStatus` | Último evento recebido via webhook da Safeweb |
| `status` | Status do pedido: `GERADO` → `VERIFICADO` → `EMITIDO` → `CANCELADO` |
| `emitidoEm` | Timestamp da emissão |
| `verificadoEm` | Timestamp da verificação de cadastro |

---

## Webhook — Ciclo de Vida Pós-Protocolo

Após a criação do protocolo, a Safeweb envia notificações automáticas para:
```
POST /api/safeweb/webhook
```

Mapeamento de eventos para status:

| Evento Safeweb | Status no CertFlow |
|---|---|
| `emissao` | `EMITIDO` |
| `validacao` (somente certificados **A1 arquivo**) | `EMITIDO` (A1 via Add/5 não recebe evento `emissao` — confirmado 03/07/2026) |
| `cancelamento` / `revogacao` | `CANCELADO` |
| `verificacao` / `confirmacao` (aprovado) | `VERIFICADO` (nunca regride de EMITIDO — adicionado 03/07/2026) |
| `verificacao` / `confirmacao` (recusado) | sem mudança de status |
| `Solicitação`, `Validação` (demais tipos) e outros | sem mudança de status |

A comparação de eventos ignora acentos e maiúsculas (normalização NFD).

---

## Dependências Externas Obrigatórias

| Variável de Ambiente | Descrição |
|---|---|
| `SAFEWEB_IDENTIFICADOR` | Login da AR |
| `SAFEWEB_SEGREDO` | Senha da AR |
| `SAFEWEB_CODIGO_AR` | UUID do parceiro (CodigoParceiro) |
| `SAFEWEB_CNPJ_AR` | CNPJ da AR |
| `SAFEWEB_BASE_URL` | URL base da API Safeweb |
| `SAFEWEB_ATTENDANCE_PLACE_ID` | ID do local de atendimento no Hope |
| `NEXTAUTH_URL` | URL do sistema (para montar a UrlSolicitacao) |

| API Externa | Uso |
|---|---|
| `pss.safewebpss.com.br` | Autenticação, produtos, protocolos |
| `Hope Portal` (mesmo domínio, path `/Hope/`) | Vinculação ao portal de documentos |
| `servicodados.ibge.gov.br` | Códigos IBGE de município e UF |

---

## Arquivos de Implementação

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/safeweb.ts` | Toda a lógica de comunicação com a API Safeweb |
| `src/app/api/pedidos/nova-venda/route.ts` | Orquestração do fluxo de nova venda |
| `src/app/api/safeweb/webhook/route.ts` | Recebimento de notificações da Safeweb |

---

## Histórico

| Data | Evento |
|---|---|
| 08/06/2026 | Protocolo automático funcionando em produção pela primeira vez (commit `2cf79a7`) |
| 09/06/2026 | Quebrado por refatorações indevidas; restaurado para o estado original (commit `520a622`) |
| 09/06/2026 | Este documento criado para evitar regressões futuras |
| 25/06/2026 | Removida tentativa automática 5→3→1 para NUVEM — troca silenciosa de tipo de emissão causou incidente |
| 03/07/2026 | A1 (arquivo) sempre Add/5 — corrige ACI ativada erroneamente em e-CNPJ A1 (PED-202607-39860) |
| 03/07/2026 | Corrigido `aciRemovalCandidate: true → false` no Hope — confirmado com Safeweb que `true` CAUSA ACI obrigatória |
| 03/07/2026 | Adicionada regra: `validacao` + A1 → EMITIDO; `verificacao/confirmacao` nunca regride EMITIDO |
| 03/07/2026 | Corrigido formato DataNascimento: o código envia DD/MM/YYYY (não YYYY-MM-DD) — documentação corrigida |