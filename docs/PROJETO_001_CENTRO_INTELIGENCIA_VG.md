# PROJETO 001 — Centro de Inteligência e Automação V&G

> Status: **Documento de visão — pré-implementação**.
> Nenhum código deste projeto foi alterado para esta funcionalidade ainda.
> Este documento é a fonte oficial da verdade (Regra 8) para a visão de
> longo prazo do "Centro de Inteligência V&G" dentro do CertFlow.

## Visão Geral

O CertFlow não deve ser apenas um sistema de gestão. O objetivo é
transformá-lo gradualmente em uma plataforma operacional capaz de
observar, analisar, sugerir e executar processos da empresa.

A visão de longo prazo é que a equipe humana fique responsável apenas
pelas atividades que exigem intervenção humana real (atendimento
presencial, videoconferência, validações críticas e exceções
operacionais). Todo o restante deve ser progressivamente automatizado.

## Objetivo Principal

Criar uma nova camada dentro do CertFlow chamada **Centro de Inteligência
V&G**, responsável por:

1. Observar toda a operação.
2. Entender padrões.
3. Gerar indicadores.
4. Sugerir ações.
5. Executar ações autorizadas.

A evolução ocorrerá em fases.

---

## FASE 1 — Observador Operacional

**A IA não responde clientes. A IA não executa processos. A IA apenas
observa e aprende.**

### Fontes de dados

- **Digisac**: conversas, mensagens, tags, setores, atendentes, tempo de
  resposta, encerramentos.
- **CertFlow**: clientes, pedidos, certificados, renovações, protocolos,
  emissões, cancelamentos, financeiro, agenda.
- **Google Agenda**: eventos, AGR responsável, horários, duração,
  remarcações, cancelamentos.

### Banco de Conhecimento Operacional

Estrutura para armazenar:

- **Categorias de conversa**: Renovação, Primeiro certificado, Preço,
  Documentação, Agendamento, Problema técnico, Emissão online, Revogação,
  Certificado vencido.
- **Métricas**: quantidade, frequência, conversão, tempo médio de
  atendimento.

### Dashboard de Inteligência — `/inteligencia`

**Painel Executivo**, exibindo:

- **Top Motivos de Contato** (ex.: Renovação 42%, Preço 21%, Agendamento
  15%).
