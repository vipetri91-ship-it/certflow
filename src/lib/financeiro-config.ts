export const TIPOS_CONTA_RECEBER = ['Única', 'Fixa', 'Parcelada', 'Certificado'] as const
export const TIPOS_CONTA_PAGAR  = ['Única', 'Fixa', 'Parcelada'] as const
export const CENTROS_CUSTO      = ['Piracaia', 'Bragança Paulista'] as const
export const FORMAS_PAGAMENTO   = ['PIX', 'Boleto', 'Cartão', 'Dinheiro', 'Transferência'] as const
export const BANCOS             = ['Inter', 'Nubank', 'Bradesco', 'Itaú', 'Caixa', 'Sicoob', 'Santander', 'BB'] as const

export const STATUS_BADGE: Record<string, string> = {
  PENDENTE:  'bg-yellow-100 text-yellow-700',
  PAGO:      'bg-green-100 text-green-700',
  VENCIDO:   'bg-red-100 text-red-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
}