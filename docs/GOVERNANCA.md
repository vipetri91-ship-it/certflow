# Governança do ERP V&G (CertFlow)

> Vigente a partir de 10/06/2026. Este documento é a fonte oficial das
> regras de trabalho neste projeto (ver Regra 8 — `/docs` é a fonte oficial
> da verdade).

Este ERP encontra-se em operação e possui funcionalidades já validadas.

A partir deste momento nenhuma alteração pode ser realizada sem seguir as
regras abaixo.

## REGRA 1 — Documentação obrigatória

Toda funcionalidade existente deve possuir documentação.

Antes de alterar qualquer código:
- Verificar documentação existente
- Identificar impactos
- Informar riscos

Se não existir documentação:
- Criar documentação antes da alteração

## REGRA 2 — Funcionalidades congeladas

Funcionalidades que estejam funcionando não podem ser alteradas sem
autorização explícita.

Antes de qualquer alteração:
- Explicar o motivo
- Explicar o impacto
- Explicar o risco

Aguardar aprovação.

## REGRA 3 — Análise de impacto

Antes de modificar qualquer arquivo, realizar análise completa contendo:
- Arquivos afetados
- Funcionalidades afetadas
- Integrações afetadas
- Banco de dados afetado
- Risco de regressão

Registrar a análise.

## REGRA 4 — Auditoria de bugs

Sempre que um bug for corrigido:
1. Identificar causa raiz
2. Documentar causa raiz
3. Procurar o mesmo padrão em todo o projeto
4. Informar outros locais afetados
5. Criar proteção contra recorrência

Nenhum bug pode ser tratado como caso isolado.

## REGRA 5 — Log de alterações

Toda alteração deve gerar documentação.

Criar ou atualizar `docs/changelog.md` informando:
- Data
- Arquivos alterados
- Motivo
- Impacto
- Autor

## REGRA 6 — Testes obrigatórios

Antes de publicar, executar testes relacionados.

Registrar:
- O que foi testado
- Resultado
- Possíveis riscos

## REGRA 7 — Proibição de suposições

Nunca assumir regras de negócio.

Quando existir dúvida:
- Perguntar
- Documentar
- Aguardar confirmação

## REGRA 8 — Fonte oficial da verdade

Os documentos dentro de `/docs` são a fonte oficial da verdade.

O código deve seguir a documentação. Nunca alterar comportamento
documentado sem autorização explícita.

## REGRA 9 — Auditoria contínua

Sempre que finalizar uma tarefa, analisar se existem:
- Bugs semelhantes
- Fluxos inconsistentes
- Duplicidade de lógica
- Riscos de segurança
- Riscos de LGPD
- Dados persistindo indevidamente

Documentar achados.

## REGRA 10 — Modo produção

Este sistema está em produção.

Assuma que qualquer alteração pode impactar:
- Vendas
- Emissões
- Clientes
- Financeiro
- Integrações Safeweb

Agir com máxima cautela.
