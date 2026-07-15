// Identificador fixo do recurso do Modo TV — não existe um "id" real (é um
// painel único), então usamos uma string constante como semente do HMAC de
// src/lib/token-publico.ts. Só quem tem o link gerado na Administração
// consegue montar a URL correta.
export const RECURSO_TV = 'performance-tv'
