// Dados mockados do CertFlow Future Lab (/dashboard-future).
// Nenhuma integração real — apenas para fins de prova de conceito visual.

export interface NucleoOperacional {
  saude: number // 0-100
  status: 'critico' | 'atencao' | 'estavel' | 'otimo'
  tendencia: 'subindo' | 'descendo' | 'estavel'
  pulsosPorMinuto: number
}

export const nucleoOperacional: NucleoOperacional = {
  saude: 87,
  status: 'otimo',
  tendencia: 'subindo',
  pulsosPorMinuto: 72,
}

export interface InsightIA {
  id: string
  texto: string
  prioridade: 'alta' | 'media' | 'baixa'
  categoria: 'comercial' | 'agenda' | 'financeiro' | 'equipe' | 'cliente'
}

export const insightsIA: InsightIA[] = [
  { id: 'ia-1', texto: 'Você possui 3 clientes aguardando retorno há mais de 24h.', prioridade: 'alta', categoria: 'cliente' },
  { id: 'ia-2', texto: 'Ana Karolina está 18% abaixo da meta semanal.', prioridade: 'media', categoria: 'equipe' },
  { id: 'ia-3', texto: 'Existem 2 agendamentos com risco de atraso nas próximas 2h.', prioridade: 'alta', categoria: 'agenda' },
  { id: 'ia-4', texto: 'Previsão de faturamento hoje: R$ 4.870,00.', prioridade: 'baixa', categoria: 'financeiro' },
  { id: 'ia-5', texto: 'Existe uma oportunidade de venda parada há 5 dias — Construtora Vega Ltda.', prioridade: 'media', categoria: 'comercial' },
  { id: 'ia-6', texto: 'Pico de emissões previsto entre 14h e 16h. Equipe operacional alocada.', prioridade: 'baixa', categoria: 'agenda' },
]

export type TipoSinal = 'cliente' | 'tarefa' | 'venda' | 'protocolo' | 'pendencia'

export interface SinalRadar {
  id: string
  tipo: TipoSinal
  label: string
  urgencia: number // 0-100, quanto maior mais perto do centro
  angulo: number // posição em graus (0-360)
}

export const sinaisRadar: SinalRadar[] = [
  { id: 'r-1', tipo: 'pendencia', label: 'Protocolo 1010781571 aguardando validação', urgencia: 95, angulo: 20 },
  { id: 'r-2', tipo: 'cliente', label: 'Construtora Vega — retorno pendente', urgencia: 80, angulo: 95 },
  { id: 'r-3', tipo: 'tarefa', label: 'Conferir agenda de amanhã', urgencia: 45, angulo: 160 },
  { id: 'r-4', tipo: 'venda', label: 'Proposta enviada — Indústria Solaris', urgencia: 60, angulo: 210 },
  { id: 'r-5', tipo: 'protocolo', label: 'Emissão certificado e-CPF — João Mendes', urgencia: 30, angulo: 270 },
  { id: 'r-6', tipo: 'cliente', label: 'Renovação vencendo em 3 dias — Padaria Bom Pão', urgencia: 70, angulo: 320 },
]

export type FaseTempo = 'passado' | 'presente' | 'futuro'

export interface EventoTimeline {
  id: string
  fase: FaseTempo
  hora: string
  titulo: string
  descricao: string
  tipo: 'emissao' | 'venda' | 'agenda' | 'financeiro' | 'sistema'
}

export const eventosTimeline: EventoTimeline[] = [
  { id: 't-1', fase: 'passado', hora: '08:12', titulo: 'Certificado e-CNPJ emitido', descricao: 'Cliente: Mercado Bom Preço', tipo: 'emissao' },
  { id: 't-2', fase: 'passado', hora: '09:40', titulo: 'Pagamento confirmado', descricao: 'R$ 320,00 — Boleto compensado', tipo: 'financeiro' },
  { id: 't-3', fase: 'passado', hora: '10:55', titulo: 'Nova venda fechada', descricao: 'AGR: Carlos Eduardo — e-CPF A3', tipo: 'venda' },
  { id: 't-4', fase: 'presente', hora: 'agora', titulo: 'Agendamento em andamento', descricao: 'Validação biométrica — sala 2', tipo: 'agenda' },
  { id: 't-5', fase: 'futuro', hora: '14:30', titulo: 'Agendamento confirmado', descricao: 'Emissão e-CPF — Maria Souza', tipo: 'agenda' },
  { id: 't-6', fase: 'futuro', hora: '16:00', titulo: 'Renovação automática prevista', descricao: '4 certificados vencendo esta semana', tipo: 'sistema' },
  { id: 't-7', fase: 'futuro', hora: '17:30', titulo: 'Fechamento do caixa diário', descricao: 'Conciliação financeira automática', tipo: 'financeiro' },
]

