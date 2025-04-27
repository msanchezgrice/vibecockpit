import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient, Prisma } from '@/generated/prisma';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();

// Zod schema for creating a project
const createProjectSchema = z.object({
  name: z.string().min(1, { message: 'Project name cannot be empty' }),
  frontendUrl: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')),
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
            costSnapshots: { // Include the latest cost snapshot
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            analyticsSnapshots: { // Include the latest analytics snapshot
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
          },
        });
        // Map the result slightly to make accessing snapshots easier on the client
        const projectsWithData = projects.map(p => ({
            ...p,
            latestCostSnapshot: p.costSnapshots[0] ?? null,
            latestAnalyticsSnapshot: p.analyticsSnapshots[0] ?? null,
        }));
        res.status(200).json(projectsWithData);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        res.status(500).json({ message: 'Failed to fetch projects' });
      }
      break;

    case 'POST':
      try {
        const validatedData = createProjectSchema.parse(req.body);

        const newProject = await prisma.project.create({
          data: {
            name: validatedData.name,
            frontendUrl: validatedData.frontendUrl || null, // Store null if empty string
            // status defaults to 'design'
            // Associate with user later: user: { connect: { id: userId } }
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