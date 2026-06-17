export async function register() {
  // Apenas no runtime Node.js (não roda no edge)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // Apenas em produção — em dev recarregamentos criariam múltiplos intervalos
  if (process.env.NODE_ENV !== 'production') return

  const { reconciliarEmitidos } = await import('./lib/reconciliar-emitidos')

  // Roda imediatamente ao iniciar e depois a cada 30 minutos
  reconciliarEmitidos().catch(e => console.error('[Cron] Falha na reconciliação inicial:', e))

  setInterval(() => {
    reconciliarEmitidos().catch(e => console.error('[Cron] Falha na reconciliação periódica:', e))
  }, 30 * 60 * 1000)

  console.log('[Cron] Reconciliação de emitidos agendada (intervalo: 30 min)')
}