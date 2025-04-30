import { PrismaClient } from '@/generated/prisma';

// Extend the NodeJS Global type to allow for 'prisma'
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Check if we are in production environment
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Check if prisma instance already exists in the global object during development
  if (!global.prisma) {
    // If not, create a new instance and store it in the global object
    global.prisma = new PrismaClient();
  }
  // Use the instance from the global object
  prisma = global.prisma;
}

export default prisma; 