export interface FatorEnergia {
  label: string
  valor: number // 0-100
}

export const energiaEmpresa = {
  percentual: 87,
  fatores: [
    { label: 'Produtividade', valor: 91 },
    { label: 'Vendas', valor: 84 },
    { label: 'Agenda', valor: 78 },
    { label: 'Financeiro', valor: 95 },
    { label: 'Metas', valor: 82 },
    { label: 'Equipe', valor: 88 },
  ] as FatorEnergia[],
}

export const visaoExecutiva = {
  riscos: [
    'Renovação de 4 certificados vence em até 3 dias',
    'Protocolo Safeweb pendente de validação há 2h',
  ],
  oportunidades: [
    'Construtora Vega — proposta de R$ 12.400 parada há 5 dias',
    '6 clientes elegíveis para upgrade de certificado A1 → A3',
  ],
  gargalos: [
    'Fila de validação biométrica com 3 atendimentos simultâneos',
  ],
  colaboradoresSuporte: [
    { nome: 'Ana Karolina', motivo: '18% abaixo da meta semanal' },
  ],
  clientesCriticos: [
    { nome: 'Padaria Bom Pão', motivo: 'Renovação vence em 3 dias' },
    { nome: 'Construtora Vega', motivo: 'Sem retorno há 5 dias' },
  ],
}

export const missaoDoDia = {
  titulo: 'Emissões do dia',
  objetivo: 12,
  concluidas: 8,
  faltam: 4,
  probabilidadeSucesso: 92,
}

export interface ColaboradorRede {
  id: string
  nome: string
  cargo: string
  produtividade: number // 0-100
  cargaOperacional: number // 0-100
  desempenho: number // 0-100
  atividadeAtual: string
}

export const equipeRede: ColaboradorRede[] = [
  { id: 'c-1', nome: 'Vinicius Petri', cargo: 'Diretor', produtividade: 95, cargaOperacional: 60, desempenho: 97, atividadeAtual: 'Revisão estratégica' },
  { id: 'c-2', nome: 'Ana Karolina', cargo: 'Comercial', produtividade: 70, cargaOperacional: 85, desempenho: 72, atividadeAtual: 'Prospecção ativa' },
  { id: 'c-3', nome: 'Carlos Eduardo', cargo: 'AGR', produtividade: 88, cargaOperacional: 75, desempenho: 90, atividadeAtual: 'Atendimento presencial' },
  { id: 'c-4', nome: 'Mariana Lopes', cargo: 'Operacional', produtividade: 92, cargaOperacional: 80, desempenho: 94, atividadeAtual: 'Validação biométrica' },
  { id: 'c-5', nome: 'João Mendes', cargo: 'Financeiro', produtividade: 85, cargaOperacional: 55, desempenho: 89, atividadeAtual: 'Conciliação bancária' },
]

export interface FluxoFinanceiroPonto {
  hora: string
  entrada: number
  saida: number
}

export const fluxoFinanceiro = {
  saudeFinanceira: 95,
  previsaoHoje: 4870,
  pontos: [
    { hora: '08h', entrada: 320, saida: 0 },
    { hora: '09h', entrada: 540, saida: 120 },
    { hora: '10h', entrada: 890, saida: 0 },
    { hora: '11h', entrada: 650, saida: 300 },
    { hora: '12h', entrada: 410, saida: 0 },
    { hora: '13h', entrada: 980, saida: 150 },
    { hora: '14h', entrada: 1080, saida: 0 },
  ] as FluxoFinanceiroPonto[],
}
