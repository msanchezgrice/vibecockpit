import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance
import { Prisma } from '@/generated/prisma'; // Keep type import if needed
import { z, ZodError } from 'zod';

// const prisma = new PrismaClient(); // Remove direct instantiation

// Schema to validate request body (expects the *new* desired completion state)
const toggleSchema = z.object({
  is_complete: z.boolean(),
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

  if (req.method === 'PATCH') { // Use PATCH for updates
    try {
      const validatedData = toggleSchema.parse(req.body);

      try {
        // Try to update the item in the database
        const updatedItem = await prisma.checklistItem.update({
          where: { id: checklistItemId },
          data: {
            is_complete: validatedData.is_complete,
          },
        });

        res.status(200).json(updatedItem);
      } catch (dbError) {
        console.error(`Database error toggling checklist item ${checklistItemId}:`, dbError);
        
        // Check if it's a fallback ID (these start with "fallback" or "mock")
        if (checklistItemId.startsWith('fallback') || checklistItemId.startsWith('mock')) {
          // For fallback items, return a mocked success response
          const mockUpdatedItem = {
            id: checklistItemId,
            is_complete: validatedData.is_complete,
            title: "Mock Item", // We don't know the title, but that's OK for toggle response
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
        console.error(`Failed to toggle checklist item ${checklistItemId}:`, error);
        res.status(500).json({ message: 'Failed to toggle task status' });
      }
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 