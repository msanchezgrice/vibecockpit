import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient, Prisma } from '@/generated/prisma';
import { z, ZodError } from 'zod';

const prisma = new PrismaClient();

// Schema to validate request body
const updateDraftSchema = z.object({
  draft: z.string(), // Expecting the AI draft content
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const { id: checklistItemId } = req.query; // Checklist item ID from URL

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (typeof checklistItemId !== 'string') {
    return res.status(400).json({ message: 'Invalid checklist item ID' });
  }

  if (req.method === 'POST') {
    try {
      const validatedData = updateDraftSchema.parse(req.body);

      // Optional: Verify user has access to the project this item belongs to

      const updatedItem = await prisma.checklistItem.update({
        where: { id: checklistItemId },
        data: {
          ai_help_hint: validatedData.draft,
        },
      });

      res.status(200).json(updatedItem);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
      } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ message: 'Checklist item not found' });
      } else {
        console.error(`Failed to update AI draft for item ${checklistItemId}:`, error);
        res.status(500).json({ message: 'Failed to save AI draft' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 