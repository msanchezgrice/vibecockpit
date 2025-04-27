import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient, Prisma } from '@/generated/prisma';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();

// Zod schema for creating a project
const createProjectSchema = z.object({
  name: z.string().min(1, { message: 'Project name cannot be empty' }),
  description: z.string().optional(),
  frontendUrl: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')),
  vercelProjectId: z.string().optional(),
  githubRepo: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/, {
    message: 'GitHub Repo must be in format owner/repo'
  }).optional(),
  // status defaults to 'design' in the database schema
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // You might want to associate projects with users later
  // const userId = session.user?.id;

  switch (req.method) {
    case 'GET':
      try {
        const projects = await prisma.project.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            costSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            analyticsSnapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            changelog: { // Include latest changelog entries
                orderBy: { createdAt: 'desc' },
                take: 3, // Fetch the latest 3 entries
            },
          },
        });
        // Map the result slightly to make accessing snapshots easier on the client
        // No longer need to map snapshots here as the include does it.
        // We can rename the type if needed, but the structure is Project + relations
        res.status(200).json(projects); // Send the full structure
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        res.status(500).json({ message: 'Failed to fetch projects' });
      }
      break;

    case 'POST':
      try {
        // Validate required fields and known optional ones
        const validatedData = createProjectSchema.parse(req.body);
        
        // Log the raw body as well for comparison
        console.log("Raw body received by POST /api/projects:", req.body);
        console.log("Validated data by POST /api/projects:", validatedData);

        // Use validated data for required/formatted fields, but access original body for potentially stripped optional fields
        const newProject = await prisma.project.create({
          data: {
            name: validatedData.name, // Use validated name
            description: req.body.description || null, // Use raw body value
            frontendUrl: validatedData.frontendUrl || null, // Use validated/formatted URL
            vercelProjectId: req.body.vercelProjectId || null, // Use raw body value
            githubRepo: req.body.githubRepo || null, // Use raw body value
          },
        });
        res.status(201).json(newProject);
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ message: 'Invalid input', errors: error.errors });
        } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error('Failed to create project:', error);
          if (error.code === 'P2002') {
             res.status(409).json({ message: 'A project with this name already exists' });
          } else {
             res.status(500).json({ message: 'Failed to create project' });
          }
        } else {
          console.error('Unexpected error creating project:', error);
          res.status(500).json({ message: 'Failed to create project' });
        }
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 