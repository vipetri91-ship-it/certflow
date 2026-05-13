import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarData(data: Date | string): string {
  return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatarDataHora(data: Date | string): string {
  return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatarMoeda(valor: number | string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor))
}

export function formatarCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatarTelefone(tel: string): string {
  const nums = tel.replace(/\D/g, '')
  if (nums.length === 11) return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function diasParaVencimento(dataVencimento: Date | string): number {
  return differenceInDays(new Date(dataVencimento), new Date())
}

export function gerarNumeroPedido(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `PED-${ano}${mes}-${rand}`
}

export function tempoRelativo(data: Date | string): string {
  return formatDistanceToNow(new Date(data), { addSuffix: true, locale: ptBR })
}