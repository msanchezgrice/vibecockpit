import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@/generated/prisma';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();

// Zod schema for creating a changelog entry (specifically a note)
const createNoteSchema = z.object({
  message: z.string().min(1, { message: 'Note message cannot be empty' }),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const { id: projectId } = req.query; // Project ID from URL

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (typeof projectId !== 'string') {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  // Authorization check: Ensure project exists and potentially belongs to user
  // (Skipping user check for now, assuming any logged-in user can add notes)
  const projectExists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true }, // Only select id for efficiency
  });

  if (!projectExists) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (req.method === 'POST') {
    try {
      const validatedData = createNoteSchema.parse(req.body);

      const newEntry = await prisma.changeLogEntry.create({
        data: {
          projectId: projectId,
          provider: 'note', // Hardcoded for this endpoint
          message: validatedData.message,
          // meta: {} // Add any relevant metadata if needed
        },
      });

      // Also update the project's lastActivityAt timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { lastActivityAt: new Date() },
      });

      res.status(201).json(newEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
      } else {
        console.error(`Failed to create changelog entry for project ${projectId}:`, error);
        res.status(500).json({ message: 'Failed to create note' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 