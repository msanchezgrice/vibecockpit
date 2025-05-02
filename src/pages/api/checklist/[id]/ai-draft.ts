import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance
import { Prisma } from '@/generated/prisma'; // Keep type import if needed
import { z, ZodError } from 'zod';

// Schema to validate request body
const updateDraftSchema = z.object({
  draft: z.string(), // Expecting the AI draft content
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[API] Received request for ${req.method} ${req.url}`);
  
  // For development, allow requests without authentication
  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (error) {
    console.warn("Error getting session, continuing anyway:", error);
  }

  // In production, enforce authentication
  if (process.env.NODE_ENV === 'production' && !session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { id: checklistItemId } = req.query; // Checklist item ID from URL

  if (typeof checklistItemId !== 'string') {
    return res.status(400).json({ message: 'Invalid checklist item ID' });
  }

  if (req.method === 'POST') {
    try {
      const validatedData = updateDraftSchema.parse(req.body);

      try {
        // Try to update the AI draft in the database
        const updatedItem = await prisma.checklistItem.update({
          where: { id: checklistItemId },
          data: {
            ai_help_hint: validatedData.draft,
          },
        });

        res.status(200).json(updatedItem);
      } catch (dbError) {
        console.error(`Database error updating AI draft for item ${checklistItemId}:`, dbError);
        
        // Check if it's a fallback ID (these start with "fallback" or "mock")
        if (checklistItemId.startsWith('fallback') || checklistItemId.startsWith('mock')) {
          // For fallback items, return a mocked success response
          const mockUpdatedItem = {
            id: checklistItemId,
            ai_help_hint: validatedData.draft,
            title: "Mock Item", // We don't know the title, but that's OK for draft response
            is_complete: false,
            order: 0,
            projectId: "unknown",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          res.status(200).json(mockUpdatedItem);
        } else if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2025') {
          res.status(404).json({ message: 'Checklist item not found' });
        } else {
          throw dbError; // Re-throw for the outer catch block
        }
      }
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
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