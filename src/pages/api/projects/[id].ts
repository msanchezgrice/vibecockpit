import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient, ProjectStatus, Prisma } from '@/generated/prisma';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();

// Zod schema for updating a project (all fields optional)
const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  frontendUrl: z.string().url().optional().or(z.literal('')),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const { id } = req.query; // Project ID from URL

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  // You might want to add authorization checks later
  // e.g., check if the project belongs to the logged-in user

  switch (req.method) {
    case 'PATCH':
      try {
        const validatedData = updateProjectSchema.parse(req.body);

        // Prevent sending empty update payload
        if (Object.keys(validatedData).length === 0) {
             return res.status(400).json({ message: 'No update data provided' });
        }

        // Handle potential empty string for frontendUrl
        const updatePayload = {
            ...validatedData,
            ...(validatedData.frontendUrl === '' && { frontendUrl: null }),
        };

        const updatedProject = await prisma.project.update({
          where: { id },
          data: updatePayload,
        });

        res.status(200).json(updatedProject);
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ message: 'Invalid input', errors: error.errors });
        } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`Failed to update project ${id}:`, error);
          if (error.code === 'P2002') {
             res.status(409).json({ message: 'A project with this name already exists' });
          } else if (error.code === 'P2025') {
             res.status(404).json({ message: 'Project not found' });
          } else {
             res.status(500).json({ message: 'Failed to update project' });
          }
        } else {
           console.error(`Unexpected error updating project ${id}:`, error);
          res.status(500).json({ message: 'Failed to update project' });
        }
      }
      break;

    case 'DELETE':
      try {
        // Add cascading delete via Prisma schema, so related data is also removed
        await prisma.project.delete({
          where: { id },
        });
        res.status(204).end(); // 204 No Content on successful deletion
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') { // Record to delete not found
             res.status(404).json({ message: 'Project not found' });
          } else {
             console.error(`Failed to delete project ${id} (Prisma Error):`, error);
             res.status(500).json({ message: 'Failed to delete project' });
          }
        } else {
          console.error(`Unexpected error deleting project ${id}:`, error);
          res.status(500).json({ message: 'Failed to delete project' });
        }
      }
      break;

    // Add GET by ID and DELETE later if needed

    default:
      res.setHeader('Allow', ['PATCH', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 