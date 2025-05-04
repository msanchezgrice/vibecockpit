import { PrismaClient } from '@/generated/prisma';

// Extend the NodeJS Global type to allow for 'prisma'
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configure with better connection management
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
};

// Check if we are in production environment
const prisma = global.prisma ?? prismaClientSingleton();

// In development, attach to global object to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle application shutdown - crucial for connection cleanup
if (typeof window === 'undefined') { // Only in Node.js context, not browser
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma; 