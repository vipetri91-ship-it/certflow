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