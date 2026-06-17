export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return

  const { reconciliarEmitidos } = await import('./lib/reconciliar-emitidos')

  // Auditoria única na inicialização do servidor — corrige qualquer inconsistência
  // que tenha ocorrido antes do deploy atual. O fluxo normal (PATCH + webhook)
  // cria certificado e lançamento de forma síncrona, então este check serve
  // apenas como rede de segurança para casos de falha inesperada.
  reconciliarEmitidos()
    .then(r => {
      if (r.certificadosCriados.length || r.lancamentosCriados.length) {
        console.warn('[Inicialização] Inconsistências corrigidas:', r)
      }
    })
    .catch(e => console.error('[Inicialização] Falha na reconciliação:', e))
}