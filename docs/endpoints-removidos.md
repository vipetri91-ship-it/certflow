# Endpoints removidos

Registro de endpoints removidos do sistema, conforme
[docs/AUDITORIA_GERAL_DO_SISTEMA.md](./AUDITORIA_GERAL_DO_SISTEMA.md) e
Regra 5 da [Governança do ERP V&G](./GOVERNANCA.md).

---

## `/api/test-db`

- **Finalidade original**: endpoint de diagnóstico criado para testar a
  conexão com o banco de dados (contava registros na tabela `usuario` e
  retornava parte da `DATABASE_URL` para conferência).
- **Motivo da remoção**: em caso de erro na consulta ao banco, o endpoint
  retornava `process.env.DATABASE_URL` **completo** (usuário, senha e host
  do Postgres) na resposta JSON, sem exigir autenticação — vazamento
  crítico de credenciais (item crítico de segurança da
  `AUDITORIA_GERAL_DO_SISTEMA.md`). O endpoint não era referenciado por
  nenhuma tela, regra de negócio ou integração.
- **Data da remoção**: 10/06/2026.

---

## `/api/test-auth`

- **Finalidade original**: endpoint de diagnóstico criado para testar se a
  senha `certflow@2024` era válida para o usuário
  `admin@certflow.com.br`, retornando o resultado da comparação, a role do
  usuário e os primeiros caracteres do hash da senha.
- **Motivo da remoção**: não exigia autenticação — qualquer pessoa podia
  acessar a rota repetidamente e usá-la como oráculo de força bruta da
  senha do administrador, além de vazar parte do hash e a role do usuário
  (item crítico de segurança da `AUDITORIA_GERAL_DO_SISTEMA.md`). O
  endpoint não era referenciado por nenhuma tela, regra de negócio ou
  integração.
- **Data da remoção**: 15/06/2026 (ONDA 3 / P0.1).

---

## `/api/test-email`

- **Finalidade original**: endpoint de diagnóstico para enviar um e-mail de
  teste (via SMTP da V&G) para um endereço informado por query string
  (`?para=`), usado para validar a configuração de SMTP.
- **Motivo da remoção**: não exigia autenticação — qualquer pessoa podia
  usar o SMTP da V&G para enviar e-mails a destinatários arbitrários e
  obter informações sobre a configuração (`SMTP_FROM`, `SMTP_HOST`). O
  endpoint não era referenciado por nenhuma tela, regra de negócio ou
  integração.
- **Data da remoção**: 15/06/2026 (ONDA 3 / P0.1).

---

## `/api/test-whatsapp`

- **Finalidade original**: endpoint de diagnóstico para enviar uma mensagem
  de WhatsApp de teste (via canal Digisac da V&G) para um número informado
  por query string (`?para=`), usado para validar a configuração do
  Digisac.
- **Motivo da remoção**: não exigia autenticação — qualquer pessoa podia
  usar o canal Digisac da V&G para enviar mensagens a números arbitrários e
  obter o `DIGISAC_CHANNEL_ID`. O endpoint não era referenciado por nenhuma
  tela, regra de negócio ou integração.
- **Data da remoção**: 15/06/2026 (ONDA 3 / P0.1).