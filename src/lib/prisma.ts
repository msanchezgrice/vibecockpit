import { PrismaClient } from '@/generated/prisma';

// Extend the NodeJS Global type to allow for 'prisma'
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Default to a dummy URL during build time if DATABASE_URL is not available
// This prevents build failures but won't actually connect to a database
const databaseUrl = process.env.DATABASE_URL || 
  (process.env.VERCEL_ENV === 'production' ? 
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      `postgresql://postgres:postgres@${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '')}:5432/postgres` :
      'postgresql://postgres:postgres@localhost:5432/postgres' : 
    'postgresql://postgres:postgres@localhost:5432/postgres');

// Configure with better connection management
const prismaClientSingleton = () => {
  // Skip database connections during build time in Vercel
  if (process.env.NEXT_PUBLIC_SKIP_DB_CONN === 'true') {
    console.log('🔶 Skipping database connection during build');
    // Return a mock PrismaClient to prevent build errors
    return new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/postgres'
        }
      }
    });
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl
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