- **Top Objeções** (ex.: Preço, cliente sem tempo, vai decidir depois).
- **Top Perguntas** (ex.: "Quanto custa?", "Pode ser hoje?", "Quais
  documentos preciso?").
- **Taxa de Conversão** por AGR, canal e produto.
- **Clientes em Risco**: certificados próximos ao vencimento, sem
  resposta, sem agendamento.

---

## FASE 2 — Copiloto

A IA continua sem executar. Passa a sugerir.

- **Sugestão de Resposta**: analisa histórico do cliente, certificados
  ativos e conversas anteriores, e sugere uma resposta para o AGR.
- **Sugestão de Venda**: ex. cliente possui e-CNPJ A1 → IA sugere
  Renovação, Upgrade para A3, Seguro de Senha.
- **Sugestão de Agendamento**: consulta Google Agenda e disponibilidade
  dos AGRs, sugere melhor horário e melhor AGR.

---

## FASE 3 — Autopilot de Renovação

Primeira automação operacional real.

### Fluxo

1. Cliente aparece no Controle de Vencimentos → sistema inicia jornada
   automaticamente.
2. Enviar WhatsApp/e-mail informando vencimento.
3. Monitorar resposta (ex.: "Quero renovar", "Pode agendar", "Vamos
   fazer").
4. Identificar cliente existente — buscar automaticamente cliente,
   certificados, histórico e dados cadastrais.
5. Criar Pedido automaticamente, sem preenchimento manual.
6. Gerar protocolo automaticamente, usando os dados já existentes.
7. Agendar atendimento automaticamente.

### Regras de agendamento

Existem 3 AGRs com agenda compartilhada (Ana, Arlen, Vinicius). Podem
existir múltiplos atendimentos simultâneos.

- **Lógica**: cliente solicita horário X → IA consulta agenda de cada AGR
  em ordem e agenda com o primeiro disponível.
- **Caso todos ocupados**: NÃO agenda automaticamente. Cria tarefa para a
  equipe humana (ex.: "Cliente deseja atendimento imediato. Todos os AGRs
  estão ocupados. Avaliar encaixe.").

---

## FASE 4 — Executor Operacional

Após validação das fases anteriores, a IA poderá executar sem intervenção
humana:

- Renovações simples.
- Agendamentos.
- Criação de pedidos.
- Geração de protocolos.
- Atualizações cadastrais simples.

---

## Princípios Operacionais

1. **Nunca perder vendas** — se existir possibilidade de atendimento, a IA
   deve buscar encaixe.
2. **Velocidade acima de burocracia** — a V&G é reconhecida pela rapidez;
   a IA deve refletir essa cultura.
3. **Renovação é venda** — todo certificado próximo ao vencimento deve ser
   tratado como oportunidade comercial.
4. **Humano para exceções, IA para repetição** — a equipe foca em
   atendimento, casos complexos e exceções operacionais; a IA assume
   atividades repetitivas.

---

## Primeira Entrega Solicitada

Implementar **apenas a Fase 1**: observação, coleta de dados e dashboard
de inteligência. **Nenhuma execução automática. Nenhuma resposta
automática.**

Objetivo: permitir que a V&G compreenda profundamente sua operação antes
de ativar automações executoras (Fases 2-4).

---

## Relação com outros documentos

- [docs/AGENTE_IA_WHATSAPP.md](./AGENTE_IA_WHATSAPP.md) — documento de
  arquitetura (pré-implementação) de um agente de IA conversando
  diretamente com clientes via WhatsApp/Digisac.

  **Relação definida (12/06/2026):** o PROJETO 001 (Centro de
  Inteligência) é o guarda-chuva — a visão de longo prazo. O Agente IA
  WhatsApp é uma peça dentro dele: especificamente a parte de
  monitorar/categorizar/responder conversas do Digisac. A estrutura de
  categorização de conversas já desenhada em `AGENTE_IA_WHATSAPP.md`
  (categorias, regras de escalonamento, tabela `agente_ia_conversas`)
  deve ser incorporada e reaproveitada no planejamento técnico da Fase 1
  deste projeto, evitando duplicação de tabelas/estruturas de dados.

## Próximos passos

1. ~~Definir com o Vinicius a relação entre este documento e
   `AGENTE_IA_WHATSAPP.md`~~ — **concluído em 12/06/2026** (ver seção
   acima).
2. ~~Mapear o que já existe no CertFlow reaproveitável para a Fase 1~~ —
   **concluído em 12/06/2026**. Resumo do mapeamento:
   - **Digisac** (`src/lib/digisac.ts` + `src/app/api/digisac/webhook/route.ts`):
     hoje o webhook é *stateless* — recebe mensagens, responde via Claude
     Haiku para o número admin (Vinicius), mas não grava histórico de
     conversas em banco. Para a Fase 1 será necessário criar uma tabela
     de log de conversas (alinhada com `agente_ia_conversas` de
     `AGENTE_IA_WHATSAPP.md`) e interceptar o webhook para categorizar e
     persistir as mensagens, sem alterar o comportamento atual de
     resposta ao admin.
   - **Google Agenda** (`src/lib/google/calendar.ts` +
     `src/app/api/agenda/eventos/route.ts`): já funcional, retorna
     eventos com `inicio`, `fim`, `colorId`/calendário, permitindo
     identificar o AGR responsável (Ana, Arlen, Vinicius). Reaproveitável
     diretamente para métricas de agenda na Fase 1.
   - **Dados CertFlow** (Prisma: `Cliente`, `Certificado`, `Pedido`,
     `Lancamento`, `HistoricoContato`): já existem e já alimentam o
     Controle de Vencimentos. Reaproveitáveis sem alterações para
     "Clientes em Risco" e métricas de conversão por AGR/produto — apenas
     novas queries de agregação.
   - **Padrão de novas tabelas** (`scripts/migrate.js`, `CREATE TABLE IF
     NOT EXISTS`): confirmado e será seguido para qualquer nova tabela da
     Fase 1.
   - **Dashboard**: nova rota `/inteligencia` seguiria o padrão de
     `src/app/(dashboard)/dashboard/page.tsx` (Server Component + Prisma),
     com item novo em `src/components/sidebar.tsx` restrito a
     `ADMIN`/`GERENTE`.
3. Planejar a implementação técnica da Fase 1 como etapa separada, com
   análise de impacto (Regra 3) e atualização de `docs/changelog.md`
   (Regra 5) — próximo passo, ver plano de implementação a seguir.
