# Relatório — Dados criados hoje (10/06/2026)

**Apenas levantamento. Nenhum dado foi excluído.**

Período considerado: 10/06/2026 00:00 (horário de Brasília) até o momento da
consulta (~19:50). Levantamento feito via endpoint temporário
`/api/admin/diagnostico-limpeza`.

---

## ⚠️ Atenção antes de excluir qualquer coisa

1. **4 protocolos Safeweb REAIS foram gerados** para pedidos que já estão
   `CANCELADO` no nosso sistema (testes de hoje):
   - `1010781571` (Arlen Junior — PED-202606-15449)
   - `1010781647` (Laryssa — PED-202606-28769)
   - `1010782402` (Ana Karolina — PED-202606-69746)
   - `1010782465` (Antonio Fernando Leme — PED-202606-68833)

   Cancelar/excluir esses pedidos **no CertFlow não cancela o protocolo na
   Safeweb**. Se esses protocolos não devem existir de verdade, é preciso
   verificar/cancelar manualmente no portal da Safeweb.

2. **PED-202606-57872 (ALINE ZWIR ODONTOLOGIA INTEGRADA LTDA)** está com
   status `EMITIDO` e já tem um **certificado ATIVO** gerado (válido até
   10/06/2027). É o único pedido de hoje com certificado emitido. **Confirme
   se este pedido é teste ou venda real** antes de incluí-lo em qualquer
   limpeza — os dados (CNPJ 47257006000102, mesma empresa citada na auditoria
   de hoje) sugerem que pode ter sido usado como caso de teste, mas o
   resultado (certificado ativo) é indistinguível de uma emissão real.

3. Os usuários envolvidos (Ana Karolina, Arlen Junior, Laryssa, Vinicius)
   são **contas reais de produção** — não existem "usuários de teste"
   separados. A limpeza deve remover os *registros* criados durante os
   testes, não os usuários.

---

## 1. Clientes cadastrados hoje (7)

| ID | Nome | Tipo | CPF/CNPJ | Criado em | Pedidos | Certificados | Impacto da exclusão |
|---|---|---|---|---|---|---|---|
| `cmq82t08q000004l228qe4w3g` | AGROINDUSTRIA PIRACAIA LTDA | PJ | 25344757000123 | 12:59:52 | 1 (52453) | 0 | Excluir exige excluir/realocar antes o pedido 52453 e o lançamento financeiro vinculado. |
| `cmq82t0fg000104l2pm1fks7l` | ADRIANO DOS ANJOS MACAIRA | PF | 13154958800 | 12:59:53 | 0 | 0 | Sem pedidos/certificados vinculados — exclusão direta sem efeitos colaterais. (Cadastro de responsável da Agroindustria Piracaia) |
| `cmq82u3td000004lbjul4k0fw` | ALINE ZWIR ODONTOLOGIA INTEGRADA LTDA | PJ | 47257006000102 | 13:00:44 | 1 (57872) | **1 (ATIVO)** | ⚠️ Tem certificado ATIVO + pedido EMITIDO + protocolo gerado. Ver alerta acima. |
| `cmq82u3zy000104lb5yjwbhhz` | ALINE ZWIR FARIA | PF | 33428531825 | 13:00:44 | 0 | 0 | Sem pedidos/certificados vinculados — exclusão direta sem efeitos colaterais. (Responsável da Aline Zwir Odontologia) |
| `cmq83i2xj000004l42l7rmjdg` | ARLEN JUNIOR DUARTE DA SILVA | PF | 03475909260 | 13:19:22 | 6 | 0 | Excluir exige tratar antes os 6 pedidos (ver seção 3) e os 6 lançamentos vinculados. |
| `cmq8b73xg000005l70srqn4cp` | ANA KAROLINA LIMA ALVES DOS SANTOS | PF | 43887483820 | 16:54:47 | 4 | 0 | Excluir exige tratar antes os 4 pedidos (ver seção 3) e os 4 lançamentos vinculados. |
| `cmq8hact2000004jvtd1909tk` | ANTONIO FERNANDO LEME | PF | 24493732849 | 19:45:16 | 1 (68833) | 0 | Pedido CANCELADO com **protocolo Safeweb real gerado** (1010782465) — ver alerta 1. |

Observação: registros de auditoria (`Cliente:DELETE`, seção 9) mostram que
estes mesmos clientes (exceto Antonio Fernando Leme, criado depois) já foram
"excluídos" às 18:51–18:52 por Vinicius. Como ainda aparecem aqui, a exclusão
no CertFlow é **lógica/soft-delete** (campo `ativo = false`), não remove a
linha do banco — e por isso o cadastro de Ana e do Arlen continuou sendo
encontrado em consultas de CPF posteriores (pedidos criados depois das
18:52).

---

## 2. Protocolos Safeweb gerados hoje (7)

| Protocolo | Pedido | Status do pedido | AGR | Criado em | Impacto da exclusão |
|---|---|---|---|---|---|
| `1010773546` | PED-202606-71696 | GERADO | vinicius | 13:01:21 | Pedido real (cliente VASP, pré-existente). Não recomendado excluir. |
| `1010773917` | PED-202606-83781 | GERADO | vinicius | 13:13:02 | Pedido de teste (cliente Vinicius Petri, valor R$0). Protocolo real existe na Safeweb. |
| `1010774660` | PED-202606-49741 | GERADO | vinicius | 13:24:22 | Pedido de teste (cliente Vinicius Petri, valor R$0). Protocolo real existe na Safeweb. |
| `1010781571` | PED-202606-15449 | **CANCELADO** | arlen | 19:05:00 | Já cancelado no CertFlow, mas protocolo segue ativo na Safeweb — ver alerta 1. |
| `1010781647` | PED-202606-28769 | **CANCELADO** | laryssa | 19:08:14 | Já cancelado no CertFlow, mas protocolo segue ativo na Safeweb — ver alerta 1. |
| `1010782402` | PED-202606-69746 | **CANCELADO** | ana.karolina | 19:42:09 | Já cancelado no CertFlow, mas protocolo segue ativo na Safeweb — ver alerta 1. |
| `1010782465` | PED-202606-68833 | **CANCELADO** | ana.karolina | 19:45:17 | Já cancelado no CertFlow, mas protocolo segue ativo na Safeweb — ver alerta 1. |

---

## 3. Pedidos gerados hoje (18)

