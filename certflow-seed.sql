-- Usuário administrador (senha: certflow@2024)
INSERT INTO "usuarios" ("id","nome","email","senha","role","ativo","createdAt","updatedAt") VALUES
('admin01','Administrador','admin@certflow.com.br','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oZ8X.8huy','ADMIN',true,NOW(),NOW())
ON CONFLICT ("email") DO NOTHING;

-- Categorias financeiras
INSERT INTO "categorias_financeiras" ("id","nome","tipo","cor","ativo","createdAt") VALUES
('cat01','Certificados Digitais','RECEITA','#3b82f6',true,NOW()),
('cat02','Comissões Parceiros','DESPESA','#f97316',true,NOW()),
('cat03','Aluguel','DESPESA','#ef4444',true,NOW()),
('cat04','Salários','DESPESA','#8b5cf6',true,NOW()),
('cat05','Marketing','DESPESA','#ec4899',true,NOW()),
('cat06','Taxas e Impostos','DESPESA','#6b7280',true,NOW()),
('cat07','Outros (Receita)','RECEITA','#10b981',true,NOW()),
('cat08','Outros (Despesa)','DESPESA','#9ca3af',true,NOW())
ON CONFLICT ("id") DO NOTHING;

-- Modelos de certificado
INSERT INTO "modelos_certificado" ("id","nome","tipoPessoa","tipoCertificado","suporte","validadeMeses","preco","ativo","createdAt","updatedAt") VALUES
('mod01','e-CPF A1','PF','A1','ARQUIVO',12,180.00,true,NOW(),NOW()),
('mod02','e-CPF A3 Token','PF','A3','TOKEN',36,350.00,true,NOW(),NOW()),
('mod03','e-CPF A3 Cartão','PF','A3','CARTAO',36,380.00,true,NOW(),NOW()),
('mod04','e-CPF A3 Nuvem','PF','A3','NUVEM',12,280.00,true,NOW(),NOW()),
('mod05','e-CNPJ A1','PJ','A1','ARQUIVO',12,250.00,true,NOW(),NOW()),
('mod06','e-CNPJ A3 Token','PJ','A3','TOKEN',36,450.00,true,NOW(),NOW()),
('mod07','e-CNPJ A3 Cartão','PJ','A3','CARTAO',36,480.00,true,NOW(),NOW()),
('mod08','e-CNPJ A3 Nuvem','PJ','A3','NUVEM',12,350.00,true,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;

-- Templates de e-mail
INSERT INTO "templates_email" ("id","tipo","assunto","corpo","ativo","updatedAt") VALUES
('tpl01','VENCIMENTO_60','⚠️ Seu certificado digital vence em 60 dias','Template 60 dias',true,NOW()),
('tpl02','VENCIMENTO_30','⚠️ Seu certificado digital vence em 30 dias','Template 30 dias',true,NOW()),
('tpl03','VENCIMENTO_15','🚨 Seu certificado digital vence em 15 dias','Template 15 dias',true,NOW()),
('tpl04','VENCIMENTO_7','🔴 URGENTE: Certificado vence em 7 dias','Template 7 dias',true,NOW()),
('tpl05','POS_EMISSAO','✅ Certificado emitido com sucesso!','Template pós-emissão',true,NOW()),
('tpl06','NUTRICAO_3M','💡 Dicas para seu certificado digital','Template nutrição 3m',true,NOW()),
('tpl07','NUTRICAO_6M','🔒 Mantenha seu certificado seguro','Template nutrição 6m',true,NOW()),
('tpl08','NUTRICAO_9M','🔄 Hora de planejar a renovação!','Template nutrição 9m',true,NOW())
ON CONFLICT ("tipo") DO NOTHING;

SELECT 'Seed concluído com sucesso!' as resultado;
