import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __contentAssistantPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__contentAssistantPrisma__ ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__contentAssistantPrisma__ = prisma;
}
