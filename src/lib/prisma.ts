import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function criarCliente() {
  const url = (process.env.DATABASE_URL ?? '').replace(/^﻿/, '')
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? criarCliente()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma