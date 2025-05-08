import { PrismaClient } from '@/generated/prisma';

// Create an interface for our mock client that matches the relevant properties of PrismaClient
interface PrismaClientInterface {
  $disconnect?: () => Promise<void>;
  $connect?: () => Promise<void>;
  [key: string]: unknown;
  
  // Define model properties to match Prisma client naming (camelCase)
  project: unknown;
  account: unknown;
  session: unknown;
  user: unknown;
  verificationToken: unknown;
  changeLogEntry: unknown;
  costSnapshot: unknown;
  analyticsSnapshot: unknown;
  checklistItem: unknown;
}

// Define a type for our mock entities
interface BaseMockEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
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

// Create sample mock data for relations
const createMockEntity = (modelName: string, id?: string): BaseMockEntity => {
  const mockId = id || 'mock-id-123';
  // Base entity that all models will have
  const baseEntity: BaseMockEntity = {
    id: mockId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Add model-specific fields
  switch (modelName) {
    case 'project':
      return {
        ...baseEntity,
        name: 'Mock Project',
        description: 'A mock project for build time',
        status: 'design',
        frontendUrl: 'https://example.com',
        githubRepo: 'user/repo',
      };
    case 'checklistItem':
      return {
        ...baseEntity,
        title: 'Mock Task',
        is_complete: false,
        projectId: 'mock-project-id',
        order: 0,
        ai_help_hint: null,
        ai_image_prompt: null,
        // Include relation
        project: createMockEntity('project', 'mock-project-id'),
      };
    default:
      return baseEntity;
  }
};

// Create a mock query handler that returns empty results
const createQueryHandler = (modelName = '') => {
  return new Proxy({}, {
    get: (_target, prop) => {
      // Handle common Prisma query methods
      if (prop === 'findUnique' || prop === 'findFirst') {
        return (params?: { where?: unknown; include?: unknown }) => {
          console.log(`Mock ${modelName}.${String(prop)} called with params:`, params);
          
          // Return a mock entity with relations if include is specified
          if (params?.include) {
            const mockEntity = createMockEntity(modelName);
            return Promise.resolve(mockEntity);
          }
          
          return Promise.resolve(null);
        };
      }
      
      if (prop === 'findMany') {
        return () => Promise.resolve([]);
      }
      
      if (prop === 'create' || prop === 'update' || prop === 'upsert' || prop === 'delete') {
        return (params?: unknown) => {
          console.log(`Mock ${modelName}.${String(prop)} called with params:`, params);
          return Promise.resolve(createMockEntity(modelName));
        };
      }
      
      if (prop === 'count' || prop === 'aggregate') {
        return () => Promise.resolve(0);
      }
      
      // Handle any unknown props by returning another proxy
      return createQueryHandler(`${modelName}.${String(prop)}`);
    },
  });
};

// Create a mock PrismaClient that doesn't connect to a database
// This is used during build time or when DATABASE_URL is not available
class PrismaMock implements PrismaClientInterface {
  [key: string]: unknown;
  
  // Define all models from the Prisma schema with client naming convention (camelCase)
  project: unknown;
  account: unknown;
  session: unknown;
  user: unknown;
  verificationToken: unknown;
  changeLogEntry: unknown;
  costSnapshot: unknown;
  analyticsSnapshot: unknown;
  checklistItem: unknown;
  
  constructor() {
    // Initialize all model properties with the query handler
    this.project = createQueryHandler('project');
    this.account = createQueryHandler('account');
    this.session = createQueryHandler('session');
    this.user = createQueryHandler('user');
    this.verificationToken = createQueryHandler('verificationToken');
    this.changeLogEntry = createQueryHandler('changeLogEntry');
    this.costSnapshot = createQueryHandler('costSnapshot');
    this.analyticsSnapshot = createQueryHandler('analyticsSnapshot');
    this.checklistItem = createQueryHandler('checklistItem');
    
    // Add disconnect/connect methods
    this.$disconnect = async () => Promise.resolve();
    this.$connect = async () => Promise.resolve();
    
    // Log that we're using the mock
    console.log('🔶 Using PrismaMock - database operations will return empty results');
    
    return this;
  }
  
  $disconnect = async (): Promise<void> => Promise.resolve();
  $connect = async (): Promise<void> => Promise.resolve();
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