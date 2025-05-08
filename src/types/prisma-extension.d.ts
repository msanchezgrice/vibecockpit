import { PrismaClient } from '@/generated/prisma';
import { Prisma } from '@/generated/prisma';

/**
 * This file extends the Prisma types globally to help TypeScript
 * properly recognize model properties during build time when using the mock client.
 */

// Add type declarations for model queries
type ModelQuery = {
  findUnique: (args: any) => Promise<any>;
  findFirst: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  upsert: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<any>;
  count: (args: any) => Promise<number>;
  aggregate: (args: any) => Promise<any>;
  createMany: (args: any) => Promise<any>;
}

// Declare module augmentation to extend Prisma for build time
declare global {
  // Extend the property naming to match Prisma models
  interface PrismaBuildModels {
    project: ModelQuery;
    user: ModelQuery;
    account: ModelQuery;
    session: ModelQuery;
    verificationToken: ModelQuery;
    changeLogEntry: ModelQuery;
    costSnapshot: ModelQuery;
    analyticsSnapshot: ModelQuery;
    checklistItem: ModelQuery;
  }

  // Augment the PrismaClient
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient & PrismaBuildModels;
    }
  }
}

// Extend PrismaClient to include our models
declare module '@/lib/prisma' {
  export interface PrismaClient extends PrismaBuildModels {}
} 