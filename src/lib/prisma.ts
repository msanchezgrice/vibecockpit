import { PrismaClient } from '@/generated/prisma';

// Create an interface for our mock client that matches the relevant properties of PrismaClient
interface PrismaClientInterface {
  $disconnect?: () => Promise<void>;
  [key: string]: unknown;
}

// Extend the NodeJS Global type to allow for 'prisma'
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | PrismaClientInterface | undefined;
}

// Determine if we're in a build/preview environment
const isBuildOrPreview = process.env.NODE_ENV === 'production' && 
  (process.env.VERCEL_ENV === 'preview' || 
   process.env.NEXT_PUBLIC_SKIP_DB_CONN === 'true' ||
   process.env.VERCEL_ENV === undefined);

// Create a mock PrismaClient that doesn't connect to a database
// This is used during build time or when DATABASE_URL is not available
class PrismaMock implements PrismaClientInterface {
  [key: string]: unknown;
  
  constructor() {
    return new Proxy<PrismaClientInterface>(this, {
      get: (_target, prop) => {
        // Return a function that returns a Promise for any property access
        return () => {
          console.log(`Mock PrismaClient: ${String(prop)} called`);
          return Promise.resolve([]);
        };
      }
    });
  }
}

// Initialize PrismaClient based on environment
function createPrismaClient(): PrismaClient | PrismaClientInterface {
  if (isBuildOrPreview) {
    console.log('🔷 Using mock PrismaClient during build/preview');
    return new PrismaMock();
  }

  try {
    // For actual runtime in development or production
    console.log('🟢 Connecting to database with real PrismaClient');
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error('⚠️ Failed to initialize PrismaClient', error);
    // Fallback to mock if we can't initialize the real client
    return new PrismaMock();
  }
}

// In development, we want to use a singleton to prevent multiple connections
const prisma = global.prisma || createPrismaClient();

// Prevent multiple instances during hot module reloading in development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle application shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    // Only disconnect if it's a real PrismaClient
    if (prisma.$disconnect && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  });
}

export default prisma; 