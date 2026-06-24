// Máscaras progressivas para campos de formulário (aceitam string parcial,
// formatam enquanto o usuário digita). Diferente de formatarCPF/formatarCNPJ/
// formatarTelefone em `utils.ts`, que assumem o valor já completo e são
// usadas para exibição (tabelas, páginas de detalhe). Centraliza 4+6+3+5
// reimplementações idênticas espalhadas pelos formulários de cadastro
// (ver docs/ROADMAP_CORRECOES.md, P2.1).

export function mascararCPF(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '')
}

export function mascararCNPJ(v: string): string {
  return v.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '')
}

export function mascararTelefone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

export function mascararCEP(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '')
}
