export const TIPO_EMAIL_LABELS: Record<string, { label: string; desc: string; icone: string }> = {
  VENCIMENTO_60: { label: '60 dias antes do vencimento', desc: 'Aviso antecipado para planejar renovação', icone: '📅' },
  VENCIMENTO_30: { label: '30 dias antes do vencimento', desc: 'Lembrete de renovação próxima', icone: '⏰' },
  VENCIMENTO_15: { label: '15 dias antes do vencimento', desc: 'Alerta urgente de vencimento', icone: '⚠️' },
  VENCIMENTO_7:  { label: '7 dias antes do vencimento',  desc: 'Aviso crítico — último chamado', icone: '🚨' },
  POS_EMISSAO:   { label: 'Após emissão do certificado', desc: 'Boas-vindas e orientações de uso', icone: '✅' },
  NUTRICAO_3M:   { label: '3 meses após emissão',        desc: 'Dicas e benefícios do certificado digital', icone: '💡' },
  NUTRICAO_6M:   { label: '6 meses após emissão',        desc: 'Segurança e boas práticas', icone: '🔒' },
  NUTRICAO_9M:          { label: '9 meses após emissão',        desc: 'Planejamento de renovação',                   icone: '🔄' },
  CAMPANHA_MARKETING:   { label: 'Campanha de marketing',         desc: 'Disparo manual para segmento de clientes',    icone: '📢' },
}
