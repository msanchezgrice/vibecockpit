import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@/generated/prisma';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema to validate query parameters
const querySchema = z.object({
  // projectId: z.string().uuid({ message: "Invalid Project ID format" }),
  projectId: z.string().min(1, { message: "Project ID cannot be empty" }), // Relaxed validation
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Validate query parameters
      const validationResult = querySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: validationResult.error.errors });
      }
      const { projectId } = validationResult.data;

      // Optional: Check if user owns/has access to this project ID

      const checklistItems = await prisma.checklistItem.findMany({
        where: {
          projectId: projectId,
        },
        orderBy: {
          order: 'asc', // Order by the 'order' field
        },
      });

      const completedCount = checklistItems.filter(item => item.is_complete).length;

      // Return data in the format expected by useChecklist hook
      const responseData = {
        tasks: checklistItems,
        completed_tasks: completedCount,
        total_tasks: checklistItems.length,
      };

      res.status(200).json(responseData);

    } catch (error) {
      console.error('Error fetching checklist items:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 