| ID | Número | Status | AGR | Cliente | Valor | Criado em | Itens/Lançamentos | Impacto da exclusão |
|---|---|---|---|---|---|---|---|---|
| `cmq82t0ma...` | PED-202606-52453 | GERADO | arlen | Agroindustria Piracaia | 215 | 12:59:53 | 1 item / 1 lançamento | Excluir item + lançamento junto. Sem protocolo/certificado. |
| `cmq82u46r...` | PED-202606-57872 | **EMITIDO** | ana.karolina | Aline Zwir Odontologia | 215 | 13:00:44 | 1 item / 1 lançamento / **1 certificado ATIVO** | ⚠️ Ver alerta 2 — tem certificado ativo emitido. |
| `cmq82uwlf...` | PED-202606-71696 | GERADO | vinicius | VASP Serviços e Negócios | 215 | 13:01:21 | 1 item / 1 lançamento | Protocolo real `1010773546` gerado. Cliente pré-existente — provavelmente venda real, não teste. |
| `cmq839xut...` | PED-202606-83781 | GERADO | vinicius | Vinicius Antonio Silveira Petri | 0 | 13:13:02 | 1 item / 1 lançamento | Protocolo real `1010773917` gerado (teste). |
| `cmq83i34v...` | PED-202606-64011 | GERADO | arlen | Arlen Junior Duarte da Silva | 0 | 13:19:22 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq83oi40...` | PED-202606-49741 | GERADO | vinicius | Vinicius Antonio Silveira Petri | 0 | 13:24:22 | 1 item / 1 lançamento | Protocolo real `1010774660` gerado (teste). |
| `cmq83uu04...` | PED-202606-13919 | GERADO | arlen | Arlen Junior Duarte da Silva | 0 | 13:29:17 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq84b62g...` | PED-202606-11611 | GERADO | arlen | Arlen Junior Duarte da Silva | 0 | 13:41:59 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq856yjk...` | PED-202606-76951 | GERADO | arlen | Arlen Junior Duarte da Silva | 0 | 14:06:43 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq85ehrg...` | PED-202606-47734 | GERADO | arlen | Vinicius Antonio Silveira Petri | 0 | 14:12:34 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq85lw9l...` | PED-202606-56484 | GERADO | arlen | Arlen Junior Duarte da Silva | 0 | 14:18:19 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq8b744n...` | PED-202606-42012 | GERADO | ana.karolina | Ana Karolina Lima Alves dos Santos | 60 | 16:54:47 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq8be26p...` | PED-202606-94656 | GERADO | ana.karolina | Ana Karolina Lima Alves dos Santos | 60 | 17:00:12 | 1 item / 1 lançamento | Sem protocolo. |
| `cmq8f6uaq...` | PED-202606-55386 | GERADO | ana.karolina | Ana Karolina Lima Alves dos Santos | 60 | 18:46:33 | 1 item / 1 lançamento | `safewebStatus`: "Telefone do titular não é válido." (rejeitado, sem protocolo). |
| `cmq8fukda...` | PED-202606-15449 | **CANCELADO** | arlen | Arlen Junior Duarte da Silva | 0 | 19:05:00 | 1 item / 1 lançamento | Protocolo real `1010781571` — ver alerta 1. |
| `cmq8fypx0...` | PED-202606-28769 | **CANCELADO** | laryssa | Laryssa Schiave Bueno de Oliveira | 60 | 19:08:14 | 1 item / 1 lançamento | Protocolo real `1010781647` — ver alerta 1. |
| `cmq8h6cd8...` | PED-202606-69746 | **CANCELADO** | ana.karolina | Ana Karolina Lima Alves dos Santos | 165 | 19:42:09 | 1 item / 1 lançamento | Protocolo real `1010782402` — ver alerta 1. |
| `cmq8had0i...` | PED-202606-68833 | **CANCELADO** | ana.karolina | Antonio Fernando Leme | 165 | 19:45:17 | 1 item / 1 lançamento | Protocolo real `1010782465` — ver alerta 1. |

---

## 4. Certificados de teste criados hoje (1)

| ID | Cliente | Modelo | Status | Emissão | Vencimento | Pedido | Impacto da exclusão |
|---|---|---|---|---|---|---|---|
| `cmq83bzl1000704l2r3v0r53m` | Aline Zwir Odontologia Integrada Ltda | E-CNPJ A1 - 12 Meses | ATIVO | 10/06/2026 13:14 | 10/06/2027 13:14 | PED-202606-57872 | ⚠️ Único certificado ATIVO de hoje — ver alerta 2. Excluir remove o registro do certificado, mas não revoga nada na Safeweb (certificado A1 não passa pelo fluxo de protocolo/Safeweb da mesma forma que A3). |

---

## 5. Lançamentos financeiros criados hoje (18)

Todos os 18 pedidos de hoje geraram automaticamente 1 lançamento `RECEBER`
com status `PENDENTE` (descrito na seção 6, são a mesma lista). Nenhum
lançamento foi pago (`dataPagamento` nulo em todos).

---

## 6. Contas a receber geradas hoje (18)

| ID | Descrição | Valor | Pedido (referência) | Criado em |
|---|---|---|---|---|
| `cmq82t332...` | AGROINDUSTRIA PIRACAIA LTDA — PED-202606-52453 | 215 | PED-202606-52453 | 12:59:56 |
| `cmq82u6v3...` | ALINE ZWIR ODONTOLOGIA INTEGRADA LTDA — PED-202606-57872 | 215 | PED-202606-57872 | 13:00:48 |
| `cmq82v9bj...` | VASP SERVICOS E NEGOCIOS LTDA — PED-202606-71696 | 215 | PED-202606-71696 | 13:01:37 |
| `cmq83a7cf...` | Vinicius Petri — PED-202606-83781 | 0 | PED-202606-83781 | 13:13:15 |
| `cmq83i5og...` | ARLEN JUNIOR DUARTE DA SILVA — PED-202606-64011 | 0 | PED-202606-64011 | 13:19:26 |
| `cmq83onkf...` | Vinicius Petri — PED-202606-49741 | 0 | PED-202606-49741 | 13:24:29 |
| `cmq83uvsi...` | ARLEN JUNIOR DUARTE DA SILVA — PED-202606-13919 | 0 | PED-202606-13919 | 13:29:19 |
| `cmq84b8eh...` | ARLEN JUNIOR DUARTE DA SILVA — PED-202606-11611 | 0 | PED-202606-11611 | 13:42:02 |
| `cmq85713e...` | ARLEN JUNIOR DUARTE DA SILVA — PED-202606-76951 | 0 | PED-202606-76951 | 14:06:46 |
| `cmq85ek6a...` | VINICIUS ANTONIO SILVEIRA PETRI — PED-202606-47734 | 0 | PED-202606-47734 | 14:12:37 |
| `cmq85ly7i...` | ARLEN JUNIOR DUARTE DA SILVA — PED-202606-56484 | 0 | PED-202606-56484 | 14:18:22 |
| `cmq8b76lc...` | ANA KAROLINA LIMA ALVES DOS SANTOS — PED-202606-42012 | 60 | PED-202606-42012 | 16:54:51 |
| `cmq8be4id...` | ANA KAROLINA LIMA ALVES DOS SANTOS — PED-202606-94656 | 60 | PED-202606-94656 | 17:00:15 |
| `cmq8f6wq2...` | ANA KAROLINA LIMA ALVES DOS SANTOS — PED-202606-55386 | 60 | PED-202606-55386 | 18:46:36 |
| `cmq8fuqda...` | ARLEN JUNIOR DUARTE DA SILVA — PED-202606-15449 | 0 | PED-202606-15449 | 19:05:08 |
| `cmq8fyvv7...` | LARYSSA SCHIAVE BUENO DE OLIVEIRA — PED-202606-28769 | 60 | PED-202606-28769 | 19:08:22 |
| `cmq8h6ipl...` | ANA KAROLINA LIMA ALVES DOS SANTOS — PED-202606-69746 | 165 | PED-202606-69746 | 19:42:17 |
| `cmq8haixs...` | ANTONIO FERNANDO LEME — PED-202606-68833 | 165 | PED-202606-68833 | 19:45:24 |

**Impacto da exclusão**: todos com `pedidoId` apontando para os pedidos da
seção 3. A relação `Lancamento → Pedido` não tem `onDelete: Cascade`
configurado — ou seja, os lançamentos precisam ser excluídos **antes** (ou
junto) dos respectivos pedidos, senão a exclusão do pedido pode falhar por
restrição de chave estrangeira.

Total em valores "fictícios" pendentes: somando os de valor > 0 que
correspondem a testes (52453: 215, 71696: 215 — possivelmente reais; demais
de teste: 57872: 215, 42012: 60, 94656: 60, 55386: 60, 28769: 60, 69746: 165,
68833: 165).

---

## 7. Históricos criados hoje (0)

Nenhum registro em `historico_contatos` (tabela de histórico de contato com
clientes) foi criado hoje. Nada a listar/excluir nesta categoria.

---

## 8. Logs relacionados aos testes

### 8.1 E-mails automáticos (`email_logs`) — 0
Nenhum e-mail automático foi disparado hoje.

### 8.2 Auditoria (`audit_logs`) — 34 registros

| Ação | Entidade | Quantidade |
|---|---|---|
| CREATE | Pedido | 18 |
| UPDATE | Pedido | 8 |
| UPDATE | Cliente | 2 |
| DELETE | Cliente | 6 |

Os 6 registros `Cliente:DELETE` (18:51–18:52, todos por Vinicius Petri)
correspondem aos clientes: Agroindustria Piracaia, Aline Zwir Odontologia,
Aline Zwir Faria, Arlen Junior Duarte da Silva e Adriano dos Anjos Macaira —
todos da seção 1.

**Impacto da exclusão**: registros de `audit_logs` apontam para
`entidadeId` via campo livre (sem FK), então excluir os pedidos/clientes
acima **não quebra** os logs de auditoria — eles ficam "órfãos" (referência a
um ID que não existe mais), mas isso já é o comportamento normal do sistema
para qualquer exclusão. Pode-se manter os logs de auditoria como histórico
ou excluí-los junto, sem risco técnico.

---

## 9. Usuários utilizados nos testes (4)

| ID | Nome | E-mail | Role | Pedidos criados hoje |
|---|---|---|---|---|
| `cmpg0wblw000004i66nz0d2fi` | Ana Karolina | anakarolinaalvessantos@gmail.com | OPERADOR | 4 |
| `cmq6ngyl6000604jgzfztksni` | Arlen Junior | — | OPERADOR | 7 |
| `cmq6ncvoo000104jgux3aie6s` | Laryssa Schiave Bueno de Oliveira | — | OPERADOR | 1 |
| `admin01` | Vinicius Petri | vinicius.petri@vegcertificado.com.br | ADMIN | 2 |

**Importante**: são contas reais de operadores em produção, **não devem ser
excluídas**. A limpeza deve focar apenas nos registros das seções 1–8.

---

## Resumo executivo

| Categoria | Quantidade hoje |
|---|---|
| Clientes novos | 7 |
| Pedidos | 18 (14 GERADO/EMITIDO, 4 CANCELADO) |
| Protocolos Safeweb gerados (reais) | 7 |
| Certificados emitidos | 1 (ATIVO) |
| Lançamentos/Contas a receber | 18 (todos PENDENTE) |
| Históricos de contato | 0 |
| E-mails automáticos | 0 |
| Logs de auditoria | 34 |
| Usuários envolvidos | 4 (todos contas reais — não excluir) |

**Pontos que precisam de decisão sua antes de qualquer exclusão:**
1. O que fazer com os 4 protocolos Safeweb reais de pedidos já cancelados
   (alerta 1).
2. Confirmar se o pedido PED-202606-57872 / certificado ATIVO da Aline Zwir
   Odontologia é teste ou venda real (alerta 2).
3. Confirmar se PED-202606-71696 (VASP, protocolo `1010773546`) e
   PED-202606-52453 (Agroindustria Piracaia) são vendas reais — usam
   clientes que já existiam ou têm CNPJ de empresa real, então podem não ser
   teste.

Depois dessas confirmações, posso preparar a lista final "pode excluir com
segurança" e o roteiro de exclusão (ordem: lançamentos → itens/certificados
→ pedidos → clientes), sempre aguardando sua aprovação antes de rodar
qualquer `DELETE`.
